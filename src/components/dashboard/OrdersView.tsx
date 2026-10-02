"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatDateTime } from "@/lib/dates";
import { readApi, runOperation } from "@/lib/operations";
import { useCurrency } from "@/hooks/useCurrency";
import type { Schema } from "@/lib/api-types";
import { formatPhone } from "@/lib/phone";
import {
  BOOKING_HORIZON_DAYS,
  awaitingPayment,
  businessDay,
  shiftDays,
  useAgenda,
  type AgendaAppointment,
} from "@/lib/appointments";
import { isOn, useBusiness, workTitle } from "@/lib/business";
import { AppointmentTask } from "@/components/dashboard/AppointmentTask";
import { ApprovalCards, aboutOrderOrAppointment, useApprovals } from "@/components/dashboard/ApprovalsView";

type OrderStatus = "placed" | "paid" | "delivered" | "cancelled" | "refunded" | "expired";

// The API declares an Order's status as a plain string; these are the ones it sends.

/** One row of `GET /dashboard/orders`. */
export type OrderSummary = Omit<Schema<"OrderSummary">, "status"> & { status: OrderStatus };

/** `GET /dashboard/orders/{code}`. */
export type OrderDetail = Omit<Schema<"OrderDetail">, "status"> & { status: OrderStatus };

const STATUS: Record<OrderStatus, { label: string; variant: "success" | "warning" | "danger" | "neutral" }> = {
  placed: { label: "Esperando pago", variant: "warning" },
  paid: { label: "Pagado", variant: "success" },
  delivered: { label: "Entregado", variant: "neutral" },
  cancelled: { label: "Cancelado", variant: "danger" },
  refunded: { label: "Reembolsado", variant: "danger" },
  expired: { label: "Vencido", variant: "neutral" },
};

/** What the Owner can do next with an Order in each status. */
const ACTIONS: Partial<Record<OrderStatus, Array<{ operation: string; label: string; confirm: string }>>> = {
  placed: [
    { operation: "confirm_payment", label: "Confirmar pago", confirm: "¿Confirmas que este pedido está pagado?" },
    { operation: "cancel_order", label: "Cancelar", confirm: "¿Cancelar este pedido? El stock vuelve al catálogo." },
  ],
  paid: [
    { operation: "deliver_order", label: "Marcar entregado", confirm: "¿Marcar este pedido como entregado?" },
    { operation: "refund_order", label: "Reembolsar", confirm: "¿Reembolsar este pedido?" },
  ],
};

/** The three piles an Order or an Appointment sits in, as the Owner thinks of them. */
const PILES = [
  { id: "placed", has: ["placed"] },
  { id: "paid", has: ["paid"] },
  { id: "done", has: ["delivered", "cancelled", "expired", "refunded"] },
] as const satisfies ReadonlyArray<{ id: string; has: readonly OrderStatus[] }>;

type Pile = (typeof PILES)[number]["id"];

function isPile(value: string | undefined): value is Pile {
  return PILES.some((pile) => pile.id === value);
}

function pileLabel(pile: Pile, selling: boolean, booking: boolean): string {
  if (pile === "placed") return "Por cobrar";
  if (pile === "done") return "Cerrados";
  if (selling && booking) return "Por entregar o atender";
  return booking ? "Por atender" : "Por entregar";
}

/** Which pile an Appointment is in: owing, confirmed and still to come, or over. */
function appointmentPile(appointment: AgendaAppointment): Pile {
  if (awaitingPayment(appointment)) return "placed";
  if (appointment.status === "booked" || appointment.status === "paid") return "paid";
  return "done";
}

/**
 * Pedidos y citas: what is to collect, what is to deliver or attend, and what is closed,
 * with the Approvals about them on top. Products and Appointments go through the same
 * three piles; the screen shows only the side the Business uses. Inicio links here with
 * `?estado=placed` or `?estado=paid`; without one, the first pile that has something.
 */
export function OrdersView({
  initialStatus,
  highlight,
}: { initialStatus?: string; highlight?: string } = {}) {
  const [open, setOpen] = useState<string | null>(null);
  const [chosen, setChosen] = useState<Pile | null>(isPile(initialStatus) ? initialStatus : null);
  const { data: business, isError: businessUnknown } = useBusiness();
  // A Business that cannot be read keeps both sides: a failed read must not hide work.
  const selling = businessUnknown || isOn(business, "selling");
  const booking = businessUnknown || isOn(business, "booking");
  const today = businessDay(new Date());

  const query = useQuery({
    queryKey: ["orders"],
    queryFn: () => readApi<OrderSummary[]>("/dashboard/orders"),
    enabled: selling,
  });
  // The agenda answers at most a month at a time: the month to come, and the one gone.
  const coming = useAgenda(today, shiftDays(today, BOOKING_HORIZON_DAYS), booking);
  const gone = useAgenda(shiftDays(today, -30), shiftDays(today, -1), booking);
  const approvals = useApprovals();

  const orders = selling ? (query.data ?? []) : [];
  const appointments = booking ? [...(gone.data ?? []), ...(coming.data ?? [])] : [];
  const asked = (approvals.data ?? []).filter(aboutOrderOrAppointment);

  const ordersIn = (pile: Pile) =>
    orders.filter((order) =>
      (PILES.find((item) => item.id === pile)?.has as readonly OrderStatus[]).includes(order.status),
    );
  const appointmentsIn = (pile: Pile) => {
    const kept = appointments.filter((appointment) => appointmentPile(appointment) === pile);
    // What is ahead reads soonest first; what is closed, latest first.
    const order = pile === "done" ? -1 : 1;
    return kept.sort((a, b) => order * a.starts_at.localeCompare(b.starts_at));
  };
  const count = (pile: Pile) => ordersIn(pile).length + appointmentsIn(pile).length;
  const pile: Pile = chosen ?? (count("placed") > 0 ? "placed" : count("paid") > 0 ? "paid" : "done");
  const shownOrders = ordersIn(pile);
  const shownAppointments = appointmentsIn(pile);
  const both = selling && booking;

  const loading = (selling && query.isLoading) || (booking && (coming.isLoading || gone.isLoading));
  const failed = (selling && query.error) || (booking && (coming.error || gone.error));
  const title = workTitle(selling, booking);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1>{title}</h1>
        <p className="text-sm text-text-secondary">
          {both
            ? "Lo que te pidieron y lo que agendaron, hasta que se cobra y se entrega o se atiende."
            : booking
              ? "Las citas que esperan pago y las confirmadas que vienen. Aquí las mueves, las cancelas o marcas quién no vino."
              : "Los pedidos que tus clientes hicieron por WhatsApp, hasta que se cobran y se entregan."}
        </p>
      </div>

      {asked.length > 0 && (
        <section aria-label="Esperan tu sí" className="max-w-3xl">
          <h2 className="mb-3 font-display text-lg font-extrabold [font-stretch:85%]">
            {asked.length === 1 ? "1 espera tu sí" : `${asked.length} esperan tu sí`}
          </h2>
          <ApprovalCards approvals={asked} showLinks={false} />
        </section>
      )}

      {loading ? (
        <div className="flex flex-col gap-2" aria-busy="true">
          {[0, 1, 2].map((row) => (
            <div key={row} className="h-14 animate-pulse bg-paper-rule/40" />
          ))}
        </div>
      ) : failed ? (
        <div className="flex flex-col items-start gap-3">
          <p className="font-hand text-lg font-bold text-danger">
            {failed instanceof Error ? failed.message : `No pudimos cargar ${title.toLowerCase()}.`}
          </p>
          <Button
            variant="secondary"
            onClick={() => {
              if (selling) void query.refetch();
              if (booking) {
                void coming.refetch();
                void gone.refetch();
              }
            }}
          >
            Reintentar
          </Button>
        </div>
      ) : (
        <section>
          <div role="tablist" aria-label="Estado" className="flex max-w-xl border-2 border-ink">
            {PILES.map((item) => {
              const active = item.id === pile;
              const many = count(item.id);
              return (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => {
                    setChosen(item.id);
                    setOpen(null);
                  }}
                  className={`flex min-h-11 flex-1 items-center justify-center gap-1.5 px-2 text-sm font-bold transition-colors ${
                    active ? "bg-ink text-paper" : "text-ink hover:bg-ink/[0.07]"
                  }`}
                >
                  {pileLabel(item.id, selling, booking)}
                  {item.id !== "done" && many > 0 && (
                    <span className="font-display text-xs font-black tabular-nums">{many}</span>
                  )}
                </button>
              );
            })}
          </div>

          {shownOrders.length === 0 && shownAppointments.length === 0 ? (
            <p className="py-10 text-[15px] text-ink-muted">{emptySays(pile, selling, booking)}</p>
          ) : (
            <div className="mt-4 flex max-w-3xl flex-col gap-6">
              {shownOrders.length > 0 && (
                <div>
                  {both && <h2 className="mb-1 text-lg">Productos</h2>}
                  <ul className="border-t-2 border-ink">
                    {shownOrders.map((order) => (
                      <OrderRow
                        key={order.code}
                        order={order}
                        open={open === order.code}
                        onToggle={() => setOpen(open === order.code ? null : order.code)}
                      />
                    ))}
                  </ul>
                </div>
              )}
              {shownAppointments.length > 0 && (
                <div>
                  {both && <h2 className="mb-1 text-lg">Citas</h2>}
                  <div className="border-t-2 border-ink">
                    {shownAppointments.map((appointment) => (
                      <AppointmentTask
                        key={appointment.appointment_code}
                        appointment={appointment}
                        highlighted={appointment.appointment_code === highlight}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

/** What an empty pile says. */
function emptySays(pile: Pile, selling: boolean, booking: boolean): string {
  const things = selling && booking ? "pedidos ni citas" : booking ? "citas" : "pedidos";
  if (pile === "placed") return `No hay ${things} por cobrar.`;
  if (pile === "paid") {
    return selling && booking
      ? "No hay nada por entregar ni por atender."
      : booking
        ? "No hay citas confirmadas por venir."
        : "No hay pedidos por entregar.";
  }
  return `No hay ${things} cerrados en el último mes.`;
}

/** "vence en 2 h", "vence en 25 min", or "venció", for an Order still waiting for payment. */
function expiresIn(moment: string, now: Date = new Date()): string {
  const minutes = Math.round((new Date(moment).getTime() - now.getTime()) / 60000);
  if (minutes <= 0) return "venció";
  if (minutes < 60) return `vence en ${minutes} min`;
  const hours = Math.round(minutes / 60);
  return hours < 48 ? `vence en ${hours} h` : `vence en ${Math.round(hours / 24)} días`;
}

function OrderRow({
  order,
  open,
  onToggle,
}: {
  order: OrderSummary;
  open: boolean;
  onToggle: () => void;
}) {
  const { format } = useCurrency();
  return (
    <li className="border-b border-paper-rule">
      <div className="flex items-center gap-3 py-3">
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-baseline gap-x-2 text-[15px]">
            <span className="font-bold tabular-nums">{order.code}</span>
            <span className="text-ink-muted">·</span>
            <span className="truncate">{formatPhone(order.whatsapp_number)}</span>
          </p>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-ink-muted">
            <Badge variant={STATUS[order.status].variant}>{STATUS[order.status].label}</Badge>
            <span>
              {order.status === "placed"
                ? expiresIn(order.expires_at)
                : formatDateTime(order.placed_at)}
            </span>
          </p>
        </div>
        <span className="font-hand text-xl font-bold text-steps tabular-nums">
          {format(Number(order.total))}
        </span>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          className="min-h-11 min-w-16 border-2 border-ink px-3 text-sm font-bold transition-colors hover:bg-ink hover:text-paper"
        >
          {open ? "Ocultar" : "Ver"}
        </button>
      </div>
      {open && (
        <div className="pb-4">
          <OrderDetailPanel code={order.code} />
        </div>
      )}
    </li>
  );
}

function OrderDetailPanel({ code }: { code: string }) {
  const queryClient = useQueryClient();
  const { format } = useCurrency();
  const detail = useQuery({
    queryKey: ["order", code],
    queryFn: () => readApi<OrderDetail>(`/dashboard/orders/${code}`),
  });
  const action = useMutation({
    mutationFn: async (operation: string) => {
      const answer = await runOperation(operation, { order_code: code });
      if (answer.status === "rejected") throw new Error(answer.message);
      return answer;
    },
    onSuccess: async (answer) => {
      await queryClient.invalidateQueries({ queryKey: ["orders"] });
      await queryClient.invalidateQueries({ queryKey: ["order", code] });
      if (answer.status === "approval_created") {
        toast.info("Quedó pendiente de aprobación. Revísala en Aprobaciones.");
      } else {
        toast.success("Listo.");
      }
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "No se pudo completar la acción.");
    },
  });

  if (detail.isLoading) return <div className="h-16 animate-pulse bg-bg-elevated" />;
  if (!detail.data) return <p className="text-sm text-danger">No se pudo cargar el pedido.</p>;
  const order = detail.data;

  return (
    <div className="space-y-4 bg-bg-elevated p-4">
      <ul className="text-sm space-y-1">
        {order.lines.map((line) => (
          <li key={line.product_code} className="flex justify-between gap-4">
            <span>
              {line.quantity} × {line.name}
            </span>
            <span className="text-text-secondary">{format(Number(line.unit_price) * line.quantity)}</span>
          </li>
        ))}
      </ul>

      {order.payment_proofs.length > 0 && (
        <div className="space-y-2">
          <p className="font-display text-xs font-extrabold uppercase tracking-[0.12em]">Comprobantes de pago</p>
          {order.payment_proofs.map((proof) => (
            <div key={proof.attached_at} className="flex items-start gap-3 text-sm">
              {proof.photo_url && (
                // eslint-disable-next-line @next/next/no-img-element -- a signed Storage link that expires
                <img src={proof.photo_url} alt="" className="h-24 object-cover" />
              )}
              <div>
                <p>
                  Monto leído: {format(Number(proof.read_amount))}{" "}
                  {proof.matches_order ? (
                    <Badge variant="success">Coincide</Badge>
                  ) : (
                    <Badge variant="danger">No coincide</Badge>
                  )}
                  {!proof.current && <span className="ml-2 text-text-muted">(reemplazado)</span>}
                </p>
                {proof.summary && <p className="text-text-secondary">{proof.summary}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {(ACTIONS[order.status] ?? []).map((option) => (
          <Button
            key={option.operation}
            variant={option.operation === "cancel_order" || option.operation === "refund_order" ? "secondary" : "primary"}
            disabled={action.isPending}
            onClick={() => {
              if (confirm(option.confirm)) action.mutate(option.operation);
            }}
          >
            {option.label}
          </Button>
        ))}
      </div>
    </div>
  );
}

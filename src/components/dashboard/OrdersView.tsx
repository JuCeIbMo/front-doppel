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

/** The three piles an Order sits in, as the Owner thinks of them. */
const PILES = [
  { id: "placed", label: "Por cobrar", has: ["placed"] },
  { id: "paid", label: "Por entregar", has: ["paid"] },
  { id: "done", label: "Terminados", has: ["delivered", "cancelled", "expired", "refunded"] },
] as const satisfies ReadonlyArray<{ id: string; label: string; has: readonly OrderStatus[] }>;

type Pile = (typeof PILES)[number]["id"];

function isPile(value: string | undefined): value is Pile {
  return PILES.some((pile) => pile.id === value);
}

/**
 * Pedidos: what is to collect, what is to deliver, and what is done. Inicio links here
 * with `?estado=placed` or `?estado=paid`; without one, the first pile that has something.
 */
export function OrdersView({ initialStatus }: { initialStatus?: string } = {}) {
  const [open, setOpen] = useState<string | null>(null);
  const [chosen, setChosen] = useState<Pile | null>(isPile(initialStatus) ? initialStatus : null);
  const query = useQuery({
    queryKey: ["orders"],
    queryFn: () => readApi<OrderSummary[]>("/dashboard/orders"),
  });

  const orders = query.data ?? [];
  const inPile = (pile: Pile) =>
    orders.filter((order) =>
      (PILES.find((item) => item.id === pile)?.has as readonly OrderStatus[]).includes(order.status),
    );
  const pile: Pile =
    chosen ?? (inPile("placed").length > 0 ? "placed" : inPile("paid").length > 0 ? "paid" : "done");
  const shown = inPile(pile);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1>Pedidos</h1>
        <p className="text-sm text-text-secondary">
          Los pedidos que tus clientes hicieron por WhatsApp, los más nuevos primero.
        </p>
      </div>

      {query.isLoading ? (
        <div className="flex flex-col gap-2" aria-busy="true">
          {[0, 1, 2].map((row) => (
            <div key={row} className="h-14 animate-pulse bg-paper-rule/40" />
          ))}
        </div>
      ) : query.error ? (
        <div className="flex flex-col items-start gap-3">
          <p className="font-hand text-lg font-bold text-danger">
            {query.error instanceof Error ? query.error.message : "No pudimos cargar tus pedidos."}
          </p>
          <Button variant="secondary" onClick={() => void query.refetch()}>
            Reintentar
          </Button>
        </div>
      ) : (
        <section>
          <div role="tablist" aria-label="Estado" className="flex max-w-xl border-2 border-ink">
            {PILES.map((item) => {
              const active = item.id === pile;
              const count = inPile(item.id).length;
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
                  {item.label}
                  {item.id !== "done" && count > 0 && (
                    <span className="font-display text-xs font-black tabular-nums">{count}</span>
                  )}
                </button>
              );
            })}
          </div>

          {shown.length === 0 ? (
            <p className="py-10 text-[15px] text-ink-muted">
              {orders.length === 0
                ? "Todavía no hay pedidos. Cuando un cliente pida por WhatsApp, aparece aquí."
                : pile === "placed"
                  ? "No hay pedidos por cobrar."
                  : pile === "paid"
                    ? "No hay pedidos por entregar."
                    : "Todavía no terminaste ningún pedido."}
            </p>
          ) : (
            <ul className="mt-4 border-t-2 border-ink">
              {shown.map((order) => (
                <OrderRow
                  key={order.code}
                  order={order}
                  open={open === order.code}
                  onToggle={() => setOpen(open === order.code ? null : order.code)}
                />
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
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

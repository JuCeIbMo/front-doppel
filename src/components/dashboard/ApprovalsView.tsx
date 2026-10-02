"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { formatDateTime } from "@/lib/dates";
import { operationLabel } from "@/lib/operation-labels";
import { answerApproval, readApi } from "@/lib/operations";
import type { Schema } from "@/lib/api-types";

/** One row of `GET /dashboard/approvals`: a change waiting for the Owner's yes or no. */
export type PendingApproval = Omit<Schema<"ApprovalSummary">, "requested_by"> & {
  // The API declares it as a bare object; it names who asked.
  requested_by: { kind?: string };
};

const REQUESTER: Record<string, string> = {
  owner: "Tú",
  admin_agent: "Tu asistente",
  public_agent: "El bot, hablando con un cliente",
  system: "Doppel",
  support: "Soporte",
};

const text = (value: unknown) => (typeof value === "string" ? value : "");

/** What an Approval asks for, as a sentence the Owner says yes or no to. */
const ASKS: Record<string, (payload: Record<string, unknown>) => string> = {
  confirm_payment: (p) => `Confirmar pago del pedido ${text(p.order_code)}`,
  refund_order: (p) => `Reembolsar el pedido ${text(p.order_code)}`,
  void_sale: (p) => `Anular la venta ${text(p.sale_code)}`,
  mark_no_show: (p) => `Marcar que no vino a la cita ${text(p.appointment_code)}`,
  confirm_appointment_payment: (p) => `Confirmar pago de la cita ${text(p.appointment_code)}`,
  refund_appointment: (p) => `Reembolsar la cita ${text(p.appointment_code)}`,
};

export function approvalTitle(approval: Pick<PendingApproval, "operation" | "payload">): string {
  return ASKS[approval.operation]?.(approval.payload).trim() ?? operationLabel(approval.operation);
}

/** Where the thing an Approval is about can be seen. */
function approvalLink(payload: Record<string, unknown>): { href: string; label: string } | null {
  if (text(payload.sale_code)) return { href: `/dashboard/sales/${text(payload.sale_code)}`, label: "Ver la venta" };
  if (text(payload.order_code)) return { href: "/dashboard/orders", label: "Ver en Pedidos" };
  if (text(payload.appointment_code)) return { href: "/dashboard/orders", label: "Ver en Citas" };
  return null;
}

/** "vence en 23 h", "vence en 40 min" or "venció". */
function expiresIn(moment: string, now: Date = new Date()): string {
  const minutes = Math.round((new Date(moment).getTime() - now.getTime()) / 60000);
  if (minutes <= 0) return "venció";
  if (minutes < 60) return `vence en ${minutes} min`;
  const hours = Math.round(minutes / 60);
  return hours < 48 ? `vence en ${hours} h` : `vence el ${formatDateTime(moment)}`;
}

export const APPROVALS_KEY = ["approvals"];

export function useApprovals() {
  return useQuery({
    queryKey: APPROVALS_KEY,
    queryFn: () => readApi<PendingApproval[]>("/dashboard/approvals"),
  });
}

/** Whether an Approval is about an Order or an Appointment, the things Pedidos y citas works on. */
export function aboutOrderOrAppointment(approval: Pick<PendingApproval, "payload">): boolean {
  return Boolean(text(approval.payload.order_code) || text(approval.payload.appointment_code));
}

/** Each Approval as a card the Owner says yes or no to. */
export function ApprovalCards({ approvals, showLinks = true }: { approvals: PendingApproval[]; showLinks?: boolean }) {
  const queryClient = useQueryClient();
  const answer = useMutation({
    mutationFn: async ({ id, choice }: { id: string; choice: "approve" | "decline" }) => {
      const result = await answerApproval(id, choice);
      if (result.status === "rejected") throw new Error(result.message);
      return choice;
    },
    onSuccess: async (choice) => {
      // An answered Approval can change anything: orders, sales, the agenda, the counts.
      await queryClient.invalidateQueries();
      toast.success(choice === "approve" ? "Aprobado." : "Rechazado.");
    },
    onError: async (error) => {
      await queryClient.invalidateQueries({ queryKey: APPROVALS_KEY });
      toast.error(error instanceof Error ? error.message : "No se pudo responder.");
    },
  });

  return (
    <ul className="flex flex-col gap-4">
      {approvals.map((approval) => {
        const link = showLinks ? approvalLink(approval.payload) : null;
        const title = approvalTitle(approval);
        return (
          <li key={approval.id} className="border-2 border-ink bg-paper">
            <div className="border-b border-paper-rule px-4 pb-3 pt-4">
              <p className="font-display text-xl font-extrabold leading-tight [font-stretch:85%]">
                {title}
              </p>
              {approval.reason && <p className="mt-2 text-[15px]">&ldquo;{approval.reason}&rdquo;</p>}
              <p className="mt-2 text-sm text-ink-muted">
                Pidió: {REQUESTER[approval.requested_by.kind ?? ""] ?? "Alguien"} ·{" "}
                <span className="font-hand text-base font-bold text-waiting">
                  {expiresIn(approval.expires_at)}
                </span>
              </p>
              {link && (
                <Link
                  href={link.href}
                  className="mt-2 inline-flex min-h-9 items-center text-sm font-bold underline underline-offset-4"
                >
                  {link.label}
                </Link>
              )}
            </div>
            <div className="flex">
              <button
                type="button"
                disabled={answer.isPending}
                onClick={() => answer.mutate({ id: approval.id, choice: "decline" })}
                className="min-h-12 flex-1 border-r-2 border-ink text-[15px] font-bold transition-colors hover:bg-ink/[0.07] disabled:opacity-50"
              >
                Rechazar
              </button>
              <button
                type="button"
                disabled={answer.isPending}
                onClick={() => {
                  if (confirm(`¿Aprobar? ${title}.`)) {
                    answer.mutate({ id: approval.id, choice: "approve" });
                  }
                }}
                className="min-h-12 flex-1 bg-ink text-[15px] font-bold text-paper transition-colors hover:bg-steps disabled:opacity-50"
              >
                Aprobar
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function ApprovalsView() {
  const query = useApprovals();
  const pending = query.data ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1>Aprobaciones</h1>
        <p className="text-sm text-text-secondary">
          Cambios delicados que esperan tu sí o tu no antes de hacerse.
        </p>
      </div>

      {query.isLoading ? (
        <div className="h-40 animate-pulse bg-paper-rule/40" aria-busy="true" />
      ) : query.error ? (
        <div className="flex flex-col items-start gap-3">
          <p className="font-hand text-lg font-bold text-danger">
            {query.error instanceof Error ? query.error.message : "No pudimos cargar tus aprobaciones."}
          </p>
          <Button variant="secondary" onClick={() => void query.refetch()}>
            Reintentar
          </Button>
        </div>
      ) : pending.length === 0 ? (
        <div className="chakana bg-settled px-5 pb-5 pt-7 text-paper">
          <p className="font-display text-2xl font-black [font-stretch:78%]">No tienes nada pendiente.</p>
          <p className="mt-1 text-[15px]">Cuando el bot necesite tu sí para algo delicado, aparece aquí.</p>
        </div>
      ) : (
        <section aria-label="Pendientes" className="max-w-3xl">
          <p className="mb-3 font-display text-lg font-extrabold [font-stretch:85%]">
            {pending.length === 1 ? "1 espera tu respuesta" : `${pending.length} esperan tu respuesta`}
          </p>
          <ApprovalCards approvals={pending} />
        </section>
      )}
    </div>
  );
}

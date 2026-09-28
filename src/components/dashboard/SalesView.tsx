"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { BUSINESS_TIME_ZONE, clockTime } from "@/lib/appointments";
import { readApi } from "@/lib/operations";
import { useCurrency } from "@/hooks/useCurrency";
import type { Schema } from "@/lib/api-types";

/** One row of `GET /dashboard/sales`. */
export type SaleSummary = Schema<"SaleSummary">;

export const PAYMENT: Record<NonNullable<SaleSummary["payment_method"]>, string> = {
  cash: "Efectivo",
  transfer: "Transferencia",
  card: "Tarjeta",
};

const dayOf = (moment: string) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: BUSINESS_TIME_ZONE }).format(new Date(moment));

function writtenDay(moment: string) {
  const text = new Intl.DateTimeFormat("es-BO", {
    timeZone: BUSINESS_TIME_ZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(moment));
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Ventas: the Business's latest sales, a page per day with that day's total on top. */
export function SalesView() {
  const { format } = useCurrency();
  const query = useQuery({
    queryKey: ["sales"],
    queryFn: () => readApi<SaleSummary[]>("/dashboard/sales"),
  });

  const sales = query.data ?? [];
  const days = new Map<string, SaleSummary[]>();
  for (const sale of sales) {
    const key = dayOf(sale.created_at);
    days.set(key, [...(days.get(key) ?? []), sale]);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1>Ventas</h1>
        <p className="text-sm text-text-secondary">
          Tus últimas 100 ventas, incluidas las que salen de pedidos entregados y citas atendidas.
        </p>
      </div>

      {query.isLoading ? (
        <div className="flex flex-col gap-2" aria-busy="true">
          {[0, 1, 2].map((row) => (
            <div key={row} className="h-12 animate-pulse bg-paper-rule/40" />
          ))}
        </div>
      ) : query.error ? (
        <div className="flex flex-col items-start gap-3">
          <p className="font-hand text-lg font-bold text-danger">
            {query.error instanceof Error ? query.error.message : "No pudimos cargar tus ventas."}
          </p>
          <Button variant="secondary" onClick={() => void query.refetch()}>
            Reintentar
          </Button>
        </div>
      ) : sales.length === 0 ? (
        <p className="py-10 text-[15px] text-ink-muted">
          Todavía no hay ventas. Aparecen aquí cuando entregas un pedido o atiendes una cita.
        </p>
      ) : (
        <div className="flex max-w-3xl flex-col gap-8">
          {Array.from(days.entries()).map(([day, group]) => {
            const kept = group.filter((sale) => sale.status === "registered");
            const total = kept.reduce((sum, sale) => sum + Number(sale.total), 0);
            return (
              <section key={day} aria-label={writtenDay(group[0].created_at)}>
                <div className="flex items-end justify-between gap-3 border-b-2 border-ink pb-1.5">
                  <h2 className="font-hand text-xl font-bold text-steps [font-stretch:100%]">
                    {writtenDay(group[0].created_at)}
                  </h2>
                  <p className="text-right text-sm text-ink-muted">
                    {kept.length} {kept.length === 1 ? "venta" : "ventas"} ·{" "}
                    <span className="bg-money px-1.5 font-hand text-lg font-bold text-ink">
                      {format(total)}
                    </span>
                  </p>
                </div>
                <ul>
                  {group.map((sale) => {
                    const voided = sale.status !== "registered";
                    return (
                      <li key={sale.code} className="border-b border-paper-rule">
                        <Link
                          href={`/dashboard/sales/${sale.code}`}
                          className={`flex min-h-12 items-center gap-3 py-2 transition-colors hover:bg-ink/[0.04] ${voided ? "text-ink-muted" : ""}`}
                        >
                          <span className="w-12 text-sm tabular-nums text-ink-muted">
                            {clockTime(sale.created_at)}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block font-semibold tabular-nums">{sale.code}</span>
                            <span className="block text-sm text-ink-muted">
                              {sale.payment_method ? PAYMENT[sale.payment_method] : "Sin método de pago"}
                            </span>
                          </span>
                          {voided && <Badge variant="neutral">Anulada</Badge>}
                          <span
                            className={`font-hand text-lg font-bold tabular-nums ${voided ? "line-through" : "text-steps"}`}
                          >
                            {format(Number(sale.total))}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

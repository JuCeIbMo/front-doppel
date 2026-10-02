"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { BUSINESS_TIME_ZONE, businessDay, shiftDays } from "@/lib/appointments";
import { isOn, useBusiness } from "@/lib/business";
import { readApi } from "@/lib/operations";
import { useCurrency } from "@/hooks/useCurrency";
import type { Schema } from "@/lib/api-types";

/** One row of `GET /dashboard/sales`. */
export type SaleSummary = Schema<"SaleSummary">;

type Overview = Schema<"Overview">;

export const PAYMENT: Record<NonNullable<SaleSummary["payment_method"]>, string> = {
  cash: "Efectivo",
  transfer: "Transferencia",
  card: "Tarjeta",
};

const dayOf = (moment: string) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: BUSINESS_TIME_ZONE }).format(new Date(moment));

/** "14:20" in the Business's clock, whatever offset the moment came with. */
const timeOf = (moment: string) =>
  new Intl.DateTimeFormat("es-BO", {
    timeZone: BUSINESS_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(moment));

function writtenDay(moment: string) {
  const text = new Intl.DateTimeFormat("es-BO", {
    timeZone: BUSINESS_TIME_ZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(moment));
  return text.charAt(0).toUpperCase() + text.slice(1);
}

type Range = "today" | "week" | "month";

const RANGES: { id: Range; label: string }[] = [
  { id: "today", label: "Hoy" },
  { id: "week", label: "Esta semana" },
  { id: "month", label: "Últimos 30 días" },
];

/** The first day a range counts, as YYYY-MM-DD: today, this week's Monday, or 30 days back. */
function firstDay(range: Range, today: string): string {
  if (range === "today") return today;
  if (range === "month") return shiftDays(today, -29);
  const weekday = new Date(`${today}T00:00:00Z`).getUTCDay();
  return shiftDays(today, -((weekday + 6) % 7));
}

/**
 * Caja: the money that came in. Above, how much in the range chosen; below, each sale with
 * whose it was and how it was paid, a page per day.
 */
export function SalesView() {
  const { format } = useCurrency();
  const [range, setRange] = useState<Range>("today");
  const { data: business } = useBusiness();
  const query = useQuery({
    queryKey: ["sales"],
    queryFn: () => readApi<SaleSummary[]>("/dashboard/sales"),
  });
  // The day by day totals Inicio reads count every sale, past the list's last 100.
  const overview = useQuery({
    queryKey: ["overview"],
    queryFn: () => readApi<Overview>("/dashboard/overview"),
    refetchInterval: 30000,
  });

  const today = businessDay(new Date());
  const from = firstDay(range, today);
  const sales = (query.data ?? []).filter((sale) => dayOf(sale.created_at) >= from);
  const kept = sales.filter((sale) => sale.status === "registered");
  const byDay = overview.data?.sales_by_day.filter((day) => day.day >= from);
  const total = byDay
    ? byDay.reduce((sum, day) => sum + Number(day.total), 0)
    : kept.reduce((sum, sale) => sum + Number(sale.total), 0);
  const count = byDay ? byDay.reduce((sum, day) => sum + day.sales, 0) : kept.length;
  // The list holds the latest 100: past that, the range's older sales are left out.
  const cut = (query.data?.length ?? 0) >= 100 && count > kept.length;

  const days = new Map<string, SaleSummary[]>();
  for (const sale of sales) {
    const key = dayOf(sale.created_at);
    days.set(key, [...(days.get(key) ?? []), sale]);
  }

  const selling = isOn(business, "selling");
  const booking = isOn(business, "booking");
  const whereFrom =
    selling && !booking
      ? "los pedidos que entregas y lo que vendes en el local"
      : booking && !selling
        ? "las citas atendidas y lo que cobras en el local"
        : "los pedidos entregados, las citas atendidas y lo que vendes en el local";

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1>Caja</h1>
        <p className="mt-1 text-sm text-text-secondary">Lo que ya cobraste: {whereFrom}.</p>
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
      ) : (
        <div className="flex max-w-3xl flex-col gap-5">
          <div>
            <p className="flex flex-wrap items-baseline gap-x-3">
              <span className="font-display text-5xl font-black leading-none tabular-nums [font-variation-settings:'wdth'_78]">
                {format(total)}
              </span>
              <span className="text-sm font-bold text-ink-muted">
                {count === 0 ? "sin ventas" : `en ${count} ${count === 1 ? "venta" : "ventas"}`}
              </span>
            </p>
            <div role="tablist" aria-label="Cuánto mirar" className="mt-3 flex flex-wrap gap-2">
              {RANGES.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  role="tab"
                  aria-selected={range === option.id}
                  onClick={() => setRange(option.id)}
                  className={`min-h-9 px-3.5 text-sm font-bold transition-colors ${
                    range === option.id ? "bg-ink text-paper" : "bg-ink/[0.07] text-ink hover:bg-ink/[0.12]"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {sales.length === 0 ? (
            <p className="py-6 text-[15px] text-ink-muted">
              {range === "today"
                ? "Todavía no hay ventas hoy."
                : "No hubo ventas en estos días."}{" "}
              Aparecen aquí solas cuando cobras.
            </p>
          ) : (
            <div className="flex flex-col gap-7">
              {Array.from(days.entries()).map(([day, group]) => (
                <DayPage
                  key={day}
                  group={group}
                  // One day needs no heading: the total above is that day's.
                  heading={range !== "today"}
                  format={format}
                />
              ))}
            </div>
          )}
          {cut && (
            <p className="text-sm text-ink-muted">
              Aquí se listan tus últimas 100 ventas; el total de arriba las cuenta todas.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function DayPage({
  group,
  heading,
  format,
}: {
  group: SaleSummary[];
  heading: boolean;
  format: (amount: number) => string;
}) {
  const kept = group.filter((sale) => sale.status === "registered");
  const total = kept.reduce((sum, sale) => sum + Number(sale.total), 0);
  const title = writtenDay(group[0].created_at);
  return (
    <section aria-label={title}>
      {heading && (
        <div className="flex items-end justify-between gap-3 border-b-2 border-ink pb-1.5">
          <h2 className="font-hand text-xl font-bold text-steps [font-stretch:100%]">{title}</h2>
          <p className="text-right text-sm text-ink-muted">
            {kept.length} {kept.length === 1 ? "venta" : "ventas"} ·{" "}
            <span className="bg-money px-1.5 font-hand text-lg font-bold text-ink">{format(total)}</span>
          </p>
        </div>
      )}
      <ul className={heading ? "" : "border-t-2 border-ink"}>
        {group.map((sale) => (
          <SaleRow key={sale.code} sale={sale} format={format} />
        ))}
      </ul>
    </section>
  );
}

/** A sale as the Owner tells it: whose it was, when and how it was paid, and how much. */
function SaleRow({ sale, format }: { sale: SaleSummary; format: (amount: number) => string }) {
  const voided = sale.status !== "registered";
  const method = sale.payment_method ? PAYMENT[sale.payment_method] : null;
  return (
    <li className="border-b border-paper-rule">
      <Link
        href={`/dashboard/sales/${sale.code}`}
        className={`flex min-h-14 items-center gap-3 py-2.5 transition-colors hover:bg-ink/[0.04] ${voided ? "text-ink-muted" : ""}`}
      >
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className={`font-bold ${voided ? "line-through" : ""}`}>
              {sale.customer_name ?? "Sin cliente"}
            </span>
            {voided && <Badge variant="neutral">Anulada</Badge>}
          </span>
          <span className="block text-sm text-ink-muted tabular-nums">
            {timeOf(sale.created_at)}
            {method && ` · ${method}`}
          </span>
        </span>
        <span
          className={`font-hand text-lg font-bold tabular-nums ${voided ? "line-through" : "text-steps"}`}
        >
          {format(Number(sale.total))}
        </span>
      </Link>
    </li>
  );
}

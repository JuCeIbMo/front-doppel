"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { Card } from "@/components/ui/Card";
import { apiFetch, apiRequest, ApiError, getBrowserSessionStore } from "@/lib/api-client";
import { clearToken } from "@/lib/auth";
import { normalizeTopProducts, normalizeSeries } from "@/lib/erp-insights";
import type { TopProductItem, SalesByPeriodItem } from "@/lib/erp-types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

export function ErpReportsView() {
  const router = useRouter();

  const today = new Date();
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const [from, setFrom] = useState(firstOfMonth.toISOString().slice(0, 10));
  const [to, setTo] = useState(today.toISOString().slice(0, 10));
  const [showComparison, setShowComparison] = useState(false);
  const [exporting, setExporting] = useState<string | null>(null);

  async function handleExport(path: string, filename: string, key: string) {
    setExporting(key);
    try {
      const response = await apiRequest(path, {
        baseUrl: API_URL,
        session: getBrowserSessionStore(),
        throwOnError: false,
      });
      if (!response.ok) {
        toast.error("Error al exportar");
        return;
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Error al exportar");
    } finally {
      setExporting(null);
    }
  }

  const topProductsQuery = useQuery({
    queryKey: ["erp-top-products", { from, to }],
    queryFn: () =>
      apiFetch<{ items: TopProductItem[] }>(`/erp/reports/top-products?from=${from}&to=${to}`, {
        baseUrl: API_URL,
        session: getBrowserSessionStore(),
      }),
    enabled: from <= to,
  });

  const salesByPeriodQuery = useQuery({
    queryKey: ["erp-sales-by-period", { from, to, showComparison }],
    queryFn: () =>
      apiFetch<{ data: SalesByPeriodItem[] }>(
        `/erp/reports/sales-by-period?from=${from}&to=${to}${showComparison ? "&compare=true" : ""}`,
        { baseUrl: API_URL, session: getBrowserSessionStore() },
      ),
    enabled: from <= to,
  });

  const marginQuery = useQuery({
    queryKey: ["erp-margin", { from, to }],
    queryFn: () =>
      apiFetch<{ gross_margin: number; gross_margin_pct: number }>(
        `/erp/reports/margin?from=${from}&to=${to}`,
        { baseUrl: API_URL, session: getBrowserSessionStore() },
      ),
    enabled: from <= to,
  });

  const clientsReportQuery = useQuery({
    queryKey: ["erp-clients-report", { from, to }],
    queryFn: () =>
      apiFetch<{ new_clients: number; returning_clients: number }>(
        `/erp/reports/clients?from=${from}&to=${to}`,
        { baseUrl: API_URL, session: getBrowserSessionStore() },
      ),
    enabled: from <= to,
  });

  const firstError =
    topProductsQuery.error ??
    salesByPeriodQuery.error ??
    marginQuery.error ??
    clientsReportQuery.error;

  useEffect(() => {
    if (firstError instanceof ApiError && firstError.status === 401) {
      clearToken();
      router.replace("/connect");
    }
  }, [firstError, router]);

  const hasNonAuthError = [topProductsQuery, salesByPeriodQuery, marginQuery, clientsReportQuery]
    .some((q) => q.error && !(q.error instanceof ApiError && q.error.status === 401));

  // Normalize and map to chart-compatible shapes
  const topProductsChartData = useMemo(
    () =>
      normalizeTopProducts(topProductsQuery.data).map((p) => ({
        name: p.label,
        value: p.value,
        total: p.secondary ?? 0,
      })),
    [topProductsQuery.data],
  );

  const salesSeriesChartData = useMemo(
    () =>
      normalizeSeries(salesByPeriodQuery.data).map((s) => ({
        label: s.label,
        value: s.value,
        previous: s.secondary,
      })),
    [salesByPeriodQuery.data],
  );

  const grossMargin = marginQuery.data?.gross_margin ?? null;
  const grossMarginPct = marginQuery.data?.gross_margin_pct ?? null;
  const newClients = clientsReportQuery.data?.new_clients ?? null;
  const returningClients = clientsReportQuery.data?.returning_clients ?? null;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold">Reportes</h1>
      </div>

      {hasNonAuthError && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-red-400 text-sm">
          Error al cargar algunos reportes. Verificá tu conexión e intentá de nuevo.
        </div>
      )}

      {/* Date range + export controls */}
      <Card>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm text-text-secondary">Desde</label>
            <input
              type="date"
              value={from}
              max={to}
              onChange={(e) => setFrom(e.target.value)}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-text-primary outline-none focus:border-accent"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-text-secondary">Hasta</label>
            <input
              type="date"
              value={to}
              min={from}
              onChange={(e) => setTo(e.target.value)}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-text-primary outline-none focus:border-accent"
            />
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-text-secondary">
            <input
              type="checkbox"
              checked={showComparison}
              onChange={(e) => setShowComparison(e.target.checked)}
              className="rounded"
            />
            Comparar período anterior
          </label>
          <div className="ml-auto flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() =>
                handleExport(`/erp/export/sales?from=${from}&to=${to}`, "ventas.csv", "sales")
              }
              disabled={exporting !== null}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-text-primary transition-colors hover:bg-white/10 disabled:opacity-50"
            >
              {exporting === "sales" ? "Exportando..." : "Exportar ventas"}
            </button>
            <button
              type="button"
              onClick={() =>
                handleExport("/erp/export/inventory", "inventario.csv", "inventory")
              }
              disabled={exporting !== null}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-text-primary transition-colors hover:bg-white/10 disabled:opacity-50"
            >
              {exporting === "inventory" ? "Exportando..." : "Exportar inventario"}
            </button>
            <button
              type="button"
              onClick={() =>
                handleExport(
                  `/erp/export/transactions?from=${from}&to=${to}`,
                  "transacciones.csv",
                  "transactions",
                )
              }
              disabled={exporting !== null}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-text-primary transition-colors hover:bg-white/10 disabled:opacity-50"
            >
              {exporting === "transactions" ? "Exportando..." : "Exportar transacciones"}
            </button>
          </div>
        </div>
      </Card>

      {/* Stats row */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Margen bruto"
          value={
            grossMargin !== null
              ? grossMargin.toLocaleString("es-AR", { maximumFractionDigits: 2 })
              : null
          }
          loading={marginQuery.isLoading}
        />
        <StatCard
          label="Margen bruto %"
          value={grossMarginPct !== null ? `${grossMarginPct.toFixed(1)}%` : null}
          loading={marginQuery.isLoading}
        />
        <StatCard
          label="Clientes nuevos"
          value={newClients !== null ? String(newClients) : null}
          loading={clientsReportQuery.isLoading}
        />
        <StatCard
          label="Clientes recurrentes"
          value={returningClients !== null ? String(returningClients) : null}
          loading={clientsReportQuery.isLoading}
        />
      </div>

      {/* Charts */}
      <div className="grid gap-6 xl:grid-cols-2">
        {/* Top productos */}
        <Card>
          <h2 className="mb-4 text-lg font-medium">Top productos</h2>
          {topProductsQuery.isLoading ? (
            <div className="h-60 animate-pulse rounded-xl bg-white/5" />
          ) : topProductsChartData.length === 0 ? (
            <p className="text-sm text-text-secondary">
              No hay datos para el período seleccionado
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart
                data={topProductsChartData}
                margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="name" tick={{ fill: "#9ca3af", fontSize: 12 }} />
                <YAxis tick={{ fill: "#9ca3af", fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    background: "#111",
                    border: "1px solid rgba(255,255,255,0.1)",
                  }}
                  labelStyle={{ color: "#fff" }}
                />
                <Bar
                  dataKey="value"
                  fill="#25d366"
                  radius={[4, 4, 0, 0] as [number, number, number, number]}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Ventas por período */}
        <Card>
          <h2 className="mb-4 text-lg font-medium">Ventas por período</h2>
          {salesByPeriodQuery.isLoading ? (
            <div className="h-60 animate-pulse rounded-xl bg-white/5" />
          ) : salesSeriesChartData.length === 0 ? (
            <p className="text-sm text-text-secondary">
              No hay datos para el período seleccionado
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart
                data={salesSeriesChartData}
                margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="label" tick={{ fill: "#9ca3af", fontSize: 12 }} />
                <YAxis tick={{ fill: "#9ca3af", fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    background: "#111",
                    border: "1px solid rgba(255,255,255,0.1)",
                  }}
                  labelStyle={{ color: "#fff" }}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#25d366"
                  strokeWidth={2}
                  dot={false}
                  name="Período actual"
                />
                {showComparison && (
                  <Line
                    type="monotone"
                    dataKey="previous"
                    stroke="#666"
                    strokeDasharray="5 5"
                    strokeWidth={2}
                    dot={false}
                    name="Período anterior"
                  />
                )}
                <Legend />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  loading,
}: {
  label: string;
  value: string | null;
  loading: boolean;
}) {
  return (
    <Card>
      <p className="text-sm text-text-secondary">{label}</p>
      {loading ? (
        <div className="mt-2 h-8 animate-pulse rounded-xl bg-white/5" />
      ) : (
        <p className="mt-2 text-2xl font-semibold">{value ?? "—"}</p>
      )}
    </Card>
  );
}

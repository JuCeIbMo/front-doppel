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
import { Card, CardHeader } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
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
      apiFetch<{ items: TopProductItem[] }>(
        `/erp/reports/top-products?date_from=${from}&date_to=${to}`,
        { baseUrl: API_URL, session: getBrowserSessionStore() },
      ),
    enabled: from <= to,
  });

  const salesByPeriodQuery = useQuery({
    queryKey: ["erp-sales-by-period", { from, to, showComparison }],
    queryFn: () =>
      apiFetch<{ data: SalesByPeriodItem[] }>(
        `/erp/reports/sales-by-period?date_from=${from}&date_to=${to}${showComparison ? "&compare=true" : ""}`,
        { baseUrl: API_URL, session: getBrowserSessionStore() },
      ),
    enabled: from <= to,
  });

  const marginQuery = useQuery({
    queryKey: ["erp-margin", { from, to }],
    queryFn: () =>
      apiFetch<{ gross_margin: number; gross_margin_pct: number }>(
        `/erp/reports/margin?date_from=${from}&date_to=${to}`,
        { baseUrl: API_URL, session: getBrowserSessionStore() },
      ),
    enabled: from <= to,
  });

  const clientsReportQuery = useQuery({
    queryKey: ["erp-clients-report", { from, to }],
    queryFn: () =>
      apiFetch<{ new_clients: number; returning_clients: number }>(
        `/erp/reports/clients?date_from=${from}&date_to=${to}`,
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
        <h1 className="text-xl font-semibold">Reportes</h1>
        <p className="mt-0.5 text-sm text-text-secondary">Métricas del período.</p>
      </div>

      {hasNonAuthError && (
        <div className="rounded-xl border border-danger/30 bg-danger/10 p-4 text-danger text-sm">
          Error al cargar algunos reportes. Verificá tu conexión e intentá de nuevo.
        </div>
      )}

      {/* Date range + export controls */}
      <Card>
        <div className="flex flex-wrap items-center gap-4">
          <Input
            label="Desde"
            type="date"
            value={from}
            max={to}
            onChange={(e) => setFrom(e.target.value)}
            className="py-1"
          />
          <Input
            label="Hasta"
            type="date"
            value={to}
            min={from}
            onChange={(e) => setTo(e.target.value)}
            className="py-1"
          />
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
            <Button
              variant="secondary"
              size="sm"
              onClick={() =>
                handleExport(`/erp/export/sales?date_from=${from}&date_to=${to}`, "ventas.csv", "sales")
              }
              disabled={exporting !== null}
            >
              {exporting === "sales" ? "Exportando..." : "Exportar ventas"}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() =>
                handleExport("/erp/export/inventory", "inventario.csv", "inventory")
              }
              disabled={exporting !== null}
            >
              {exporting === "inventory" ? "Exportando..." : "Exportar inventario"}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() =>
                handleExport(
                  `/erp/export/transactions?date_from=${from}&date_to=${to}`,
                  "transacciones.csv",
                  "transactions",
                )
              }
              disabled={exporting !== null}
            >
              {exporting === "transactions" ? "Exportando..." : "Exportar transacciones"}
            </Button>
          </div>
        </div>
      </Card>

      {/* Stats row */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {marginQuery.isLoading ? (
          <>
            <div className="h-28 animate-pulse rounded-xl border border-border bg-bg-secondary" />
            <div className="h-28 animate-pulse rounded-xl border border-border bg-bg-secondary" />
          </>
        ) : (
          <>
            <StatCard
              label="Margen bruto"
              value={grossMargin !== null ? grossMargin.toLocaleString("es-AR", { maximumFractionDigits: 2 }) : "—"}
            />
            <StatCard
              label="Margen bruto %"
              value={grossMarginPct !== null ? `${grossMarginPct.toFixed(1)}%` : "—"}
            />
          </>
        )}
        {clientsReportQuery.isLoading ? (
          <>
            <div className="h-28 animate-pulse rounded-xl border border-border bg-bg-secondary" />
            <div className="h-28 animate-pulse rounded-xl border border-border bg-bg-secondary" />
          </>
        ) : (
          <>
            <StatCard
              label="Clientes nuevos"
              value={newClients !== null ? String(newClients) : "—"}
            />
            <StatCard
              label="Clientes recurrentes"
              value={returningClients !== null ? String(returningClients) : "—"}
            />
          </>
        )}
      </div>

      {/* Charts */}
      <div className="grid gap-6 xl:grid-cols-2">
        {/* Top productos */}
        <Card>
          <CardHeader title="Top productos" />
          {topProductsQuery.isLoading ? (
            <div className="h-60 animate-pulse rounded-xl bg-bg-elevated" />
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
          <CardHeader title="Ventas por período" />
          {salesByPeriodQuery.isLoading ? (
            <div className="h-60 animate-pulse rounded-xl bg-bg-elevated" />
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

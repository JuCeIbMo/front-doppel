"use client";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Card, CardHeader } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { Table } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { apiFetch, ApiError, getBrowserSessionStore } from "@/lib/api-client";
import { clearToken } from "@/lib/auth";
import { useCurrency } from "@/hooks/useCurrency";
import type { ErpDashboardResponse, InventoryRow } from "@/lib/erp-types";
import { OnboardingChecklist } from "./OnboardingChecklist";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";
const IGNORE_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

/** Returns a Record with the given productId mapped to a 7-day expiry timestamp. */
function addIgnoreExpiry(
  existing: Record<string, number>,
  productId: string
): Record<string, number> {
  return { ...existing, [productId]: Date.now() + IGNORE_DURATION_MS };
}

async function getDashboard() {
  return apiFetch<ErpDashboardResponse>("/erp/reports/dashboard", {
    baseUrl: API_URL,
    session: getBrowserSessionStore(),
  });
}

async function getLowStock() {
  return apiFetch<InventoryRow[]>("/erp/inventory/low-stock", {
    baseUrl: API_URL,
    session: getBrowserSessionStore(),
  });
}

export function ErpOverviewView() {
  const router = useRouter();
  const { format } = useCurrency();

  const [ignored, setIgnored] = useState<Record<string, number>>(() => {
    if (typeof window === "undefined") return {};
    try {
      const raw = localStorage.getItem("low_stock_ignored");
      if (!raw) return {};
      const parsed = JSON.parse(raw) as Record<string, number>;
      // Clean expired entries
      const now = Date.now();
      const cleaned = Object.fromEntries(
        Object.entries(parsed).filter(([, expiry]) => expiry > now)
      );
      return cleaned;
    } catch {
      return {};
    }
  });

  const [onboardingDismissed, setOnboardingDismissed] = useState(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem("onboarding_dismissed") === "true";
  });

  function ignoreProduct(productId: string) {
    const updated = addIgnoreExpiry(ignored, productId);
    setIgnored(updated);
    localStorage.setItem("low_stock_ignored", JSON.stringify(updated));
  }

  function dismissOnboarding() {
    localStorage.setItem("onboarding_dismissed", "true");
    setOnboardingDismissed(true);
  }

  const dashboardQuery = useQuery({
    queryKey: ["erp-dashboard"],
    queryFn: getDashboard,
  });

  const lowStockQuery = useQuery({
    queryKey: ["erp-low-stock"],
    queryFn: getLowStock,
  });

  const error = dashboardQuery.error ?? lowStockQuery.error;

  const dashboardData = dashboardQuery.data;

  const onboardingSteps = dashboardData
    ? [
        {
          label: "Cargá tu primer producto",
          done: !!dashboardData.top_product,
          href: "/dashboard/products/new",
        },
        {
          label: "Registrá tu primera venta",
          done: dashboardData.sales_count > 0,
          href: "/dashboard/sales",
        },
        {
          label: "Configurá tu caja en Finanzas",
          done: !!(dashboardData.cash_balances && dashboardData.cash_balances.length > 0),
          href: "/dashboard/finance",
        },
      ]
    : [];

  const hasData = dashboardData !== undefined;
  const allStepsDone = onboardingSteps.every((s) => s.done);

  // Auto-dismiss when all steps are done: persist to localStorage so the
  // checklist stays hidden across page loads. No setState here — showOnboarding
  // already derives to false via !allStepsDone, avoiding cascading renders.
  useEffect(() => {
    if (!onboardingDismissed && hasData && allStepsDone) {
      localStorage.setItem("onboarding_dismissed", "true");
    }
  }, [onboardingDismissed, hasData, allStepsDone]);

  // `onboardingDismissed` state already reflects localStorage on mount.
  // !allStepsDone ensures we never render a fully-completed checklist.
  const showOnboarding =
    !onboardingDismissed &&
    hasData &&
    dashboardData!.sales_count === 0 &&
    dashboardData!.new_clients === 0 &&
    !allStepsDone;

  if (error instanceof ApiError && error.status === 401) {
    clearToken();
    router.replace("/connect");
    return null;
  }

  const lowStockItems = lowStockQuery.data ?? [];

  // Entries that are still in `ignored` after mount were cleaned by the initializer;
  // no need to re-check Date.now() during render (avoids impure-call lint error).
  const visibleLowStock = lowStockItems.filter((item) => !ignored[item.product_id]);

  const cards = dashboardData
    ? [
        { label: "Ventas del período", value: format(dashboardData.sales_total) },
        { label: "Transacciones", value: String(dashboardData.sales_count) },
        { label: "Margen bruto", value: format(dashboardData.gross_margin) },
        { label: "Clientes nuevos", value: String(dashboardData.new_clients) },
      ]
    : [];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Resumen operativo</h1>
        <p className="mt-0.5 text-sm text-text-secondary">Vista operativa del negocio.</p>
      </div>

      {showOnboarding && (
        <OnboardingChecklist steps={onboardingSteps} onDismiss={dismissOnboarding} />
      )}

      {/* KPI cards */}
      {dashboardQuery.isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl bg-bg-secondary border border-border" />
          ))}
        </div>
      ) : error ? (
        <Card>
          <p className="text-sm text-danger">
            {error instanceof Error ? error.message : "No se pudo cargar el dashboard."}
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {cards.map((card) => (
            <StatCard key={card.label} label={card.label} value={card.value} />
          ))}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        {/* Low stock table */}
        <Card>
          <CardHeader
            title="Alertas de stock bajo"
            action={
              <Button href="/dashboard/products" variant="secondary" size="sm">
                Ver catálogo
              </Button>
            }
          />
          <Table>
            <Table.Head>
              <tr>
                <Table.Th>Producto</Table.Th>
                <Table.Th>Categoría</Table.Th>
                <Table.Th>Stock</Table.Th>
                <Table.Th>Umbral</Table.Th>
                <Table.Th>{""}</Table.Th>
              </tr>
            </Table.Head>
            {lowStockQuery.isLoading ? (
              <Table.Loading rows={3} cols={5} />
            ) : visibleLowStock.length === 0 ? (
              <Table.Empty>
                {lowStockItems.length === 0
                  ? "Sin alertas de stock."
                  : "Todas las alertas están ignoradas."}
              </Table.Empty>
            ) : (
              <Table.Body>
                {visibleLowStock.slice(0, 6).map((row) => (
                  <Table.Row key={`${row.product_id}-${row.variant_id ?? "base"}`}>
                    <Table.Cell>
                      <span className="font-medium text-text-primary">{row.product_name}</span>
                    </Table.Cell>
                    <Table.Cell className="text-text-secondary">
                      {row.category || "Sin categoría"}
                    </Table.Cell>
                    <Table.Cell>
                      <Badge variant={row.quantity === 0 ? "danger" : "warning"}>
                        {row.quantity} {row.unit}
                      </Badge>
                    </Table.Cell>
                    <Table.Cell className="text-text-secondary">{row.low_stock_threshold}</Table.Cell>
                    <Table.Cell>
                      <button
                        type="button"
                        onClick={() => ignoreProduct(row.product_id)}
                        className="text-xs text-text-secondary hover:text-text-primary transition-colors"
                      >
                        Ignorar 7d
                      </button>
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            )}
          </Table>
        </Card>

        {/* Onboarding status */}
        <Card>
          <CardHeader title="Primeros pasos" />
          {hasData ? (
            <ul className="space-y-3">
              {onboardingSteps.map((step) => (
                <li key={step.href} className="flex items-center gap-3 text-sm">
                  <span
                    className={`w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold ${
                      step.done ? "bg-accent text-black" : "border border-border"
                    }`}
                  >
                    {step.done ? "✓" : ""}
                  </span>
                  <span className={step.done ? "text-text-muted line-through" : "text-text-secondary"}>
                    {step.label}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-5 animate-pulse rounded bg-bg-elevated" />
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

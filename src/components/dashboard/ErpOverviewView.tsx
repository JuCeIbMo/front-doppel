"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { apiFetch, ApiError, getBrowserSessionStore } from "@/lib/api-client";
import { clearToken } from "@/lib/auth";
import { useCurrency } from "@/hooks/useCurrency";
import type { ErpDashboardResponse, InventoryRow } from "@/lib/erp-types";
import { OnboardingChecklist } from "./OnboardingChecklist";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

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
    // eslint-disable-next-line react-hooks/purity
    const expiry = Date.now() + 7 * 24 * 60 * 60 * 1000;
    const updated = { ...ignored, [productId]: expiry };
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

  if (error instanceof ApiError && error.status === 401) {
    clearToken();
    router.replace("/connect");
    return null;
  }

  const lowStockItems = lowStockQuery.data ?? [];

  // Entries that are still in `ignored` after mount were cleaned by the initializer;
  // no need to re-check Date.now() during render (avoids impure-call lint error).
  const visibleLowStock = lowStockItems.filter((item) => !ignored[item.product_id]);

  const cards = dashboardQuery.data
    ? [
        { label: "Ventas del período", value: format(dashboardQuery.data.sales_total) },
        { label: "Transacciones", value: String(dashboardQuery.data.sales_count) },
        { label: "Margen bruto", value: format(dashboardQuery.data.gross_margin) },
        { label: "Clientes nuevos", value: String(dashboardQuery.data.new_clients) },
      ]
    : [];

  const dashboardData = dashboardQuery.data;

  const onboardingSteps = dashboardData
    ? [
        {
          label: "Cargá tu primer producto",
          done: false,
          href: "/dashboard/products/new",
        },
        {
          label: "Registrá tu primera venta",
          done: dashboardData.sales_count > 0,
          href: "/dashboard/sales",
        },
        {
          label: "Configurá tu caja en Finanzas",
          done: false,
          href: "/dashboard/finance",
        },
      ]
    : [];

  // `onboardingDismissed` state already reflects localStorage on mount,
  // so the double-check is not needed here (and avoids impure-call lint errors).
  const showOnboarding =
    !onboardingDismissed &&
    dashboardData !== undefined &&
    dashboardData.sales_count === 0 &&
    dashboardData.new_clients === 0;

  // Auto-dismiss when all steps are done
  if (showOnboarding && onboardingSteps.every((s) => s.done)) {
    dismissOnboarding();
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Resumen operativo</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Primer corte del ERP sobre backend real. Acá vive la operación del dueño.
        </p>
      </div>

      {showOnboarding && (
        <OnboardingChecklist steps={onboardingSteps} onDismiss={dismissOnboarding} />
      )}

      {dashboardQuery.isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card key={index} className="h-32 animate-pulse bg-white/4">
              <span className="sr-only">Cargando</span>
            </Card>
          ))}
        </div>
      ) : error ? (
        <Card>
          <h2 className="text-lg font-medium">No se pudo cargar el dashboard ERP</h2>
          <p className="mt-2 text-sm text-text-secondary">
            {error instanceof Error ? error.message : "Error desconocido."}
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {cards.map((card) => (
            <Card key={card.label}>
              <p className="text-sm text-text-secondary">{card.label}</p>
              <p className="mt-3 text-2xl font-semibold">{card.value}</p>
            </Card>
          ))}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <Card>
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-medium">Alertas de stock bajo</h2>
              <p className="mt-1 text-sm text-text-secondary">
                Esta vista ya consume inventario ERP real.
              </p>
            </div>
            <Button href="/dashboard/products" variant="secondary" className="px-5 py-2 text-sm">
              Ver catálogo
            </Button>
          </div>

          <div className="mt-5 flex flex-col gap-3">
            {lowStockQuery.isLoading ? (
              <div className="space-y-3">
                <div className="h-16 animate-pulse rounded-2xl bg-white/5" />
                <div className="h-16 animate-pulse rounded-2xl bg-white/5" />
              </div>
            ) : lowStockItems.length === 0 ? (
              <p className="text-sm text-text-secondary">
                No hay productos por debajo del umbral de stock.
              </p>
            ) : visibleLowStock.length === 0 ? (
              <p className="text-sm text-text-secondary">
                Todas las alertas están ignoradas temporalmente.
              </p>
            ) : (
              visibleLowStock.slice(0, 6).map((row) => (
                <div
                  key={`${row.product_id}-${row.variant_id ?? "base"}`}
                  className="rounded-2xl border border-white/8 bg-white/4 px-4 py-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{row.product_name}</p>
                      <p className="mt-1 text-sm text-text-secondary">
                        {row.category || "Sin categoría"} · {row.unit}
                      </p>
                    </div>
                    <div className="text-right flex flex-col items-end gap-1">
                      <p className="font-medium">{row.quantity}</p>
                      <p className="text-xs text-text-secondary">
                        Umbral {row.low_stock_threshold}
                      </p>
                      <button
                        type="button"
                        onClick={() => ignoreProduct(row.product_id)}
                        className="text-xs text-text-secondary hover:text-text-primary ml-auto"
                      >
                        Ignorar 7 días
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card>
          <h2 className="text-lg font-medium">Estado de despliegue</h2>
          <p className="mt-2 text-sm text-text-secondary">
            Reportes, actividad y caja siguen bloqueados hasta que el backend cierre contrato.
          </p>

          <ul className="mt-5 space-y-3 text-sm text-text-secondary">
            <li>Productos ERP integrados</li>
            <li>Inventario ERP integrado</li>
            <li>Automatización migrada al nuevo shell</li>
            <li>Caja y reportes pendientes de endpoints productivos</li>
          </ul>
        </Card>
      </div>
    </div>
  );
}

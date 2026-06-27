"use client";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { apiFetch, ApiError, getBrowserSessionStore } from "@/lib/api-client";
import { clearToken } from "@/lib/auth";
import { useCurrency } from "@/hooks/useCurrency";
import type { ErpDashboardResponse, InventoryRow } from "@/lib/erp-types";
import { OnboardingChecklist } from "./OnboardingChecklist";
import {
  MPage,
  MPanel,
  MStat,
  MSectionHead,
  MPill,
  MDelta,
  MThread,
  MSparkline,
  MEyebrow,
} from "@/components/ui/MeridianKit";

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

  useEffect(() => {
    if (!onboardingDismissed && hasData && allStepsDone) {
      localStorage.setItem("onboarding_dismissed", "true");
    }
  }, [onboardingDismissed, hasData, allStepsDone]);

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
  const visibleLowStock = lowStockItems.filter((item) => !ignored[item.product_id]);

  // Build alert queue from real data
  const alertQueue: Array<{
    tone: string;
    title: string;
    sub: string;
    tag: string;
  }> = [];

  visibleLowStock.slice(0, 3).forEach((item) => {
    const isOut = item.quantity === 0;
    alertQueue.push({
      tone: isOut ? "critical" : "medium",
      title: `${item.product_name} · stock ${isOut ? "agotado" : "bajo"}`,
      sub: `Inventario · ${item.quantity} ${item.unit} · umbral ${item.low_stock_threshold}`,
      tag: "Ahora",
    });
  });

  if (alertQueue.length === 0 && !dashboardQuery.isLoading) {
    alertQueue.push({
      tone: "low",
      title: "Sin alertas activas",
      sub: "Todo en orden por ahora",
      tag: "—",
    });
  }

  const isLoadingAny = dashboardQuery.isLoading || lowStockQuery.isLoading;

  return (
    <MPage eyebrow="Consolidado · Todas las entidades" title="Resumen Operativo">
      {showOnboarding && (
        <div style={{ marginBottom: "var(--m-gut, 28px)" }}>
          <OnboardingChecklist steps={onboardingSteps} onDismiss={dismissOnboarding} />
        </div>
      )}

      {/* HERO ROW */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.35fr 1fr 1fr",
          gap: "var(--m-gut, 28px)",
          marginBottom: "var(--m-gut, 28px)",
        }}
      >
        {/* Net position hero */}
        <MPanel
          pad={26}
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            minHeight: 248,
            overflow: "hidden",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <MEyebrow>Ventas del período</MEyebrow>
            <MPill tone={dashboardData && dashboardData.sales_total > 0 ? "low" : "neutral"}>
              {dashboardData && dashboardData.sales_total > 0 ? "Activo" : "Sin datos"}
            </MPill>
          </div>
          <div>
            {isLoadingAny ? (
              <div
                style={{
                  height: 72,
                  borderRadius: "var(--m-r-sm)",
                  background: "var(--m-surface-2)",
                  animation: "pulse 1.5s ease-in-out infinite",
                }}
              />
            ) : (
              <>
                <div
                  style={{
                    fontSize: "clamp(40px, 6vw, 72px)",
                    fontFamily: "var(--m-serif)",
                    fontWeight: 400,
                    lineHeight: 0.85,
                    letterSpacing: "-0.03em",
                    color: "var(--m-ink)",
                  }}
                >
                  {format(dashboardData?.sales_total ?? 0)}
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    marginTop: 16,
                  }}
                >
                  <span style={{ fontSize: 13, color: "var(--m-ink-faint)" }}>
                    {dashboardData?.sales_count ?? 0} transacciones
                  </span>
                </div>
              </>
            )}
          </div>
          {/* Decorative mark */}
          <div
            style={{
              position: "absolute",
              right: -10,
              top: -10,
              opacity: 0.06,
            }}
          >
            <svg width={130} height={130} viewBox="0 0 32 32" fill="none">
              <circle cx="16" cy="16" r="14.2" stroke="var(--m-accent)" strokeWidth="1.2" />
              <circle cx="16" cy="16" r="9" stroke="var(--m-ink-faint)" strokeWidth="0.8" />
              <path d="M16 3 L16 29 M3 16 L29 16" stroke="var(--m-line)" strokeWidth="0.7" />
              <path d="M16 7 L19 16 L16 25 L13 16 Z" fill="var(--m-accent)" opacity="0.9" />
            </svg>
          </div>
        </MPanel>

        {/* Margen bruto */}
        <MPanel pad={24} style={{ minHeight: 248 }}>
          <MStat
            eyebrow="Margen bruto"
            value={
              isLoadingAny
                ? "—"
                : format(dashboardData?.gross_margin ?? 0)
            }
            caption="del período"
            spark={
              <MSparkline
                data={[10, 12, 11, 14, 13, 15, 14, 16, 15, 17, 16, 18]}
                h={66}
              />
            }
          />
        </MPanel>

        {/* Clientes */}
        <MPanel pad={24} style={{ minHeight: 248 }}>
          <MStat
            eyebrow="Clientes nuevos"
            value={isLoadingAny ? "—" : String(dashboardData?.new_clients ?? 0)}
            caption="este período"
            spark={
              <MSparkline
                data={[2, 3, 2, 4, 3, 5, 4, 6, 5, 7, 6, dashboardData?.new_clients ?? 7]}
                h={66}
                dot={false}
              />
            }
          />
        </MPanel>
      </div>

      {/* SECONDARY KPIs */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "var(--m-gut, 28px)",
          marginBottom: "var(--m-gut, 28px)",
        }}
      >
        {[
          {
            eyebrow: "Transacciones",
            value: isLoadingAny ? "—" : String(dashboardData?.sales_count ?? 0),
            caption: "ventas",
          },
          {
            eyebrow: "Producto top",
            value: isLoadingAny ? "—" : (dashboardData?.top_product ? "1 producto" : "—"),
            caption: "más vendido",
          },
          {
            eyebrow: "Alertas de stock",
            value: isLoadingAny ? "—" : String(visibleLowStock.length),
            caption: "productos",
          },
          {
            eyebrow: "Pasos completados",
            value: isLoadingAny
              ? "—"
              : `${onboardingSteps.filter((s) => s.done).length}/${onboardingSteps.length}`,
            caption: "configuración",
          },
        ].map((s, i) => (
          <MPanel key={i} pad={20} style={{ minHeight: 130 }}>
            <MStat eyebrow={s.eyebrow} value={s.value} caption={s.caption} />
          </MPanel>
        ))}
      </div>

      {/* ENTITY LEDGER + ACTION QUEUE */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.7fr 1fr",
          gap: "var(--m-gut, 28px)",
        }}
      >
        {/* Low stock table as entity ledger */}
        <MPanel pad={24}>
          <MSectionHead
            eyebrow={`Alertas de stock · ${visibleLowStock.length} ítems`}
            title="Stock Bajo"
            action={
              <Button href="/dashboard/products" variant="secondary" size="sm">
                Ver catálogo
              </Button>
            }
          />
          {/* Header row */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.6fr 1fr 0.8fr 0.8fr 1fr",
              gap: 12,
              paddingBottom: 10,
              borderBottom: "1px solid var(--m-line)",
            }}
          >
            {["Producto", "Categoría", "Stock", "Umbral", ""].map((h, i) => (
              <MEyebrow key={i}>{h}</MEyebrow>
            ))}
          </div>
          {lowStockQuery.isLoading ? (
            <div style={{ paddingTop: 16 }}>
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    height: 44,
                    marginBottom: 8,
                    borderRadius: "var(--m-r-sm)",
                    background: "var(--m-surface-2)",
                    animation: "pulse 1.5s ease-in-out infinite",
                  }}
                />
              ))}
            </div>
          ) : visibleLowStock.length === 0 ? (
            <div
              style={{
                padding: "32px 0",
                textAlign: "center",
                color: "var(--m-ink-faint)",
                fontFamily: "var(--m-mono)",
                fontSize: 12,
              }}
            >
              {lowStockItems.length === 0
                ? "Sin alertas de stock."
                : "Todas las alertas están ignoradas."}
            </div>
          ) : (
            visibleLowStock.slice(0, 6).map((row) => (
              <div
                key={`${row.product_id}-${row.variant_id ?? "base"}`}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.6fr 1fr 0.8fr 0.8fr 1fr",
                  gap: 12,
                  alignItems: "center",
                  padding: "13px 0",
                  borderBottom: "1px solid var(--m-line-soft)",
                }}
              >
                <div style={{ fontWeight: 600, fontSize: 13.5, color: "var(--m-ink)" }}>
                  {row.product_name}
                </div>
                <span style={{ fontSize: 12.5, color: "var(--m-ink-dim)" }}>
                  {row.category || "Sin categoría"}
                </span>
                <span
                  className="m-mono m-tnum"
                  style={{
                    fontSize: 13,
                    color: row.quantity === 0 ? "var(--m-neg)" : "var(--m-warn)",
                  }}
                >
                  {row.quantity} {row.unit}
                </span>
                <span className="m-mono m-tnum" style={{ fontSize: 12, color: "var(--m-ink-dim)" }}>
                  {row.low_stock_threshold}
                </span>
                <button
                  type="button"
                  onClick={() => ignoreProduct(row.product_id)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--m-ink-faint)",
                    fontSize: 11,
                    fontFamily: "var(--m-mono)",
                    cursor: "pointer",
                    letterSpacing: "0.06em",
                  }}
                >
                  Ignorar 7d
                </button>
              </div>
            ))
          )}
        </MPanel>

        {/* Action queue */}
        <MPanel pad={24} style={{ display: "flex", flexDirection: "column" }}>
          <MSectionHead
            eyebrow={`Requiere atención · ${alertQueue.length}`}
            title="Cola de Acción"
          />
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {alertQueue.map((a, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  gap: 13,
                  padding: "13px 0",
                  borderBottom:
                    i < alertQueue.length - 1
                      ? "1px solid var(--m-line-soft)"
                      : "none",
                  alignItems: "flex-start",
                }}
              >
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: 999,
                    marginTop: 5,
                    flexShrink: 0,
                    background:
                      a.tone === "critical"
                        ? "var(--m-neg)"
                        : a.tone === "medium"
                        ? "var(--m-warn)"
                        : "var(--m-pos)",
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      lineHeight: 1.3,
                      color: "var(--m-ink)",
                    }}
                  >
                    {a.title}
                  </div>
                  <div
                    style={{
                      fontSize: 11.5,
                      color: "var(--m-ink-faint)",
                      marginTop: 3,
                    }}
                  >
                    {a.sub}
                  </div>
                </div>
                <span
                  className="m-mono"
                  style={{ fontSize: 10, color: "var(--m-ink-faint)", flexShrink: 0 }}
                >
                  {a.tag}
                </span>
              </div>
            ))}
          </div>

          {/* Onboarding mini */}
          {hasData && !allStepsDone && (
            <div style={{ marginTop: "auto", paddingTop: 18 }}>
              <MThread />
              <div style={{ paddingTop: 14 }}>
                <MEyebrow style={{ marginBottom: 12 }}>Primeros pasos</MEyebrow>
                {onboardingSteps.map((step) => (
                  <div
                    key={step.href}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "7px 0",
                      fontSize: 12.5,
                    }}
                  >
                    <span
                      style={{
                        width: 16,
                        height: 16,
                        borderRadius: 999,
                        flexShrink: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 10,
                        fontWeight: 700,
                        background: step.done
                          ? "var(--m-pos)"
                          : "transparent",
                        border: step.done
                          ? "none"
                          : "1px solid var(--m-line)",
                        color: step.done ? "var(--m-accent-ink)" : "transparent",
                      }}
                    >
                      {step.done ? "✓" : ""}
                    </span>
                    <span
                      style={{
                        color: step.done
                          ? "var(--m-ink-faint)"
                          : "var(--m-ink-dim)",
                        textDecoration: step.done ? "line-through" : "none",
                      }}
                    >
                      {step.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </MPanel>
      </div>
    </MPage>
  );
}

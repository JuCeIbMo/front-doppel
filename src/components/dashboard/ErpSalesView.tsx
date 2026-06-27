"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pagination } from "@/components/ui/Pagination";
import { apiFetch, ApiError, getBrowserSessionStore } from "@/lib/api-client";
import { clearToken } from "@/lib/auth";
import { useCurrency } from "@/hooks/useCurrency";
import { usePagination } from "@/hooks/usePagination";
import type { SaleResponse } from "@/lib/erp-types";
import {
  MPage,
  MPanel,
  MSectionHead,
  MPill,
  MEyebrow,
} from "@/components/ui/MeridianKit";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

async function getSales(limit: number, offset: number) {
  return apiFetch<SaleResponse[]>(`/erp/sales?limit=${limit}&offset=${offset}`, {
    baseUrl: API_URL,
    session: getBrowserSessionStore(),
  });
}

export function ErpSalesView() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { format } = useCurrency();
  const { page, limit, offset, nextPage, prevPage } = usePagination();
  const query = useQuery({
    queryKey: ["erp-sales", { offset, limit }],
    queryFn: () => getSales(limit, offset),
  });

  const cancelMutation = useMutation({
    mutationFn: async (saleId: string) => {
      return apiFetch<SaleResponse>(`/erp/sales/${saleId}/cancel`, {
        baseUrl: API_URL,
        session: getBrowserSessionStore(),
        method: "POST",
      });
    },
    onSuccess: async (_, saleId) => {
      await queryClient.invalidateQueries({ queryKey: ["erp-sales"] });
      await queryClient.invalidateQueries({ queryKey: ["erp-sale", saleId] });
      toast.success("Venta cancelada.");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "No se pudo cancelar la venta.");
    },
  });

  if (query.error instanceof ApiError && query.error.status === 401) {
    clearToken();
    router.replace("/connect");
    return null;
  }

  const sales = query.data ?? [];
  const hasMore = sales.length === limit;

  return (
    <MPage
      eyebrow="Módulo de ventas · Demanda global"
      title="Ventas & Órdenes"
      right={
        <MPill tone={sales.length > 0 ? "low" : "neutral"}>
          {sales.length} registros
        </MPill>
      }
    >
      {/* ORDER BOOK */}
      <MPanel pad={26}>
        <MSectionHead
          eyebrow={`Libro de órdenes · ${sales.length} de ${hasMore ? "más" : sales.length} mostrados`}
          title="Libro de Ventas"
          action={
            <span className="m-mono" style={{ fontSize: 11, color: "var(--m-ink-faint)" }}>
              {sales.length > 0
                ? format(sales.reduce((sum, s) => sum + s.total, 0)) + " total"
                : "Sin datos"}
            </span>
          }
        />

        {/* header */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "0.8fr 1fr 1.4fr 1fr 0.9fr 0.8fr",
            gap: 14,
            paddingBottom: 11,
            borderBottom: "1px solid var(--m-line)",
          }}
        >
          {["ID", "Fecha", "Actor", "Total", "Estado", "Acciones"].map((h) => (
            <MEyebrow key={h}>{h}</MEyebrow>
          ))}
        </div>

        {query.isLoading ? (
          <div style={{ paddingTop: 16 }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                style={{
                  height: 48,
                  marginBottom: 8,
                  borderRadius: "var(--m-r-sm)",
                  background: "var(--m-surface-2)",
                  animation: "pulse 1.5s ease-in-out infinite",
                }}
              />
            ))}
          </div>
        ) : query.error ? (
          <div style={{ padding: "20px 0", color: "var(--m-neg)", fontSize: 13 }}>
            {query.error instanceof Error ? query.error.message : "No se pudo cargar ventas."}
          </div>
        ) : sales.length === 0 ? (
          <div
            style={{
              padding: "40px 0",
              textAlign: "center",
              color: "var(--m-ink-faint)",
              fontFamily: "var(--m-mono)",
              fontSize: 12,
            }}
          >
            Todavía no hay ventas registradas.
          </div>
        ) : (
          sales.map((sale, i) => (
            <div
              key={sale.id}
              style={{
                display: "grid",
                gridTemplateColumns: "0.8fr 1fr 1.4fr 1fr 0.9fr 0.8fr",
                gap: 14,
                alignItems: "center",
                padding: "15px 0",
                borderBottom: i < sales.length - 1 ? "1px solid var(--m-line-soft)" : "none",
              }}
            >
              <span
                className="m-mono"
                style={{ fontSize: 12, color: "var(--m-accent)" }}
              >
                #{sale.id.slice(0, 8)}
              </span>
              <span
                className="m-mono m-tnum"
                style={{ fontSize: 11.5, color: "var(--m-ink-faint)" }}
              >
                {new Date(sale.created_at).toLocaleDateString("es-AR")}
              </span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--m-ink)" }}>
                  {sale.actor}
                </div>
              </div>
              <div>
                <span
                  className="m-mono m-tnum"
                  style={{ fontSize: 13, fontWeight: 600, color: "var(--m-ink)" }}
                >
                  {format(sale.total)}
                </span>
                {sale.discount > 0 && (
                  <span
                    className="m-mono m-tnum"
                    style={{ marginLeft: 6, fontSize: 11, color: "var(--m-ink-faint)" }}
                  >
                    -{format(sale.discount)}
                  </span>
                )}
              </div>
              <MPill tone={sale.status === "completed" ? "low" : "critical"}>
                {sale.status === "completed" ? "Completada" : "Cancelada"}
              </MPill>
              <div style={{ display: "flex", gap: 14 }}>
                <Link
                  href={`/dashboard/sales/${sale.id}`}
                  style={{
                    fontSize: 12,
                    color: "var(--m-ink-faint)",
                    textDecoration: "none",
                    fontFamily: "var(--m-mono)",
                    letterSpacing: "0.06em",
                  }}
                >
                  Ver
                </Link>
                {sale.status === "completed" && (
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm("¿Cancelar esta venta?")) cancelMutation.mutate(sale.id);
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--m-neg)",
                      fontSize: 12,
                      fontFamily: "var(--m-mono)",
                      cursor: "pointer",
                      letterSpacing: "0.06em",
                      opacity: cancelMutation.isPending ? 0.5 : 1,
                    }}
                    disabled={cancelMutation.isPending}
                  >
                    Cancelar
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </MPanel>

      <div style={{ marginTop: 16 }}>
        <Pagination
          page={page}
          onPrev={prevPage}
          onNext={nextPage}
          hasMore={hasMore}
          isLoading={query.isLoading}
        />
      </div>
    </MPage>
  );
}

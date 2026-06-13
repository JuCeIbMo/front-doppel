"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Pagination } from "@/components/ui/Pagination";
import { apiFetch, ApiError, getBrowserSessionStore } from "@/lib/api-client";
import { clearToken } from "@/lib/auth";
import { useCurrency } from "@/hooks/useCurrency";
import { usePagination } from "@/hooks/usePagination";
import type { SaleResponse } from "@/lib/erp-types";

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
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Ventas</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Historial operativo actual sobre `/erp/sales`.
        </p>
      </div>

      <Card>
        {query.isLoading ? (
          <div className="space-y-3">
            <div className="h-16 animate-pulse rounded-2xl bg-white/5" />
            <div className="h-16 animate-pulse rounded-2xl bg-white/5" />
          </div>
        ) : query.error ? (
          <p className="text-sm text-red-400">
            {query.error instanceof Error ? query.error.message : "No se pudo cargar ventas."}
          </p>
        ) : sales.length === 0 ? (
          <p className="text-sm text-text-secondary">Todavía no hay ventas registradas.</p>
        ) : (
          <div className="space-y-3">
            {sales.map((sale) => (
              <div key={sale.id} className="rounded-2xl border border-white/8 bg-white/4 px-4 py-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                      <p className="font-medium">Venta #{sale.id.slice(0, 8)}</p>
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                          sale.status === "completed"
                            ? "bg-accent/15 text-accent"
                            : "bg-red-500/15 text-red-300"
                        }`}
                      >
                        {sale.status}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-text-secondary">
                      {sale.actor} · {new Date(sale.created_at).toLocaleString()}
                    </p>
                    <p className="mt-2 text-sm text-text-secondary">
                      {sale.items.length} ítems · pago {sale.payment_method}
                    </p>
                  </div>

                    <div className="text-left md:text-right">
                      <p className="text-lg font-semibold">{format(sale.total)}</p>
                      {sale.discount > 0 ? (
                      <p className="mt-1 text-xs text-text-secondary">
                        Descuento {format(sale.discount)}
                      </p>
                        ) : null}
                      <div className="mt-3 flex items-center gap-3 md:justify-end">
                        <Link
                          href={`/dashboard/sales/${sale.id}`}
                          className="text-sm text-text-secondary hover:text-text-primary"
                        >
                          Ver detalle
                        </Link>
                        {sale.status === "completed" ? (
                          <Button
                            variant="ghost"
                            className="px-0 py-0 text-sm text-red-400 hover:text-red-300"
                            onClick={() => {
                              if (confirm("¿Cancelar esta venta?")) {
                                cancelMutation.mutate(sale.id);
                              }
                            }}
                            disabled={cancelMutation.isPending}
                          >
                            Cancelar
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
            ))}
          </div>
        )}
      </Card>
      <Pagination
        page={page}
        onPrev={prevPage}
        onNext={nextPage}
        hasPrev={page > 0}
        hasMore={hasMore}
        isLoading={query.isLoading}
      />
    </div>
  );
}

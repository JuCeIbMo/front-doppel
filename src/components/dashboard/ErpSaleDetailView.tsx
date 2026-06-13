"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { apiFetch, ApiError, getBrowserSessionStore } from "@/lib/api-client";
import { clearToken } from "@/lib/auth";
import { useCurrency } from "@/hooks/useCurrency";
import type { SaleResponse } from "@/lib/erp-types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

async function getSale(saleId: string) {
  return apiFetch<SaleResponse>(`/erp/sales/${saleId}`, {
    baseUrl: API_URL,
    session: getBrowserSessionStore(),
  });
}

export function ErpSaleDetailView({ saleId }: { saleId: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { format } = useCurrency();

  const query = useQuery({
    queryKey: ["erp-sale", saleId],
    queryFn: () => getSale(saleId),
  });

  const cancelMutation = useMutation({
    mutationFn: async () => {
      return apiFetch<SaleResponse>(`/erp/sales/${saleId}/cancel`, {
        baseUrl: API_URL,
        session: getBrowserSessionStore(),
        method: "POST",
      });
    },
    onSuccess: async () => {
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

  const sale = query.data;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href="/dashboard/sales" className="text-sm text-text-secondary hover:text-text-primary">
            Volver a ventas
          </Link>
          <h1 className="mt-2 text-2xl font-semibold">Detalle de venta</h1>
        </div>
        {sale?.status === "completed" ? (
          <Button
            variant="secondary"
            className="px-5 py-3 text-sm"
            onClick={() => {
              if (confirm("¿Cancelar esta venta?")) {
                cancelMutation.mutate();
              }
            }}
            disabled={cancelMutation.isPending}
          >
            {cancelMutation.isPending ? "Cancelando..." : "Cancelar venta"}
          </Button>
        ) : null}
      </div>

      <Card>
        {query.isLoading ? (
          <div className="h-32 animate-pulse rounded-2xl bg-white/5" />
        ) : query.error ? (
          <p className="text-sm text-red-400">
            {query.error instanceof Error ? query.error.message : "No se pudo cargar la venta."}
          </p>
        ) : sale ? (
          <div className="space-y-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-sm text-text-secondary">Venta #{sale.id.slice(0, 8)}</p>
                <p className="mt-2 text-sm text-text-secondary">
                  {sale.actor} · {new Date(sale.created_at).toLocaleString()}
                </p>
                <p className="mt-2 text-sm text-text-secondary">Pago: {sale.payment_method}</p>
              </div>
              <div className="text-left md:text-right">
                <p className="text-2xl font-semibold">{format(sale.total)}</p>
                <p className="mt-1 text-sm text-text-secondary">Estado: {sale.status}</p>
              </div>
            </div>

            <div className="space-y-3">
              {sale.items.map((item) => (
                <div key={item.id} className="rounded-2xl border border-white/8 bg-white/4 px-4 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-medium">{item.product_name}</p>
                      <p className="mt-1 text-sm text-text-secondary">
                        {item.quantity} × {format(item.unit_price)}
                      </p>
                    </div>
                    <p className="font-medium">{format(item.total)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </Card>
    </div>
  );
}

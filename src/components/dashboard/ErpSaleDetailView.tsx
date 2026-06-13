"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { Table } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
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

  if (query.isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="h-8 w-48 animate-pulse rounded bg-bg-secondary" />
        <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
          <div className="h-64 animate-pulse rounded-xl bg-bg-secondary border border-border" />
          <div className="h-64 animate-pulse rounded-xl bg-bg-secondary border border-border" />
        </div>
      </div>
    );
  }

  if (query.error) {
    return (
      <Card>
        <p className="text-sm text-danger">
          {query.error instanceof Error ? query.error.message : "No se pudo cargar la venta."}
        </p>
      </Card>
    );
  }

  if (!sale) return null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/dashboard/sales" className="text-sm text-text-secondary hover:text-text-primary transition-colors">
          ← Ventas
        </Link>
        <h1 className="mt-2 text-xl font-semibold">Venta #{sale.id.slice(0, 8)}</h1>
        <p className="mt-0.5 text-sm text-text-secondary">
          {new Date(sale.created_at).toLocaleString()} · {sale.actor}
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        {/* Line items */}
        <Card>
          <CardHeader title="Ítems" />
          <Table>
            <Table.Head>
              <tr>
                <Table.Th>Producto</Table.Th>
                <Table.Th>Cantidad</Table.Th>
                <Table.Th>Precio unit.</Table.Th>
                <Table.Th className="text-right">Subtotal</Table.Th>
              </tr>
            </Table.Head>
            <Table.Body>
              {sale.items.map((item, i) => (
                <Table.Row key={item.id ?? i}>
                  <Table.Cell className="text-text-primary font-medium">{item.product_name}</Table.Cell>
                  <Table.Cell className="text-text-secondary">{item.quantity}</Table.Cell>
                  <Table.Cell className="text-text-secondary">{format(item.unit_price)}</Table.Cell>
                  <Table.Cell className="text-right text-text-primary">{format(item.total)}</Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        </Card>

        {/* Summary */}
        <div className="flex flex-col gap-4">
          <StatCard label="Total" value={format(sale.total)} />
          {sale.discount > 0 && (
            <StatCard label="Descuento" value={format(sale.discount)} />
          )}
          <Card>
            <div className="flex flex-col gap-3 text-sm">
              <div className="flex justify-between">
                <span className="text-text-muted">Estado</span>
                <Badge variant={sale.status === "completed" ? "success" : "danger"}>
                  {sale.status === "completed" ? "Completada" : "Cancelada"}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Pago</span>
                <span className="text-text-primary">{sale.payment_method}</span>
              </div>
              {sale.status === "completed" && (
                <Button
                  variant="secondary"
                  size="sm"
                  className="mt-2 w-full justify-center"
                  onClick={() => { if (confirm("¿Cancelar esta venta?")) cancelMutation.mutate(); }}
                  disabled={cancelMutation.isPending}
                >
                  {cancelMutation.isPending ? "Cancelando..." : "Cancelar venta"}
                </Button>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

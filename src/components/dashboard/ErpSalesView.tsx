"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardHeader } from "@/components/ui/Card";
import { Table } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
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
        <h1 className="text-xl font-semibold">Ventas</h1>
        <p className="mt-0.5 text-sm text-text-secondary">Historial de ventas del ERP.</p>
      </div>

      <Card>
        <CardHeader title="Ventas" />
        {query.isLoading ? (
          <Table>
            <Table.Loading rows={5} cols={6} />
          </Table>
        ) : query.error ? (
          <p className="text-sm text-danger">
            {query.error instanceof Error ? query.error.message : "No se pudo cargar ventas."}
          </p>
        ) : sales.length === 0 ? (
          <Table>
            <Table.Empty>Todavía no hay ventas registradas.</Table.Empty>
          </Table>
        ) : (
          <Table>
            <Table.Head>
              <tr>
                <Table.Th>ID</Table.Th>
                <Table.Th>Fecha</Table.Th>
                <Table.Th>Actor</Table.Th>
                <Table.Th>Total</Table.Th>
                <Table.Th>Estado</Table.Th>
                <Table.Th className="text-right">Acciones</Table.Th>
              </tr>
            </Table.Head>
            <Table.Body>
              {sales.map((sale) => (
                <Table.Row key={sale.id}>
                  <Table.Cell className="text-text-muted font-mono text-xs">
                    #{sale.id.slice(0, 8)}
                  </Table.Cell>
                  <Table.Cell className="text-text-secondary text-xs">
                    {new Date(sale.created_at).toLocaleString()}
                  </Table.Cell>
                  <Table.Cell className="text-text-secondary">{sale.actor}</Table.Cell>
                  <Table.Cell className="text-text-primary font-semibold">
                    {format(sale.total)}
                    {sale.discount > 0 && (
                      <span className="ml-1 text-xs text-text-muted">-{format(sale.discount)}</span>
                    )}
                  </Table.Cell>
                  <Table.Cell>
                    <Badge variant={sale.status === "completed" ? "success" : "danger"}>
                      {sale.status === "completed" ? "Completada" : "Cancelada"}
                    </Badge>
                  </Table.Cell>
                  <Table.Cell className="text-right">
                    <div className="inline-flex gap-3">
                      <Link
                        href={`/dashboard/sales/${sale.id}`}
                        className="text-sm text-text-secondary hover:text-text-primary transition-colors"
                      >
                        Ver
                      </Link>
                      {sale.status === "completed" && (
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm("¿Cancelar esta venta?")) cancelMutation.mutate(sale.id);
                          }}
                          className="text-sm text-danger hover:brightness-110 transition-colors"
                          disabled={cancelMutation.isPending}
                        >
                          Cancelar
                        </button>
                      )}
                    </div>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        )}
      </Card>
      <Pagination
        page={page}
        onPrev={prevPage}
        onNext={nextPage}
        hasMore={hasMore}
        isLoading={query.isLoading}
      />
    </div>
  );
}

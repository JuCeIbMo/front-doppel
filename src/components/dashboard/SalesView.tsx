"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardHeader } from "@/components/ui/Card";
import { Table } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { ApiError } from "@/lib/api-client";
import { readApi, runOperationOrThrow } from "@/lib/operations";
import { signOut } from "@/lib/supabase";
import { useCurrency } from "@/hooks/useCurrency";

/** One row of `GET /dashboard/sales`. */
export interface SaleSummary {
  code: string;
  total: string;
  payment_method: "cash" | "transfer" | "card";
  status: "registered" | "voided";
  created_at: string;
  voided_at: string | null;
}

const PAYMENT: Record<SaleSummary["payment_method"], string> = {
  cash: "Efectivo",
  transfer: "Transferencia",
  card: "Tarjeta",
};

export function SalesView() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { format } = useCurrency();
  const query = useQuery({
    queryKey: ["sales"],
    queryFn: () => readApi<SaleSummary[]>("/dashboard/sales"),
  });

  const voidMutation = useMutation({
    mutationFn: (saleCode: string) => runOperationOrThrow("void_sale", { sale_code: saleCode }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["sales"] });
      toast.success("Venta anulada.");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "No se pudo anular la venta.");
    },
  });

  if (query.error instanceof ApiError && query.error.status === 401) {
    void signOut();
    router.replace("/connect");
    return null;
  }

  const sales = query.data ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Ventas</h1>
        <p className="mt-0.5 text-sm text-text-secondary">
          Tus últimas 100 ventas, incluidas las que salen de pedidos entregados.
        </p>
      </div>

      <Card>
        <CardHeader title="Ventas" />
        {query.isLoading ? (
          <Table>
            <Table.Loading rows={5} cols={5} />
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
                <Table.Th>Código</Table.Th>
                <Table.Th>Fecha</Table.Th>
                <Table.Th>Pago</Table.Th>
                <Table.Th>Total</Table.Th>
                <Table.Th>Estado</Table.Th>
                <Table.Th className="text-right">Acciones</Table.Th>
              </tr>
            </Table.Head>
            <Table.Body>
              {sales.map((sale) => (
                <Table.Row key={sale.code}>
                  <Table.Cell className="text-text-muted font-mono text-xs">{sale.code}</Table.Cell>
                  <Table.Cell className="text-text-secondary text-xs">
                    {new Date(sale.created_at).toLocaleString()}
                  </Table.Cell>
                  <Table.Cell className="text-text-secondary">{PAYMENT[sale.payment_method]}</Table.Cell>
                  <Table.Cell className="text-text-primary font-semibold">
                    {format(Number(sale.total))}
                  </Table.Cell>
                  <Table.Cell>
                    <Badge variant={sale.status === "registered" ? "success" : "danger"}>
                      {sale.status === "registered" ? "Registrada" : "Anulada"}
                    </Badge>
                  </Table.Cell>
                  <Table.Cell className="text-right">
                    {sale.status === "registered" && (
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm("¿Anular esta venta? El stock vuelve al catálogo.")) {
                            voidMutation.mutate(sale.code);
                          }
                        }}
                        className="text-sm text-danger hover:brightness-110 transition-colors"
                        disabled={voidMutation.isPending}
                      >
                        Anular
                      </button>
                    )}
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        )}
      </Card>
    </div>
  );
}

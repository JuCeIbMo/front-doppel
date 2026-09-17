"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Table } from "@/components/ui/Table";
import { PAYMENT, type SaleSummary } from "@/components/dashboard/SalesView";
import { ApiError } from "@/lib/api-client";
import { formatDateTime } from "@/lib/dates";
import { readApi, runOperation } from "@/lib/operations";
import { signOut } from "@/lib/supabase";
import { useCurrency } from "@/hooks/useCurrency";

/** What `GET /dashboard/sales/{code}` answers. */
export interface SaleDetail extends SaleSummary {
  order_code: string | null;
  lines: Array<{ product_code: string; name: string; quantity: number; unit_price: string }>;
}

export function SaleDetailView({ saleCode }: { saleCode: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { format } = useCurrency();
  const query = useQuery({
    queryKey: ["sale", saleCode],
    queryFn: () => readApi<SaleDetail>(`/dashboard/sales/${encodeURIComponent(saleCode)}`),
  });

  const voidSale = useMutation({
    mutationFn: async () => {
      const answer = await runOperation("void_sale", { sale_code: saleCode });
      if (answer.status === "rejected") throw new Error(answer.message);
      return answer;
    },
    onSuccess: async (answer) => {
      await queryClient.invalidateQueries({ queryKey: ["sales"] });
      await queryClient.invalidateQueries({ queryKey: ["sale", saleCode] });
      if (answer.status === "approval_created") {
        toast.info("Quedó pendiente de aprobación. Revísala en Aprobaciones.");
      } else {
        toast.success("Venta anulada.");
      }
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "No se pudo anular la venta."),
  });

  if (query.error instanceof ApiError && query.error.status === 401) {
    void signOut();
    router.replace("/connect");
    return null;
  }

  const sale = query.data;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <Link href="/dashboard/sales" className="text-sm text-text-secondary hover:text-text-primary">
        ← Ventas
      </Link>

      {query.isLoading ? (
        <div className="h-64 animate-pulse rounded-xl bg-bg-elevated" />
      ) : !sale ? (
        <Card>
          <p className="text-sm text-text-secondary">
            {query.error instanceof ApiError && query.error.status === 404
              ? "Esa venta no existe."
              : query.error instanceof Error
                ? query.error.message
                : "No se pudo cargar la venta."}
          </p>
        </Card>
      ) : (
        <>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-xl font-semibold">Venta {sale.code}</h1>
              <p className="mt-0.5 text-sm text-text-secondary">
                {formatDateTime(sale.created_at)} · {PAYMENT[sale.payment_method]}
                {sale.order_code && (
                  <>
                    {" · del pedido "}
                    <Link href="/dashboard/orders" className="text-accent hover:underline">
                      {sale.order_code}
                    </Link>
                  </>
                )}
              </p>
            </div>
            <Badge variant={sale.status === "registered" ? "success" : "danger"}>
              {sale.status === "registered" ? "Registrada" : "Anulada"}
            </Badge>
          </div>

          <Card>
            <CardHeader title="Productos" />
            <Table>
              <Table.Head>
                <tr>
                  <Table.Th>Producto</Table.Th>
                  <Table.Th className="text-right">Cantidad</Table.Th>
                  <Table.Th className="hidden sm:table-cell text-right">Precio</Table.Th>
                  <Table.Th className="text-right">Subtotal</Table.Th>
                </tr>
              </Table.Head>
              <Table.Body>
                {sale.lines.map((line, index) => (
                  <Table.Row key={`${line.product_code}-${index}`}>
                    <Table.Cell className="text-text-primary">{line.name}</Table.Cell>
                    <Table.Cell className="text-right">{line.quantity}</Table.Cell>
                    <Table.Cell className="hidden sm:table-cell text-right">{format(Number(line.unit_price))}</Table.Cell>
                    <Table.Cell className="text-right">
                      {format(Number(line.unit_price) * line.quantity)}
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table>
            <div className="mt-4 flex justify-end gap-3 text-lg">
              <span className="text-text-secondary">Total</span>
              <span className="font-semibold">{format(Number(sale.total))}</span>
            </div>
          </Card>

          {sale.status === "voided" ? (
            sale.voided_at && (
              <p className="text-sm text-text-secondary">
                Anulada el {formatDateTime(sale.voided_at)}. El stock volvió al
                catálogo.
              </p>
            )
          ) : (
            <div className="flex justify-end">
              <Button
                variant="secondary"
                size="sm"
                disabled={voidSale.isPending}
                onClick={() => {
                  if (confirm("¿Anular esta venta? El stock vuelve al catálogo.")) {
                    voidSale.mutate();
                  }
                }}
              >
                {voidSale.isPending ? "Anulando..." : "Anular venta"}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

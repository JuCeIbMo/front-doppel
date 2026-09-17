"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Card, CardHeader } from "@/components/ui/Card";
import { Table } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ApiError } from "@/lib/api-client";
import { readApi, runOperation } from "@/lib/operations";
import { signOut } from "@/lib/supabase";
import { useCurrency } from "@/hooks/useCurrency";

type OrderStatus = "placed" | "paid" | "delivered" | "cancelled" | "refunded" | "expired";

/** One row of `GET /dashboard/orders`. */
export interface OrderSummary {
  code: string;
  status: OrderStatus;
  total: string;
  contact_code: string;
  whatsapp_number: string;
  placed_at: string;
  expires_at: string;
}

/** `GET /dashboard/orders/{code}`. */
export interface OrderDetail {
  code: string;
  status: OrderStatus;
  total: string;
  placed_at: string;
  expires_at: string;
  ended_at: string | null;
  lines: Array<{ product_code: string; name: string; quantity: number; unit_price: string }>;
  payment_proofs: Array<{
    attached_at: string;
    read_amount: string;
    matches_order: boolean;
    current: boolean;
    photo_url: string | null;
    summary: string | null;
  }>;
}

const STATUS: Record<OrderStatus, { label: string; variant: "success" | "warning" | "danger" | "neutral" }> = {
  placed: { label: "Esperando pago", variant: "warning" },
  paid: { label: "Pagado", variant: "success" },
  delivered: { label: "Entregado", variant: "neutral" },
  cancelled: { label: "Cancelado", variant: "danger" },
  refunded: { label: "Reembolsado", variant: "danger" },
  expired: { label: "Vencido", variant: "neutral" },
};

/** What the Owner can do next with an Order in each status. */
const ACTIONS: Partial<Record<OrderStatus, Array<{ operation: string; label: string; confirm: string }>>> = {
  placed: [
    { operation: "confirm_payment", label: "Confirmar pago", confirm: "¿Confirmas que este pedido está pagado?" },
    { operation: "cancel_order", label: "Cancelar", confirm: "¿Cancelar este pedido? El stock vuelve al catálogo." },
  ],
  paid: [
    { operation: "deliver_order", label: "Marcar entregado", confirm: "¿Marcar este pedido como entregado?" },
    { operation: "refund_order", label: "Reembolsar", confirm: "¿Reembolsar este pedido?" },
  ],
};

export function OrdersView() {
  const router = useRouter();
  const [open, setOpen] = useState<string | null>(null);
  const query = useQuery({
    queryKey: ["orders"],
    queryFn: () => readApi<OrderSummary[]>("/dashboard/orders"),
  });

  if (query.error instanceof ApiError && query.error.status === 401) {
    void signOut();
    router.replace("/connect");
    return null;
  }

  const orders = query.data ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Pedidos</h1>
        <p className="mt-0.5 text-sm text-text-secondary">
          Los pedidos que tus clientes hicieron por WhatsApp, los más nuevos primero.
        </p>
      </div>

      <Card>
        <CardHeader title="Pedidos" />
        {query.isLoading ? (
          <Table>
            <Table.Loading rows={5} cols={5} />
          </Table>
        ) : query.error ? (
          <p className="text-sm text-danger">
            {query.error instanceof Error ? query.error.message : "No se pudo cargar los pedidos."}
          </p>
        ) : orders.length === 0 ? (
          <Table>
            <Table.Empty>Todavía no hay pedidos.</Table.Empty>
          </Table>
        ) : (
          <Table>
            <Table.Head>
              <tr>
                <Table.Th>Código</Table.Th>
                <Table.Th>Cliente</Table.Th>
                <Table.Th>Fecha</Table.Th>
                <Table.Th>Total</Table.Th>
                <Table.Th>Estado</Table.Th>
                <Table.Th className="text-right">Detalle</Table.Th>
              </tr>
            </Table.Head>
            <Table.Body>
              {orders.map((order) => (
                <OrderRow
                  key={order.code}
                  order={order}
                  open={open === order.code}
                  onToggle={() => setOpen(open === order.code ? null : order.code)}
                />
              ))}
            </Table.Body>
          </Table>
        )}
      </Card>
    </div>
  );
}

function OrderRow({
  order,
  open,
  onToggle,
}: {
  order: OrderSummary;
  open: boolean;
  onToggle: () => void;
}) {
  const { format } = useCurrency();
  return (
    <>
      <Table.Row>
        <Table.Cell className="text-text-muted font-mono text-xs">{order.code}</Table.Cell>
        <Table.Cell className="text-text-secondary">{order.whatsapp_number}</Table.Cell>
        <Table.Cell className="text-text-secondary text-xs">
          {new Date(order.placed_at).toLocaleString()}
        </Table.Cell>
        <Table.Cell className="text-text-primary font-semibold">{format(Number(order.total))}</Table.Cell>
        <Table.Cell>
          <Badge variant={STATUS[order.status].variant}>{STATUS[order.status].label}</Badge>
        </Table.Cell>
        <Table.Cell className="text-right">
          <button
            type="button"
            onClick={onToggle}
            className="text-sm text-text-secondary hover:text-text-primary transition-colors"
          >
            {open ? "Ocultar" : "Ver"}
          </button>
        </Table.Cell>
      </Table.Row>
      {open && (
        <tr>
          <td colSpan={6} className="px-4 pb-4">
            <OrderDetailPanel code={order.code} />
          </td>
        </tr>
      )}
    </>
  );
}

function OrderDetailPanel({ code }: { code: string }) {
  const queryClient = useQueryClient();
  const { format } = useCurrency();
  const detail = useQuery({
    queryKey: ["order", code],
    queryFn: () => readApi<OrderDetail>(`/dashboard/orders/${code}`),
  });
  const action = useMutation({
    mutationFn: async (operation: string) => {
      const answer = await runOperation(operation, { order_code: code });
      if (answer.status === "rejected") throw new Error(answer.message);
      return answer;
    },
    onSuccess: async (answer) => {
      await queryClient.invalidateQueries({ queryKey: ["orders"] });
      await queryClient.invalidateQueries({ queryKey: ["order", code] });
      if (answer.status === "approval_created") {
        toast.info("Quedó pendiente de aprobación. Revísala en Aprobaciones.");
      } else {
        toast.success("Listo.");
      }
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "No se pudo completar la acción.");
    },
  });

  if (detail.isLoading) return <div className="h-16 animate-pulse rounded-lg bg-bg-elevated" />;
  if (!detail.data) return <p className="text-sm text-danger">No se pudo cargar el pedido.</p>;
  const order = detail.data;

  return (
    <div className="rounded-lg border border-border bg-bg-elevated/40 p-4 space-y-4">
      <ul className="text-sm space-y-1">
        {order.lines.map((line) => (
          <li key={line.product_code} className="flex justify-between gap-4">
            <span>
              {line.quantity} × {line.name}
            </span>
            <span className="text-text-secondary">{format(Number(line.unit_price) * line.quantity)}</span>
          </li>
        ))}
      </ul>

      {order.payment_proofs.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-wide text-text-muted">Comprobantes de pago</p>
          {order.payment_proofs.map((proof) => (
            <div key={proof.attached_at} className="flex items-start gap-3 text-sm">
              {proof.photo_url && (
                // eslint-disable-next-line @next/next/no-img-element -- a signed Storage link that expires
                <img src={proof.photo_url} alt="" className="h-24 rounded object-cover" />
              )}
              <div>
                <p>
                  Monto leído: {format(Number(proof.read_amount))}{" "}
                  {proof.matches_order ? (
                    <Badge variant="success">Coincide</Badge>
                  ) : (
                    <Badge variant="danger">No coincide</Badge>
                  )}
                  {!proof.current && <span className="ml-2 text-text-muted">(reemplazado)</span>}
                </p>
                {proof.summary && <p className="text-text-secondary">{proof.summary}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {(ACTIONS[order.status] ?? []).map((option) => (
          <Button
            key={option.operation}
            variant={option.operation === "cancel_order" || option.operation === "refund_order" ? "ghost" : "primary"}
            size="sm"
            disabled={action.isPending}
            onClick={() => {
              if (confirm(option.confirm)) action.mutate(option.operation);
            }}
          >
            {option.label}
          </Button>
        ))}
      </div>
    </div>
  );
}

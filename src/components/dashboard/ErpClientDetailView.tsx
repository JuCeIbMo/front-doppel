"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Card, CardHeader } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { Table } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { apiFetch, ApiError, getBrowserSessionStore } from "@/lib/api-client";
import { clearToken } from "@/lib/auth";
import { useCurrency } from "@/hooks/useCurrency";
import type { ClientResponse, SaleResponse } from "@/lib/erp-types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

async function getClient(clientId: string) {
  return apiFetch<ClientResponse>(`/erp/clients/${clientId}`, {
    baseUrl: API_URL,
    session: getBrowserSessionStore(),
  });
}

async function getClientSales(clientId: string) {
  return apiFetch<SaleResponse[]>(`/erp/sales?client_id=${clientId}&limit=20&offset=0`, {
    baseUrl: API_URL,
    session: getBrowserSessionStore(),
  });
}

export function ErpClientDetailView({ clientId }: { clientId: string }) {
  const router = useRouter();
  const { format } = useCurrency();

  const clientQuery = useQuery({
    queryKey: ["erp-client", clientId],
    queryFn: () => getClient(clientId),
  });

  const salesQuery = useQuery({
    queryKey: ["erp-client-sales", clientId],
    queryFn: () => getClientSales(clientId),
  });

  const error = clientQuery.error ?? salesQuery.error;

  if (error instanceof ApiError && error.status === 401) {
    clearToken();
    router.replace("/connect");
    return null;
  }

  const client = clientQuery.data;
  const sales = salesQuery.data ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/dashboard/clients" className="text-sm text-text-secondary hover:text-text-primary transition-colors">
          ← Clientes
        </Link>
        <h1 className="mt-2 text-xl font-semibold">{client?.name ?? "Cliente"}</h1>
      </div>

      {/* Client stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Total gastado" value={client ? format(client.total_purchases) : "—"} />
        <StatCard label="Compras" value={client ? String(client.purchase_count) : "—"} />
        <StatCard
          label="Última compra"
          value={
            client?.last_purchase_at
              ? new Date(client.last_purchase_at).toLocaleDateString()
              : "Sin compras"
          }
        />
      </div>

      {/* Contact info */}
      {client && (
        <Card>
          <CardHeader title="Contacto" />
          <div className="grid gap-3 text-sm md:grid-cols-2">
            {client.phone && (
              <div>
                <p className="text-xs text-text-muted uppercase tracking-wide">Teléfono</p>
                <p className="mt-1 text-text-primary">{client.phone}</p>
              </div>
            )}
            {client.email && (
              <div>
                <p className="text-xs text-text-muted uppercase tracking-wide">Email</p>
                <p className="mt-1 text-text-primary">{client.email}</p>
              </div>
            )}
            {client.address && (
              <div>
                <p className="text-xs text-text-muted uppercase tracking-wide">Dirección</p>
                <p className="mt-1 text-text-primary">{client.address}</p>
              </div>
            )}
            {client.tags.length > 0 && (
              <div>
                <p className="text-xs text-text-muted uppercase tracking-wide">Tags</p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {client.tags.map((tag) => (
                    <Badge key={tag} variant="neutral">{tag}</Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Purchase history */}
      <Card>
        <CardHeader title="Historial de compras" />
        {salesQuery.isLoading ? (
          <Table>
            <Table.Loading rows={4} cols={4} />
          </Table>
        ) : sales.length === 0 ? (
          <Table>
            <Table.Empty>Sin compras registradas.</Table.Empty>
          </Table>
        ) : (
          <Table>
            <Table.Head>
              <tr>
                <Table.Th>ID</Table.Th>
                <Table.Th>Fecha</Table.Th>
                <Table.Th>Total</Table.Th>
                <Table.Th>Estado</Table.Th>
              </tr>
            </Table.Head>
            <Table.Body>
              {sales.map((sale) => (
                <Table.Row key={sale.id}>
                  <Table.Cell>
                    <Link
                      href={`/dashboard/sales/${sale.id}`}
                      className="font-mono text-xs text-text-secondary hover:text-text-primary transition-colors"
                    >
                      #{sale.id.slice(0, 8)}
                    </Link>
                  </Table.Cell>
                  <Table.Cell className="text-text-secondary text-xs">
                    {new Date(sale.created_at).toLocaleDateString()}
                  </Table.Cell>
                  <Table.Cell className="text-text-primary font-semibold">{format(sale.total)}</Table.Cell>
                  <Table.Cell>
                    <Badge variant={sale.status === "completed" ? "success" : "danger"}>
                      {sale.status === "completed" ? "Completada" : "Cancelada"}
                    </Badge>
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

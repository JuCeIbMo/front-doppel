"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
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
        <Link href="/dashboard/clients" className="text-sm text-text-secondary hover:text-text-primary">
          Volver a clientes
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">{client?.name ?? "Cliente"}</h1>
      </div>

      <Card>
        {clientQuery.isLoading ? (
          <div className="h-32 animate-pulse rounded-2xl bg-white/5" />
        ) : error ? (
          <p className="text-sm text-red-400">
            {error instanceof Error ? error.message : "No se pudo cargar el cliente."}
          </p>
        ) : client ? (
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm text-text-secondary">Teléfono</p>
              <p className="mt-1">{client.phone || "Sin teléfono"}</p>
            </div>
            <div>
              <p className="text-sm text-text-secondary">Email</p>
              <p className="mt-1">{client.email || "Sin email"}</p>
            </div>
            <div>
              <p className="text-sm text-text-secondary">Dirección</p>
              <p className="mt-1">{client.address || "Sin dirección"}</p>
            </div>
            <div>
              <p className="text-sm text-text-secondary">Tags</p>
              <p className="mt-1">{client.tags.length ? client.tags.join(", ") : "Sin tags"}</p>
            </div>
            <div>
              <p className="text-sm text-text-secondary">Compras</p>
              <p className="mt-1">{client.purchase_count}</p>
            </div>
            <div>
              <p className="text-sm text-text-secondary">Total comprado</p>
              <p className="mt-1">{format(client.total_purchases)}</p>
            </div>
          </div>
        ) : null}
      </Card>

      <Card>
        <h2 className="text-lg font-medium">Historial de compras</h2>
        <div className="mt-4 space-y-3">
          {salesQuery.isLoading ? (
            <div className="h-24 animate-pulse rounded-2xl bg-white/5" />
          ) : sales.length === 0 ? (
            <p className="text-sm text-text-secondary">Este cliente todavía no tiene ventas.</p>
          ) : (
            sales.map((sale) => (
              <div key={sale.id} className="rounded-2xl border border-white/8 bg-white/4 px-4 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <Link href={`/dashboard/sales/${sale.id}`} className="font-medium hover:text-accent">
                      Venta #{sale.id.slice(0, 8)}
                    </Link>
                    <p className="mt-1 text-sm text-text-secondary">
                      {new Date(sale.created_at).toLocaleString()} · {sale.items.length} ítems
                    </p>
                  </div>
                  <p className="font-medium">{format(sale.total)}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Pagination } from "@/components/ui/Pagination";
import { apiFetch, ApiError, getBrowserSessionStore } from "@/lib/api-client";
import { clearToken } from "@/lib/auth";
import { usePagination } from "@/hooks/usePagination";
import { buildMovementQuery } from "@/lib/erp-ops";
import type { InventoryRow, MovementResponse } from "@/lib/erp-types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

async function getInventoryProducts() {
  return apiFetch<InventoryRow[]>("/erp/inventory?limit=100&offset=0", {
    baseUrl: API_URL,
    session: getBrowserSessionStore(),
  });
}

async function getMovements(productId: string, limit: number, offset: number) {
  return apiFetch<MovementResponse[]>(
    buildMovementQuery({
      productId,
      limit,
      offset,
    }),
    {
      baseUrl: API_URL,
      session: getBrowserSessionStore(),
    },
  );
}

export function ErpInventoryMovementsView({ initialProductId = "" }: { initialProductId?: string }) {
  const router = useRouter();
  const [productId, setProductId] = useState(initialProductId);
  const [typeFilter, setTypeFilter] = useState("");
  const { page, limit, offset, nextPage, prevPage, reset } = usePagination();

  const inventoryQuery = useQuery({
    queryKey: ["erp-inventory-products"],
    queryFn: getInventoryProducts,
  });

  const movementsQuery = useQuery({
    queryKey: ["erp-movements", productId, { offset, limit }],
    queryFn: () => getMovements(productId, limit, offset),
  });

  const error = inventoryQuery.error ?? movementsQuery.error;
  if (error instanceof ApiError && error.status === 401) {
    clearToken();
    router.replace("/connect");
    return null;
  }

  const rows = inventoryQuery.data ?? [];
  const movements = (movementsQuery.data ?? []).filter((movement) =>
    typeFilter ? movement.type === typeFilter : true,
  );
  const hasMore = (movementsQuery.data?.length ?? 0) === limit;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/dashboard/inventory"
          className="text-sm text-text-secondary transition-colors hover:text-text-primary"
        >
          Volver a inventario
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">Movimientos de inventario</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Historial operativo sobre `/erp/inventory/movements`.
        </p>
      </div>

      <Card>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm text-text-secondary">Producto</label>
            <select
              value={productId}
              onChange={(event) => { setProductId(event.target.value); reset(); }}
              className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent/30"
            >
              <option value="">Todos los productos</option>
              {rows.map((row) => (
                <option key={`${row.product_id}-${row.variant_id ?? "base"}`} value={row.product_id}>
                  {row.product_name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-text-secondary">Tipo</label>
            <select
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent/30"
            >
              <option value="">Todos</option>
              <option value="purchase">Compra</option>
              <option value="sale">Venta</option>
              <option value="adjustment_in">Ajuste +</option>
              <option value="adjustment_out">Ajuste -</option>
              <option value="return">Devolución</option>
              <option value="loss">Merma</option>
            </select>
          </div>
        </div>
      </Card>

      <Card>
        {movementsQuery.isLoading ? (
          <div className="space-y-3">
            <div className="h-16 animate-pulse rounded-2xl bg-white/5" />
            <div className="h-16 animate-pulse rounded-2xl bg-white/5" />
          </div>
        ) : error ? (
          <p className="text-sm text-red-400">
            {error instanceof Error ? error.message : "No se pudo cargar movimientos."}
          </p>
        ) : movements.length === 0 ? (
          <p className="text-sm text-text-secondary">No hay movimientos para este filtro.</p>
        ) : (
          <div className="space-y-3">
            {movements.map((movement) => (
              <div
                key={movement.id}
                className="rounded-2xl border border-white/8 bg-white/4 px-4 py-4"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="font-medium">{movement.product_name || movement.product_id}</p>
                    <p className="mt-1 text-sm text-text-secondary">
                      {movement.type} · {movement.actor}
                    </p>
                    <p className="mt-1 text-xs text-text-secondary">
                      {new Date(movement.created_at).toLocaleString()}
                    </p>
                    {movement.notes ? (
                      <p className="mt-2 text-sm text-text-secondary">{movement.notes}</p>
                    ) : null}
                  </div>
                  <div className="text-left md:text-right">
                    <p className="font-medium">{movement.quantity}</p>
                    {movement.reference_id ? (
                      <p className="mt-1 text-xs text-text-secondary">
                        Ref: {movement.reference_id}
                      </p>
                    ) : null}
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
        isLoading={movementsQuery.isLoading}
      />
    </div>
  );
}

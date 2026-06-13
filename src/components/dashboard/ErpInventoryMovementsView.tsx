"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Card, CardHeader } from "@/components/ui/Card";
import { Pagination } from "@/components/ui/Pagination";
import { Table } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
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

async function getMovements(productId: string, typeFilter: string, limit: number, offset: number) {
  return apiFetch<MovementResponse[]>(
    buildMovementQuery({
      productId,
      limit,
      offset,
      type: typeFilter || undefined,
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
    queryKey: ["erp-movements", productId, typeFilter, { offset, limit }],
    queryFn: () => getMovements(productId, typeFilter, limit, offset),
  });

  const error = inventoryQuery.error ?? movementsQuery.error;
  if (error instanceof ApiError && error.status === 401) {
    clearToken();
    router.replace("/connect");
    return null;
  }

  const rows = inventoryQuery.data ?? [];
  const movements = movementsQuery.data ?? [];
  const hasMore = (movementsQuery.data?.length ?? 0) === limit;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/dashboard/inventory"
          className="text-sm text-text-secondary transition-colors hover:text-text-primary"
        >
          ← Inventario
        </Link>
        <h1 className="mt-2 text-xl font-semibold">Movimientos de inventario</h1>
        <p className="mt-0.5 text-sm text-text-secondary">Historial de movimientos de inventario.</p>
      </div>

      <Card>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-text-muted uppercase tracking-wide">Producto</label>
            <select
              value={productId}
              onChange={(event) => { setProductId(event.target.value); reset(); }}
              className="w-full rounded-lg border border-border bg-bg-elevated px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent/40 focus:border-accent/40 transition-colors"
            >
              <option value="">Todos los productos</option>
              {rows.map((row) => (
                <option key={`${row.product_id}-${row.variant_id ?? "base"}`} value={row.product_id}>
                  {row.product_name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-text-muted uppercase tracking-wide">Tipo</label>
            <select
              value={typeFilter}
              onChange={(event) => { setTypeFilter(event.target.value); reset(); }}
              className="w-full rounded-lg border border-border bg-bg-elevated px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent/40 focus:border-accent/40 transition-colors"
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
        <CardHeader title="Historial" />
        {movementsQuery.isLoading ? (
          <Table>
            <Table.Loading rows={5} cols={5} />
          </Table>
        ) : error ? (
          <p className="text-sm text-danger">
            {error instanceof Error ? error.message : "No se pudo cargar movimientos."}
          </p>
        ) : movements.length === 0 ? (
          <Table>
            <Table.Empty>No hay movimientos para este filtro.</Table.Empty>
          </Table>
        ) : (
          <Table>
            <Table.Head>
              <tr>
                <Table.Th>Fecha</Table.Th>
                <Table.Th>Producto</Table.Th>
                <Table.Th>Tipo</Table.Th>
                <Table.Th>Cantidad</Table.Th>
                <Table.Th>Nota</Table.Th>
              </tr>
            </Table.Head>
            <Table.Body>
              {movements.map((movement) => {
                const typeVariant = (
                  movement.type === "purchase" || movement.type === "adjustment_in" || movement.type === "return"
                    ? "success"
                    : movement.type === "sale" || movement.type === "loss"
                    ? "danger"
                    : "warning"
                ) as "success" | "danger" | "warning";
                const typeLabel: Record<string, string> = {
                  purchase: "Compra",
                  sale: "Venta",
                  adjustment_in: "Ajuste +",
                  adjustment_out: "Ajuste -",
                  return: "Devolución",
                  loss: "Merma",
                };
                return (
                  <Table.Row key={movement.id}>
                    <Table.Cell className="text-text-muted text-xs">
                      {new Date(movement.created_at).toLocaleString()}
                    </Table.Cell>
                    <Table.Cell className="text-text-primary font-medium">
                      {movement.product_name || movement.product_id}
                    </Table.Cell>
                    <Table.Cell>
                      <Badge variant={typeVariant}>
                        {typeLabel[movement.type] ?? movement.type}
                      </Badge>
                    </Table.Cell>
                    <Table.Cell className="text-text-primary">{movement.quantity}</Table.Cell>
                    <Table.Cell className="text-text-muted">{movement.notes || "—"}</Table.Cell>
                  </Table.Row>
                );
              })}
            </Table.Body>
          </Table>
        )}
      </Card>
      <Pagination
        page={page}
        onPrev={prevPage}
        onNext={nextPage}
        hasMore={hasMore}
        isLoading={movementsQuery.isLoading}
      />
    </div>
  );
}

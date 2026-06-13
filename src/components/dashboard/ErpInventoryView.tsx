"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Pagination } from "@/components/ui/Pagination";
import { apiFetch, ApiError, getBrowserSessionStore } from "@/lib/api-client";
import { clearToken } from "@/lib/auth";
import { usePagination } from "@/hooks/usePagination";
import type { InventoryRow } from "@/lib/erp-types";
import { Input } from "@/components/ui/Input";
import { Table } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { CardHeader } from "@/components/ui/Card";
import {
  buildInventoryAdjustmentPayload,
  type InventoryAdjustmentDraft,
} from "@/lib/erp-forms";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

const emptyAdjustment: InventoryAdjustmentDraft = {
  product_id: "",
  variant_id: "",
  mode: "delta",
  quantity: "",
  note: "",
};

async function getInventory(limit: number, offset: number) {
  return apiFetch<InventoryRow[]>(`/erp/inventory?limit=${limit}&offset=${offset}`, {
    baseUrl: API_URL,
    session: getBrowserSessionStore(),
  });
}

export function ErpInventoryView() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<InventoryAdjustmentDraft>(emptyAdjustment);
  const [modalOpen, setModalOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const { page, limit, offset, nextPage, prevPage } = usePagination();

  const query = useQuery({
    queryKey: ["erp-inventory", { offset, limit }],
    queryFn: () => getInventory(limit, offset),
  });

  const adjustMutation = useMutation({
    mutationFn: async () => {
      const payload = buildInventoryAdjustmentPayload(draft);
      return apiFetch("/erp/inventory/adjustment", {
        baseUrl: API_URL,
        session: getBrowserSessionStore(),
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["erp-inventory"] });
      await queryClient.invalidateQueries({ queryKey: ["erp-low-stock"] });
      toast.success("Stock ajustado.");
      setModalOpen(false);
      setDraft(emptyAdjustment);
      setFormError(null);
    },
    onError: (error) => {
      setFormError(error instanceof Error ? error.message : "No se pudo ajustar el stock.");
    },
  });

  if (query.error instanceof ApiError && query.error.status === 401) {
    clearToken();
    router.replace("/connect");
    return null;
  }

  const rows = query.data ?? [];
  const hasMore = rows.length === limit;

  function openAdjustment(row: InventoryRow) {
    setDraft({
      product_id: row.product_id,
      variant_id: row.variant_id ?? "",
      mode: "delta",
      quantity: "",
      note: "",
    });
    setFormError(null);
    setModalOpen(true);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Inventario</h1>
          <p className="mt-0.5 text-sm text-text-secondary">Control de stock del ERP.</p>
        </div>
        <Button variant="secondary" size="sm" href="/dashboard/inventory/movements">
          Ver movimientos
        </Button>
      </div>

      <Card>
        <CardHeader
          title="Stock"
          action={
            <Button variant="secondary" size="sm" onClick={() => { setDraft(emptyAdjustment); setFormError(null); setModalOpen(true); }}>
              Ajustar stock
            </Button>
          }
        />
        {query.isLoading ? (
          <Table>
            <Table.Loading rows={6} cols={6} />
          </Table>
        ) : query.error ? (
          <p className="text-sm text-danger">
            {query.error instanceof Error ? query.error.message : "No se pudo cargar inventario."}
          </p>
        ) : rows.length === 0 ? (
          <Table>
            <Table.Empty>No hay registros de inventario todavía.</Table.Empty>
          </Table>
        ) : (
          <Table>
            <Table.Head>
              <tr>
                <Table.Th>Producto</Table.Th>
                <Table.Th>Categoría</Table.Th>
                <Table.Th>Cantidad</Table.Th>
                <Table.Th>Umbral</Table.Th>
                <Table.Th>Estado</Table.Th>
                <Table.Th className="text-right">Acciones</Table.Th>
              </tr>
            </Table.Head>
            <Table.Body>
              {rows.map((row) => {
                const isOut = row.quantity === 0;
                const isLow = row.quantity <= row.low_stock_threshold;
                return (
                  <Table.Row key={`${row.product_id}-${row.variant_id ?? "base"}`}>
                    <Table.Cell>
                      <span className="font-medium text-text-primary">{row.product_name}</span>
                      {row.variant_name && (
                        <p className="text-xs text-text-muted mt-0.5">{row.variant_name}</p>
                      )}
                    </Table.Cell>
                    <Table.Cell className="text-text-secondary">{row.category || "Sin categoría"}</Table.Cell>
                    <Table.Cell className="text-text-primary font-medium">
                      {row.quantity} {row.unit}
                    </Table.Cell>
                    <Table.Cell className="text-text-muted">{row.low_stock_threshold}</Table.Cell>
                    <Table.Cell>
                      <Badge variant={isOut ? "danger" : isLow ? "warning" : "success"}>
                        {isOut ? "Sin stock" : isLow ? "Stock bajo" : "OK"}
                      </Badge>
                    </Table.Cell>
                    <Table.Cell className="text-right">
                      <div className="inline-flex gap-3">
                        <Link
                          href={`/dashboard/inventory/movements?product_id=${encodeURIComponent(row.product_id)}`}
                          className="text-sm text-text-secondary hover:text-text-primary transition-colors"
                        >
                          Historial
                        </Link>
                        <button
                          type="button"
                          onClick={() => openAdjustment(row)}
                          className="text-sm text-text-secondary hover:text-text-primary transition-colors"
                        >
                          Ajustar
                        </button>
                      </div>
                    </Table.Cell>
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
        isLoading={query.isLoading}
      />

      {modalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="w-full max-w-xl rounded-xl border border-border bg-bg-secondary p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-4 mb-5">
              <h2 className="text-base font-semibold text-text-primary">Ajuste manual de stock</h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-sm text-text-secondary transition-colors hover:text-text-primary"
              >
                Cerrar
              </button>
            </div>

            <div className="grid gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-text-muted uppercase tracking-wide">Modo</label>
                <select
                  value={draft.mode}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      mode: event.target.value as "set" | "delta",
                    }))
                  }
                  className="w-full rounded-lg border border-border bg-bg-elevated px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent/40 focus:border-accent/40 transition-colors"
                >
                  <option value="delta">Sumar / restar unidades</option>
                  <option value="set">Definir cantidad exacta</option>
                </select>
              </div>
              <Input
                label={draft.mode === "set" ? "Nueva cantidad" : "Delta"}
                value={draft.quantity}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, quantity: event.target.value }))
                }
                placeholder={draft.mode === "set" ? "18" : "-2 o 5"}
              />
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-text-muted uppercase tracking-wide">Nota obligatoria</label>
                <textarea
                  value={draft.note}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, note: event.target.value }))
                  }
                  rows={3}
                  placeholder="Motivo del ajuste"
                  className="w-full rounded-lg border border-border bg-bg-elevated px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent/40 focus:border-accent/40 transition-colors resize-none"
                />
              </div>
            </div>

            {formError ? <p className="mt-4 text-sm text-danger">{formError}</p> : null}

            <div className="mt-6 flex justify-end gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => adjustMutation.mutate()}
                disabled={adjustMutation.isPending}
              >
                {adjustMutation.isPending ? "Guardando..." : "Aplicar ajuste"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

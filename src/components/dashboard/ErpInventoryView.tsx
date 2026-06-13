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
          <h1 className="text-2xl font-semibold">Inventario</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Stock actual sobre `/erp/inventory`.
          </p>
        </div>
        <Button variant="secondary" className="px-5 py-3 text-sm" href="/dashboard/inventory/movements">
          Ver movimientos
        </Button>
      </div>

      <Card>
        {query.isLoading ? (
          <div className="space-y-3">
            <div className="h-16 animate-pulse rounded-2xl bg-white/5" />
            <div className="h-16 animate-pulse rounded-2xl bg-white/5" />
            <div className="h-16 animate-pulse rounded-2xl bg-white/5" />
          </div>
        ) : query.error ? (
          <p className="text-sm text-red-400">
            {query.error instanceof Error ? query.error.message : "No se pudo cargar inventario."}
          </p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-text-secondary">No hay registros de inventario todavía.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-text-secondary">
                  <th className="py-3 pr-4 font-medium">Producto</th>
                  <th className="py-3 pr-4 font-medium">Categoría</th>
                  <th className="py-3 pr-4 font-medium">Cantidad</th>
                  <th className="py-3 pr-4 font-medium">Unidad</th>
                  <th className="py-3 pr-4 font-medium">Umbral</th>
                  <th className="py-3 font-medium text-right">Ajuste</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={`${row.product_id}-${row.variant_id ?? "base"}`} className="border-b border-white/5 last:border-b-0">
                    <td className="py-4 pr-4">
                      <p className="font-medium text-text-primary">{row.product_name}</p>
                      {row.variant_name ? (
                        <p className="mt-1 text-xs text-text-secondary">{row.variant_name}</p>
                      ) : null}
                    </td>
                    <td className="py-4 pr-4 text-text-secondary">{row.category || "Sin categoría"}</td>
                    <td className="py-4 pr-4 text-text-primary">{row.quantity}</td>
                    <td className="py-4 pr-4 text-text-secondary">{row.unit}</td>
                    <td className="py-4 pr-4 text-text-primary">{row.low_stock_threshold}</td>
                    <td className="py-4 text-right">
                      <div className="inline-flex gap-3 text-sm">
                        <Link
                          href={`/dashboard/inventory/movements?product_id=${encodeURIComponent(row.product_id)}`}
                          className="text-text-secondary transition-colors hover:text-text-primary"
                        >
                          Historial
                        </Link>
                        <button
                          type="button"
                          onClick={() => openAdjustment(row)}
                          className="text-text-secondary transition-colors hover:text-text-primary"
                        >
                          Ajustar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <Pagination
        page={page}
        onPrev={prevPage}
        onNext={nextPage}
        hasPrev={page > 0}
        hasMore={hasMore}
        isLoading={query.isLoading}
      />

      {modalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="w-full max-w-xl rounded-3xl border border-white/10 bg-bg-primary p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-xl font-semibold">Ajuste manual de stock</h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-sm text-text-secondary transition-colors hover:text-text-primary"
              >
                Cerrar
              </button>
            </div>

            <div className="mt-6 grid gap-4">
              <div>
                <label className="block text-sm text-text-secondary">Modo</label>
                <select
                  value={draft.mode}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      mode: event.target.value as "set" | "delta",
                    }))
                  }
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent/30"
                >
                  <option value="delta">Sumar / restar unidades</option>
                  <option value="set">Definir cantidad exacta</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-text-secondary">
                  {draft.mode === "set" ? "Nueva cantidad" : "Delta"}
                </label>
                <input
                  value={draft.quantity}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, quantity: event.target.value }))
                  }
                  placeholder={draft.mode === "set" ? "18" : "-2 o 5"}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent/30"
                />
              </div>
              <div>
                <label className="block text-sm text-text-secondary">Nota obligatoria</label>
                <textarea
                  value={draft.note}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, note: event.target.value }))
                  }
                  rows={3}
                  placeholder="Motivo del ajuste"
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent/30"
                />
              </div>
            </div>

            {formError ? <p className="mt-4 text-sm text-red-400">{formError}</p> : null}

            <div className="mt-6 flex justify-end gap-3">
              <Button
                variant="ghost"
                className="px-5 py-3 text-sm"
                onClick={() => setModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                variant="primary"
                className="px-5 py-3 text-sm"
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

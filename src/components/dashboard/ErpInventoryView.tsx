"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Pagination } from "@/components/ui/Pagination";
import { apiFetch, ApiError, getBrowserSessionStore } from "@/lib/api-client";
import { clearToken } from "@/lib/auth";
import { usePagination } from "@/hooks/usePagination";
import type { InventoryRow } from "@/lib/erp-types";
import { Input } from "@/components/ui/Input";
import {
  buildInventoryAdjustmentPayload,
  type InventoryAdjustmentDraft,
} from "@/lib/erp-forms";
import {
  MPage,
  MPanel,
  MSectionHead,
  MPill,
  MThread,
  MEyebrow,
} from "@/components/ui/MeridianKit";

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
    <MPage
      eyebrow="Módulo de inventario · Cadena de suministro"
      title="Inventario"
      right={
        <div style={{ display: "flex", gap: 10 }}>
          <Button variant="secondary" size="sm" href="/dashboard/inventory/movements">
            Ver movimientos
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => { setDraft(emptyAdjustment); setFormError(null); setModalOpen(true); }}
          >
            Ajustar stock
          </Button>
        </div>
      }
    >
      {/* STOCK LEDGER */}
      <MPanel pad={26}>
        <MSectionHead
          eyebrow={`Libro de stock · ${rows.length} ítems`}
          title="Stock Ledger"
          action={
            <span className="m-mono" style={{ fontSize: 11, color: "var(--m-ink-faint)" }}>
              {hasMore ? "más disponibles" : `${rows.length} mostrados`}
            </span>
          }
        />

        {/* header */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.6fr 1fr 1.2fr 0.9fr 0.8fr 1fr",
            gap: 14,
            paddingBottom: 11,
            borderBottom: "1px solid var(--m-line)",
          }}
        >
          {["Producto", "Categoría", "Stock vs umbral", "Umbral", "Estado", "Acciones"].map(
            (h) => <MEyebrow key={h}>{h}</MEyebrow>
          )}
        </div>

        {query.isLoading ? (
          <div style={{ paddingTop: 16 }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                style={{
                  height: 48,
                  marginBottom: 8,
                  borderRadius: "var(--m-r-sm)",
                  background: "var(--m-surface-2)",
                  animation: "pulse 1.5s ease-in-out infinite",
                }}
              />
            ))}
          </div>
        ) : query.error ? (
          <div style={{ padding: "20px 0", color: "var(--m-neg)", fontSize: 13 }}>
            {query.error instanceof Error ? query.error.message : "No se pudo cargar inventario."}
          </div>
        ) : rows.length === 0 ? (
          <div
            style={{
              padding: "40px 0",
              textAlign: "center",
              color: "var(--m-ink-faint)",
              fontFamily: "var(--m-mono)",
              fontSize: 12,
            }}
          >
            No hay registros de inventario todavía.
          </div>
        ) : (
          rows.map((row, i) => {
            const isOut = row.quantity === 0;
            const isLow = row.quantity <= row.low_stock_threshold;
            const tone = isOut ? "critical" : isLow ? "reorder" : "healthy";
            const ratio = Math.min(
              row.quantity / Math.max(row.low_stock_threshold, 1),
              1.4
            );
            return (
              <div
                key={`${row.product_id}-${row.variant_id ?? "base"}`}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.6fr 1fr 1.2fr 0.9fr 0.8fr 1fr",
                  gap: 14,
                  alignItems: "center",
                  padding: "15px 0",
                  borderBottom: i < rows.length - 1 ? "1px solid var(--m-line-soft)" : "none",
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--m-ink)" }}>
                    {row.product_name}
                  </div>
                  {row.variant_name && (
                    <div style={{ fontSize: 11, color: "var(--m-ink-faint)", marginTop: 2 }}>
                      {row.variant_name}
                    </div>
                  )}
                </div>
                <span style={{ fontSize: 12.5, color: "var(--m-ink-dim)" }}>
                  {row.category || "Sin categoría"}
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div
                    style={{
                      flex: 1,
                      maxWidth: 120,
                      height: 6,
                      background: "var(--m-surface-2)",
                      borderRadius: 999,
                      overflow: "hidden",
                      position: "relative",
                    }}
                  >
                    <div
                      style={{
                        position: "absolute",
                        left: (1 / 1.4) * 100 + "%",
                        top: -2,
                        bottom: -2,
                        width: 1.5,
                        background: "var(--m-ink-faint)",
                      }}
                      title="Umbral de reorden"
                    />
                    <div
                      style={{
                        width: (ratio / 1.4) * 100 + "%",
                        height: "100%",
                        borderRadius: 999,
                        background: isOut
                          ? "var(--m-neg)"
                          : isLow
                          ? "var(--m-warn)"
                          : "var(--m-pos)",
                      }}
                    />
                  </div>
                  <span
                    className="m-mono m-tnum"
                    style={{ fontSize: 11.5, color: "var(--m-ink-dim)" }}
                  >
                    {row.quantity} {row.unit}
                  </span>
                </div>
                <span
                  className="m-mono m-tnum"
                  style={{ fontSize: 12.5, color: "var(--m-ink-dim)" }}
                >
                  {row.low_stock_threshold}
                </span>
                <MPill tone={tone}>
                  {isOut ? "Agotado" : isLow ? "Bajo" : "OK"}
                </MPill>
                <div style={{ display: "flex", gap: 14 }}>
                  <Link
                    href={`/dashboard/inventory/movements?product_id=${encodeURIComponent(row.product_id)}`}
                    style={{
                      fontSize: 12,
                      color: "var(--m-ink-faint)",
                      textDecoration: "none",
                      fontFamily: "var(--m-mono)",
                      letterSpacing: "0.06em",
                    }}
                  >
                    Historial
                  </Link>
                  <button
                    type="button"
                    onClick={() => openAdjustment(row)}
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--m-accent)",
                      fontSize: 12,
                      fontFamily: "var(--m-mono)",
                      cursor: "pointer",
                      letterSpacing: "0.06em",
                    }}
                  >
                    Ajustar
                  </button>
                </div>
              </div>
            );
          })
        )}
      </MPanel>

      <div style={{ marginTop: 16 }}>
        <Pagination
          page={page}
          onPrev={prevPage}
          onNext={nextPage}
          hasMore={hasMore}
          isLoading={query.isLoading}
        />
      </div>

      {/* MODAL: Ajuste de stock */}
      {modalOpen ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 50,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,0.75)",
            padding: "0 16px",
          }}
          onClick={() => setModalOpen(false)}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 480,
              background: "var(--m-panel)",
              border: "1px solid var(--m-line)",
              borderRadius: "var(--m-r)",
              padding: 28,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
              <h2
                className="m-serif"
                style={{ margin: 0, fontSize: 22, fontWeight: 500, color: "var(--m-ink)" }}
              >
                Ajuste manual de stock
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                style={{ background: "none", border: "none", color: "var(--m-ink-faint)", cursor: "pointer", fontSize: 18 }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <MEyebrow style={{ marginBottom: 6 }}>Modo</MEyebrow>
                <select
                  value={draft.mode}
                  onChange={(e) => setDraft((c) => ({ ...c, mode: e.target.value as "set" | "delta" }))}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    background: "var(--m-surface-2)",
                    border: "1px solid var(--m-line)",
                    borderRadius: "var(--m-r-sm)",
                    color: "var(--m-ink)",
                    fontFamily: "var(--m-sans)",
                    fontSize: 13,
                  }}
                >
                  <option value="delta">Sumar / restar unidades</option>
                  <option value="set">Definir cantidad exacta</option>
                </select>
              </div>
              <Input
                label={draft.mode === "set" ? "Nueva cantidad" : "Delta"}
                value={draft.quantity}
                onChange={(e) => setDraft((c) => ({ ...c, quantity: e.target.value }))}
                placeholder={draft.mode === "set" ? "18" : "-2 o 5"}
              />
              <div>
                <MEyebrow style={{ marginBottom: 6 }}>Nota obligatoria</MEyebrow>
                <textarea
                  value={draft.note}
                  onChange={(e) => setDraft((c) => ({ ...c, note: e.target.value }))}
                  rows={3}
                  placeholder="Motivo del ajuste"
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    background: "var(--m-surface-2)",
                    border: "1px solid var(--m-line)",
                    borderRadius: "var(--m-r-sm)",
                    color: "var(--m-ink)",
                    fontFamily: "var(--m-sans)",
                    fontSize: 13,
                    resize: "none",
                    outline: "none",
                  }}
                />
              </div>
            </div>

            {formError && (
              <p style={{ marginTop: 14, fontSize: 12, color: "var(--m-neg)" }}>{formError}</p>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 24 }}>
              <Button variant="ghost" size="sm" onClick={() => setModalOpen(false)}>
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
    </MPage>
  );
}

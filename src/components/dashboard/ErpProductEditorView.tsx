"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { apiFetch, ApiError, getBrowserSessionStore } from "@/lib/api-client";
import { clearToken } from "@/lib/auth";
import { buildProductPayload, type ProductDraftInput } from "@/lib/erp-forms";
import type { ErpProduct } from "@/lib/erp-types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

const emptyDraft: ProductDraftInput = {
  name: "",
  description: "",
  sku: "",
  barcode: "",
  category: "",
  image_url: "",
  cost_price: "0",
  price: "0",
  unit: "unidad",
  available: true,
  low_stock_threshold: "5",
};

async function getProduct(productId: string) {
  return apiFetch<ErpProduct>(`/erp/products/${productId}`, {
    baseUrl: API_URL,
    session: getBrowserSessionStore(),
  });
}

export function ErpProductEditorView({
  productId,
  barcodeSeed,
}: {
  productId?: string;
  barcodeSeed?: string;
}) {
  const router = useRouter();

  const query = useQuery({
    queryKey: ["erp-product", productId],
    queryFn: () => getProduct(productId!),
    enabled: Boolean(productId),
  });

  if (query.error instanceof ApiError && query.error.status === 401) {
    clearToken();
    router.replace("/connect");
    return null;
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/dashboard/products" className="text-sm text-text-secondary hover:text-text-primary">
          Volver a productos
        </Link>
        <h1 className="mt-2 text-xl font-semibold">
          {productId ? "Editar producto" : "Nuevo producto"}
        </h1>
      </div>

      <Card>
        {query.isLoading ? (
          <div className="h-40 animate-pulse rounded-lg bg-bg-elevated" />
        ) : query.error ? (
          <p className="text-sm text-danger">
            {query.error instanceof Error ? query.error.message : "No se pudo cargar el producto."}
          </p>
        ) : (
          <ProductFormCard
            key={productId ?? `new-${barcodeSeed ?? ""}`}
            productId={productId}
            initialDraft={
              query.data
                ? {
                    name: query.data.name,
                    description: query.data.description ?? "",
                    sku: query.data.sku ?? "",
                    barcode: query.data.barcode ?? "",
                    category: query.data.category ?? "",
                    image_url: query.data.image_url ?? "",
                    cost_price: String(query.data.cost_price),
                    price: String(query.data.price),
                    unit: query.data.unit,
                    available: query.data.available,
                    low_stock_threshold: String(query.data.low_stock_threshold),
                  }
                : {
                    ...emptyDraft,
                    barcode: barcodeSeed ?? "",
                  }
            }
          />
        )}
      </Card>
    </div>
  );
}

function ProductFormCard({
  productId,
  initialDraft,
}: {
  productId?: string;
  initialDraft: ProductDraftInput;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<ProductDraftInput>(initialDraft);
  const [formError, setFormError] = useState<string | null>(null);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = buildProductPayload(draft);
      if (productId) {
        return apiFetch<ErpProduct>(`/erp/products/${productId}`, {
          baseUrl: API_URL,
          session: getBrowserSessionStore(),
          method: "PUT",
          body: JSON.stringify(payload),
        });
      }

      return apiFetch<ErpProduct>("/erp/products", {
        baseUrl: API_URL,
        session: getBrowserSessionStore(),
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
    onSuccess: async (product) => {
      await queryClient.invalidateQueries({ queryKey: ["erp-products"] });
      await queryClient.invalidateQueries({ queryKey: ["erp-product", product.id] });
      toast.success(productId ? "Producto actualizado." : "Producto creado.");
      router.push(`/dashboard/products/${product.id}`);
    },
    onError: (error) => {
      setFormError(error instanceof Error ? error.message : "No se pudo guardar el producto.");
    },
  });

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <Input
            label="Nombre"
            value={draft.name}
            onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm text-text-secondary">Descripción</label>
          <textarea
            value={draft.description}
            onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))}
            rows={3}
            className="mt-2 w-full rounded-lg border border-border bg-bg-elevated px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent/40 focus:border-accent/40 transition-colors resize-none"
          />
        </div>
        {[
          ["sku", "SKU"],
          ["barcode", "Código de barras"],
          ["category", "Categoría"],
          ["image_url", "URL de imagen"],
          ["cost_price", "Costo"],
          ["price", "Precio venta"],
          ["unit", "Unidad"],
          ["low_stock_threshold", "Umbral stock"],
        ].map(([field, label]) => (
          <div key={field}>
            <Input
              label={label}
              value={draft[field as keyof ProductDraftInput] as string}
              onChange={(event) =>
                setDraft((current) => ({ ...current, [field]: event.target.value }))
              }
            />
          </div>
        ))}
        <div className="flex items-center gap-3 pt-7">
          <input
            id="available"
            type="checkbox"
            checked={draft.available}
            onChange={(event) =>
              setDraft((current) => ({ ...current, available: event.target.checked }))
            }
          />
          <label htmlFor="available" className="text-sm text-text-primary">
            Disponible para venta
          </label>
        </div>
      </div>

      {formError ? <p className="mt-4 text-sm text-danger">{formError}</p> : null}

      <div className="mt-6 flex justify-end gap-3">
        <Button variant="ghost" size="sm" href="/dashboard/products">
          Cancelar
        </Button>
        <Button
          variant="primary"
          size="sm"
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
        >
          {saveMutation.isPending ? "Guardando..." : "Guardar"}
        </Button>
      </div>
    </>
  );
}

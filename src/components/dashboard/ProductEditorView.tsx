"use client";

import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { ImagePlus } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PRODUCTS_KEY, useProducts } from "@/components/dashboard/ProductsView";
import { runOperationOrThrow } from "@/lib/operations";
import {
  PHOTO_TYPES,
  photoProblem,
  priceInput,
  stockInput,
  uploadProductPhoto,
  type Product,
} from "@/lib/products";

/** A new Product when `productCode` is absent; that Product otherwise. */
export function ProductEditorView({ productCode }: { productCode?: string }) {
  const query = useProducts();

  if (!productCode) {
    return <ProductForm />;
  }
  if (query.isLoading) {
    return <div className="h-96 animate-pulse rounded-xl bg-bg-elevated" />;
  }
  const product = query.data?.find((candidate) => candidate.code === productCode);
  if (!product) {
    return (
      <Card>
        <p className="text-sm text-text-secondary">
          {query.error instanceof Error ? query.error.message : "Ese producto no existe."}
        </p>
        <Button variant="ghost" size="sm" href="/dashboard/products" className="mt-4">
          Volver a productos
        </Button>
      </Card>
    );
  }
  return <ProductForm key={product.code} product={product} />;
}

function ProductForm({ product }: { product?: Product }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [name, setName] = useState(product?.name ?? "");
  const [price, setPrice] = useState(product ? Number(product.unit_price).toFixed(2) : "");
  const [stock, setStock] = useState(product ? String(product.stock) : "");
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(product?.signed_url ?? null);

  // A local preview holds the file in memory until it is released.
  useEffect(
    () => () => {
      if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview);
    },
    [preview],
  );

  const unitPrice = priceInput(price);
  const counted = stockInput(stock);
  const reserved = product?.reserved ?? 0;
  const stockError =
    stock && counted === null
      ? "Escribe un número entero."
      : counted !== null && counted < reserved
        ? `Hay ${reserved} reservados en pedidos; no puede haber menos.`
        : undefined;
  const ready =
    name.trim().length > 0 &&
    unitPrice !== null &&
    counted !== null &&
    !stockError &&
    (product !== undefined || photo !== null);

  const save = useMutation({
    mutationFn: async () => {
      if (unitPrice === null || counted === null) return;
      const photoCode = photo ? await uploadProductPhoto(photo) : null;
      if (!product) {
        if (!photoCode) return;
        await runOperationOrThrow("add_product", {
          name: name.trim(),
          unit_price: unitPrice,
          stock: counted,
          photo_upload_code: photoCode,
        });
        return;
      }
      const code = product.code;
      if (name.trim() !== product.name) {
        await runOperationOrThrow("rename_product", { product_code: code, name: name.trim() });
      }
      if (unitPrice !== Number(product.unit_price).toFixed(2)) {
        await runOperationOrThrow("change_price", { product_code: code, unit_price: unitPrice });
      }
      if (counted !== product.stock) {
        await runOperationOrThrow("count_stock", { product_code: code, stock: counted });
      }
      if (photoCode) {
        await runOperationOrThrow("change_product_photo", {
          product_code: code,
          photo_upload_code: photoCode,
        });
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: PRODUCTS_KEY });
      toast.success(product ? "Cambios guardados." : "Producto creado.");
      router.push("/dashboard/products");
    },
    onError: async (error) => {
      // Some changes may have gone through before the one that failed.
      await queryClient.invalidateQueries({ queryKey: PRODUCTS_KEY });
      toast.error(error instanceof Error ? error.message : "No se pudo guardar.");
    },
  });

  const archive = useMutation({
    mutationFn: () =>
      runOperationOrThrow(product?.archived ? "restore_product" : "archive_product", {
        product_code: product?.code,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: PRODUCTS_KEY });
      toast.success(product?.archived ? "Producto de vuelta a la venta." : "Producto archivado.");
      router.push("/dashboard/products");
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "No se pudo cambiar el producto."),
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">{product ? product.name : "Nuevo producto"}</h1>
        <p className="mt-0.5 text-sm text-text-secondary">
          {product?.archived
            ? "Archivado: el bot no lo ofrece. Restáuralo para volver a venderlo."
            : "El bot lo ofrece por WhatsApp con esta foto, nombre y precio."}
        </p>
      </div>

      <Card>
        <form
          className="grid gap-6 md:grid-cols-[240px_1fr]"
          onSubmit={(event) => {
            event.preventDefault();
            if (ready) save.mutate();
          }}
        >
          <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden rounded-xl border border-dashed border-border bg-bg-elevated text-sm text-text-secondary hover:border-white/20">
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element -- a local preview or a signed link
              <img src={preview} alt="Foto del producto" className="h-full w-full object-cover" />
            ) : (
              <>
                <ImagePlus size={28} />
                Elegir foto
              </>
            )}
            <input
              type="file"
              accept={PHOTO_TYPES.join(",")}
              aria-label="Foto"
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (!file) return;
                const problem = photoProblem(file);
                if (problem) {
                  toast.error(problem);
                  return;
                }
                setPhoto(file);
                setPreview(URL.createObjectURL(file));
              }}
            />
          </label>

          <div className="flex flex-col gap-4">
            <Input label="Nombre" value={name} onChange={(event) => setName(event.target.value)} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Precio"
                inputMode="decimal"
                value={price}
                onChange={(event) => setPrice(event.target.value)}
                placeholder="25.00"
                error={price && unitPrice === null ? "Escribe un precio, como 25.50." : undefined}
              />
              <Input
                label={product ? "Stock contado" : "Stock"}
                inputMode="numeric"
                value={stock}
                onChange={(event) => setStock(event.target.value)}
                placeholder="10"
                error={stockError}
              />
            </div>
            {product && reserved > 0 && (
              <p className="text-xs text-text-secondary">
                Cuenta todo lo que hay en el estante: {reserved} de esas unidades ya están
                reservadas para pedidos sin entregar.
              </p>
            )}
            {!product && !photo && (
              <p className="text-xs text-text-secondary">
                La foto es obligatoria: el bot muestra los productos con ella.
              </p>
            )}

            <div className="mt-2 flex flex-wrap justify-between gap-3">
              {product ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={archive.isPending || save.isPending}
                  onClick={() => {
                    if (
                      product.archived ||
                      confirm("¿Archivar este producto? El bot dejará de ofrecerlo.")
                    ) {
                      archive.mutate();
                    }
                  }}
                >
                  {product.archived ? "Restaurar" : "Archivar"}
                </Button>
              ) : (
                <span />
              )}
              <div className="flex gap-3">
                <Button variant="ghost" size="sm" href="/dashboard/products">
                  Cancelar
                </Button>
                <Button type="submit" size="sm" disabled={!ready || save.isPending}>
                  {save.isPending ? "Guardando..." : product ? "Guardar cambios" : "Crear producto"}
                </Button>
              </div>
            </div>
          </div>
        </form>
      </Card>
    </div>
  );
}

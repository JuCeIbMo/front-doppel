"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { ImageOff, Plus } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { readApi } from "@/lib/operations";
import type { Product } from "@/lib/products";
import { useCurrency } from "@/hooks/useCurrency";

export const PRODUCTS_KEY = ["products"];

export function useProducts() {
  return useQuery({
    queryKey: PRODUCTS_KEY,
    queryFn: () => readApi<Product[]>("/dashboard/products"),
  });
}

/** The catalog the bot sells from, and the archived Products the Owner can bring back. */
export function ProductsView() {
  const { format } = useCurrency();
  const [showArchived, setShowArchived] = useState(false);
  const query = useProducts();


  const products = (query.data ?? []).filter((product) => product.archived === showArchived);
  const archivedCount = (query.data ?? []).filter((product) => product.archived).length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1>Productos</h1>
          <p className="mt-0.5 text-sm text-text-secondary">
            Lo que el bot ofrece por WhatsApp. Un producto archivado deja de ofrecerse y sigue en
            tus ventas pasadas.
          </p>
        </div>
        <Button size="sm" href="/dashboard/products/new">
          <Plus size={16} className="mr-1.5" />
          Nuevo producto
        </Button>
      </div>

      <div className="flex gap-2">
        {[
          { archived: false, label: "En venta" },
          { archived: true, label: `Archivados (${archivedCount})` },
        ].map((tab) => (
          <button
            key={tab.label}
            type="button"
            onClick={() => setShowArchived(tab.archived)}
            className={`inline-flex min-h-11 items-center border-2 px-4 text-sm font-bold transition-colors ${
              showArchived === tab.archived
                ? "border-ink bg-ink text-paper"
                : "border-ink/30 text-ink hover:border-ink"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {query.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((index) => (
            <div key={index} className="h-64 animate-pulse bg-bg-elevated" />
          ))}
        </div>
      ) : query.error ? (
        <Card>
          <p className="text-sm text-danger">
            {query.error instanceof Error ? query.error.message : "No se pudo cargar."}
          </p>
        </Card>
      ) : products.length === 0 ? (
        <Card>
          <p className="text-sm text-text-secondary">
            {showArchived
              ? "No tienes productos archivados."
              : "Todavía no hay productos. Crea el primero o mándale una foto a tu asistente por WhatsApp."}
          </p>
        </Card>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <li key={product.code}>
              <Link
                href={`/dashboard/products/${product.code}`}
                className="block overflow-hidden border border-border bg-bg-secondary transition-colors hover:border-ink/40"
              >
                <div className="flex aspect-[4/3] items-center justify-center bg-bg-elevated">
                  {product.signed_url ? (
                    // eslint-disable-next-line @next/next/no-img-element -- a signed, expiring link
                    <img
                      src={product.signed_url}
                      alt={product.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <ImageOff size={28} className="text-text-muted" aria-label="Sin foto" />
                  )}
                </div>
                <div className="flex flex-col gap-1 p-4">
                  <p className="font-medium">{product.name}</p>
                  <p className="font-hand text-xl font-bold text-steps">{format(Number(product.unit_price))}</p>
                  <p className="text-sm text-text-secondary">
                    {product.stock - product.reserved <= 0 ? (
                      <span className="bg-money px-1.5 font-bold text-ink">Sin stock</span>
                    ) : (
                      `Disponible ${product.stock - product.reserved}`
                    )}
                    {product.reserved > 0 && ` · ${product.reserved} reservados`}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

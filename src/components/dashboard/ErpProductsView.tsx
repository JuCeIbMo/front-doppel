"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Pagination } from "@/components/ui/Pagination";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Table } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { CardHeader } from "@/components/ui/Card";
import { apiFetch, apiRequest, ApiError, getBrowserSessionStore } from "@/lib/api-client";
import { clearToken } from "@/lib/auth";
import { useCurrency } from "@/hooks/useCurrency";
import { usePagination } from "@/hooks/usePagination";
import type { ErpProduct, ImportResult } from "@/lib/erp-types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

async function getProducts(search: string, limit: number, offset: number) {
  const query = new URLSearchParams();
  query.set("limit", String(limit));
  query.set("offset", String(offset));
  if (search.trim()) {
    query.set("search", search.trim());
  }

  return apiFetch<ErpProduct[]>(`/erp/products?${query.toString()}`, {
    baseUrl: API_URL,
    session: getBrowserSessionStore(),
  });
}

export function ErpProductsView() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { format } = useCurrency();
  const [search, setSearch] = useState("");
  const [barcodeLookup, setBarcodeLookup] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const { page, limit, offset, nextPage, prevPage, reset } = usePagination();

  const query = useQuery({
    queryKey: ["erp-products", search, { offset, limit }],
    queryFn: () => getProducts(search, limit, offset),
  });

  const deleteMutation = useMutation({
    mutationFn: async (productId: string) => {
      await apiRequest(`/erp/products/${productId}`, {
        baseUrl: API_URL,
        session: getBrowserSessionStore(),
        method: "DELETE",
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["erp-products"] });
      toast.success("Producto eliminado.");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "No se pudo eliminar el producto.");
    },
  });

  const barcodeMutation = useMutation({
    mutationFn: async (code: string) => {
      return apiFetch<ErpProduct>(`/erp/products/barcode/${encodeURIComponent(code)}`, {
        baseUrl: API_URL,
        session: getBrowserSessionStore(),
      });
    },
    onSuccess: (product) => {
      router.push(`/dashboard/products/${product.id}`);
    },
    onError: (error) => {
      if (error instanceof ApiError && error.status === 404) {
        router.push(`/dashboard/products/new?barcode=${encodeURIComponent(barcodeLookup.trim())}`);
        return;
      }
      toast.error(error instanceof Error ? error.message : "No se pudo buscar el código.");
    },
  });

  const importMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      return apiFetch<ImportResult>("/erp/products/import", {
        baseUrl: API_URL,
        session: getBrowserSessionStore(),
        method: "POST",
        body: formData,
      });
    },
    onSuccess: async (result) => {
      setImportResult(result);
      setSelectedFile(null);
      await queryClient.invalidateQueries({ queryKey: ["erp-products"] });
      toast.success(`Importación completa: ${result.imported} productos.`);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "No se pudo importar el archivo.");
    },
  });

  if (query.error instanceof ApiError && query.error.status === 401) {
    clearToken();
    router.replace("/connect");
    return null;
  }

  const products = query.data ?? [];
  const hasMore = products.length === limit;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Productos</h1>
          <p className="mt-0.5 text-sm text-text-secondary">Catálogo de productos del ERP.</p>
        </div>
        <Button variant="primary" size="sm" href="/dashboard/products/new">
          Nuevo producto
        </Button>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_0.8fr]">
        <Card>
          <CardHeader title="Buscar" />
          <div className="flex flex-col gap-4">
            <Input
              label="Por nombre o SKU"
              type="search"
              value={search}
              onChange={(e) => { setSearch(e.target.value); reset(); }}
              placeholder="Nombre, SKU o código"
            />
            <div className="flex gap-3">
              <Input
                label="Por código de barras"
                type="text"
                value={barcodeLookup}
                onChange={(e) => setBarcodeLookup(e.target.value)}
                placeholder="Ingresá el código"
                className="flex-1"
              />
              <Button
                variant="secondary"
                size="sm"
                className="self-end"
                onClick={() => {
                  const code = barcodeLookup.trim();
                  if (!code) return;
                  barcodeMutation.mutate(code);
                }}
                disabled={barcodeMutation.isPending}
              >
                Buscar
              </Button>
            </div>
          </div>
        </Card>

        <Card>
          <h2 className="text-lg font-medium">Importar catálogo</h2>
          <p className="mt-2 text-sm text-text-secondary">
            Descargá la plantilla, completala y subila al backend ERP.
          </p>

          <div className="mt-4 flex flex-wrap gap-3">
            <Button
              variant="secondary"
              className="px-5 py-3 text-sm"
              onClick={async () => {
                try {
                  const response = await apiRequest("/erp/products/import/template", {
                    baseUrl: API_URL,
                    session: getBrowserSessionStore(),
                    method: "GET",
                  });
                  const blob = await response.blob();
                  const url = window.URL.createObjectURL(blob);
                  const link = document.createElement("a");
                  link.href = url;
                  link.download = "erp-product-template.xlsx";
                  link.click();
                  window.URL.revokeObjectURL(url);
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : "No se pudo descargar la plantilla.");
                }
              }}
            >
              Descargar template
            </Button>
            <label className="inline-flex cursor-pointer items-center rounded-lg border border-border bg-bg-elevated px-4 py-2.5 text-sm text-text-primary">
              <input
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
              />
              {selectedFile ? selectedFile.name : "Seleccionar archivo"}
            </label>
            <Button
              variant="primary"
              className="px-5 py-3 text-sm"
              onClick={() => {
                if (!selectedFile) return;
                importMutation.mutate(selectedFile);
              }}
              disabled={!selectedFile || importMutation.isPending}
            >
              {importMutation.isPending ? "Importando..." : "Subir importación"}
            </Button>
          </div>

          {importResult ? (
            <div className="mt-4 rounded-2xl border border-white/8 bg-white/4 px-4 py-4">
              <p className="font-medium">Importados: {importResult.imported}</p>
              <p className="mt-1 text-sm text-text-secondary">
                Errores: {importResult.errors?.length ?? 0}
              </p>
            </div>
          ) : null}
        </Card>
      </div>

      <Card>
        <CardHeader title="Catálogo" />
        {query.isLoading ? (
          <Table>
            <Table.Loading rows={5} cols={6} />
          </Table>
        ) : query.error ? (
          <p className="text-sm text-danger">
            {query.error instanceof Error ? query.error.message : "No se pudo cargar productos."}
          </p>
        ) : products.length === 0 ? (
          <Table>
            <Table.Empty>No hay productos ERP cargados todavía.</Table.Empty>
          </Table>
        ) : (
          <Table>
            <Table.Head>
              <tr>
                <Table.Th>Nombre</Table.Th>
                <Table.Th>Categoría</Table.Th>
                <Table.Th>Precio</Table.Th>
                <Table.Th>Stock</Table.Th>
                <Table.Th>Estado</Table.Th>
                <Table.Th className="text-right">Acciones</Table.Th>
              </tr>
            </Table.Head>
            <Table.Body>
              {products.map((product) => (
                <Table.Row key={product.id}>
                  <Table.Cell>
                    <p className="font-medium text-text-primary">{product.name}</p>
                    <p className="text-xs text-text-muted mt-0.5">
                      {product.sku || product.barcode || "Sin SKU"}
                    </p>
                  </Table.Cell>
                  <Table.Cell className="text-text-secondary">
                    {product.category || "—"}
                  </Table.Cell>
                  <Table.Cell className="text-text-primary">{format(product.price)}</Table.Cell>
                  <Table.Cell className="text-text-primary">
                    {product.stock ?? "—"} {product.unit}
                  </Table.Cell>
                  <Table.Cell>
                    <Badge variant={product.available ? "success" : "neutral"}>
                      {product.available ? "Disponible" : "Oculto"}
                    </Badge>
                  </Table.Cell>
                  <Table.Cell className="text-right">
                    <div className="inline-flex gap-3">
                      <Link
                        href={`/dashboard/products/${product.id}`}
                        className="text-sm text-text-secondary hover:text-text-primary transition-colors"
                      >
                        Editar
                      </Link>
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`Eliminar "${product.name}"?`)) {
                            deleteMutation.mutate(product.id);
                          }
                        }}
                        className="text-sm text-danger hover:brightness-110 transition-colors"
                      >
                        Eliminar
                      </button>
                    </div>
                  </Table.Cell>
                </Table.Row>
              ))}
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
    </div>
  );
}

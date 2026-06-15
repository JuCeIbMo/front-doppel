"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { apiFetch, ApiError, getBrowserSessionStore } from "@/lib/api-client";
import { clearToken } from "@/lib/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

async function getCategories() {
  return apiFetch<string[]>("/erp/finance/categories", {
    baseUrl: API_URL,
    session: getBrowserSessionStore(),
  });
}

export function ErpSettingsView() {
  const router = useRouter();

  // Categories query
  const categoriesQuery = useQuery({
    queryKey: ["settings-categories"],
    queryFn: getCategories,
  });

  if (categoriesQuery.error instanceof ApiError && categoriesQuery.error.status === 401) {
    clearToken();
    router.replace("/connect");
    return null;
  }

  const categories = categoriesQuery.data ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Configuración</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Gestión de categorías financieras.
        </p>
      </div>

      {/* Categories section */}
      <Card>
        <CardHeader title="Categorías financieras" />
        <p className="mt-2 text-sm text-text-secondary">
          Las categorías se generan automáticamente a partir de las transacciones registradas.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          {categoriesQuery.isLoading ? (
            <p className="text-sm text-text-secondary">Cargando...</p>
          ) : categories.length === 0 ? (
            <p className="text-sm text-text-secondary">
              Sin categorías. Se crean al registrar transacciones.
            </p>
          ) : (
            categories.map((category) => (
              <Badge key={category} variant="neutral">
                {category}
              </Badge>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}

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
import { normalizeActivityItems } from "@/lib/erp-insights";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

async function getActivity(limit: number, offset: number) {
  return apiFetch<unknown>(`/erp/activity?limit=${limit}&offset=${offset}`, {
    baseUrl: API_URL,
    session: getBrowserSessionStore(),
  });
}

async function getAiActivity(limit: number, offset: number) {
  return apiFetch<unknown>(`/erp/activity/ai?limit=${limit}&offset=${offset}`, {
    baseUrl: API_URL,
    session: getBrowserSessionStore(),
  });
}

export function ErpActivityView() {
  const router = useRouter();
  const [mode, setMode] = useState<"all" | "ai">("all");
  const { page, limit, offset, nextPage, prevPage, reset } = usePagination();

  const activityQuery = useQuery({
    queryKey: ["erp-activity", { offset, limit }],
    queryFn: () => getActivity(limit, offset),
  });
  const aiActivityQuery = useQuery({
    queryKey: ["erp-activity-ai", { offset, limit }],
    queryFn: () => getAiActivity(limit, offset),
  });

  const activeQuery = mode === "all" ? activityQuery : aiActivityQuery;
  if (activeQuery.error instanceof ApiError && activeQuery.error.status === 401) {
    clearToken();
    router.replace("/connect");
    return null;
  }

  const items = normalizeActivityItems(activeQuery.data);
  const hasMore = items.length === limit;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Bitácora</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Feed defensivo de actividad humana y de IA.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => { setMode("all"); reset(); }}
            className={`rounded-2xl px-4 py-2 text-sm ${mode === "all" ? "bg-accent/15 text-accent" : "text-text-secondary hover:text-text-primary"}`}
          >
            Todo
          </button>
          <button
            type="button"
            onClick={() => { setMode("ai"); reset(); }}
            className={`rounded-2xl px-4 py-2 text-sm ${mode === "ai" ? "bg-accent/15 text-accent" : "text-text-secondary hover:text-text-primary"}`}
          >
            Solo IA
          </button>
        </div>
      </div>

      <Card>
        {activeQuery.isLoading ? (
          <div className="space-y-3">
            <div className="h-16 animate-pulse rounded-2xl bg-white/5" />
            <div className="h-16 animate-pulse rounded-2xl bg-white/5" />
          </div>
        ) : activeQuery.error ? (
          <p className="text-sm text-red-400">
            {activeQuery.error instanceof Error
              ? activeQuery.error.message
              : "No se pudo cargar la bitácora."}
          </p>
        ) : items.length > 0 ? (
          <div className="space-y-3">
            {items.map((item) => (
              <div key={item.id} className="rounded-2xl border border-white/8 bg-white/4 px-4 py-4">
                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div>
                    {item.entityId ? (
                      <Link
                        href={guessEntityHref(item.entityId)}
                        className="font-medium transition-colors hover:text-accent"
                      >
                        {item.title}
                      </Link>
                    ) : (
                      <p className="font-medium">{item.title}</p>
                    )}
                    <p className="mt-1 text-sm text-text-secondary">{item.subtitle}</p>
                  </div>
                  <p className="text-xs text-text-secondary">
                    {new Date(item.timestamp).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div>
            <p className="text-sm text-text-secondary">
              Sin shape reconocible. Se muestra el payload crudo para diagnóstico.
            </p>
            <pre className="mt-3 overflow-auto rounded-2xl bg-white/5 p-4 text-xs text-text-secondary">
              {JSON.stringify(activeQuery.data ?? null, null, 2)}
            </pre>
          </div>
        )}
      </Card>
      <Pagination
        page={page}
        onPrev={prevPage}
        onNext={nextPage}
        hasPrev={page > 0}
        hasMore={hasMore}
        isLoading={activeQuery.isLoading}
      />
    </div>
  );
}

function guessEntityHref(entityId: string): string {
  if (entityId.startsWith("sale")) return `/dashboard/sales/${entityId}`;
  if (entityId.startsWith("prod")) return `/dashboard/products/${entityId}`;
  if (entityId.startsWith("client")) return `/dashboard/clients/${entityId}`;
  return "/dashboard/activity";
}

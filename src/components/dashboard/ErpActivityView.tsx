"use client";

import Link from "next/link";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Pagination } from "@/components/ui/Pagination";
import { apiFetch, ApiError, getBrowserSessionStore } from "@/lib/api-client";
import { clearToken } from "@/lib/auth";
import { usePagination } from "@/hooks/usePagination";
import { normalizeActivityItems } from "@/lib/erp-insights";
import { buildEntityHref } from "@/lib/erp-links";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

function buildActivityUrl(limit: number, offset: number, from: string, to: string): string {
  const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  return `/erp/activity?${params}`;
}

function buildAiActivityUrl(limit: number, offset: number, from: string, to: string): string {
  const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  return `/erp/activity/ai?${params}`;
}

async function getActivity(limit: number, offset: number, from: string, to: string) {
  return apiFetch<unknown[]>(buildActivityUrl(limit, offset, from, to), {
    baseUrl: API_URL,
    session: getBrowserSessionStore(),
  });
}

async function getAiActivity(limit: number, offset: number, from: string, to: string) {
  return apiFetch<unknown[]>(buildAiActivityUrl(limit, offset, from, to), {
    baseUrl: API_URL,
    session: getBrowserSessionStore(),
  });
}

export function ErpActivityView() {
  const router = useRouter();
  const [mode, setMode] = useState<"all" | "ai">("all");
  const [moduleFilter, setModuleFilter] = useState<string>("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const { page, limit, offset, nextPage, prevPage, reset } = usePagination();

  const activityQuery = useQuery({
    queryKey: ["erp-activity", { offset, limit, fromDate, toDate }],
    queryFn: () => getActivity(limit, offset, fromDate, toDate),
    enabled: mode === "all",
  });
  const aiActivityQuery = useQuery({
    queryKey: ["erp-activity-ai", { offset, limit, fromDate, toDate }],
    queryFn: () => getAiActivity(limit, offset, fromDate, toDate),
    enabled: mode === "ai",
  });

  const activeQuery = mode === "all" ? activityQuery : aiActivityQuery;

  const items = normalizeActivityItems(activeQuery.data);
  const hasMore = (activeQuery.data?.length ?? 0) === limit;

  const allModules = useMemo(
    () =>
      Array.from(
        new Set(items.map((i) => i.module).filter((m): m is string => Boolean(m))),
      ),
    [items],
  );

  const filteredItems = moduleFilter
    ? items.filter((item) => item.module === moduleFilter)
    : items;

  const hasActiveFilters = Boolean(moduleFilter || fromDate || toDate);

  if (activeQuery.error instanceof ApiError && activeQuery.error.status === 401) {
    clearToken();
    router.replace("/connect");
    return null;
  }

  function handleResetFilters() {
    setModuleFilter("");
    setFromDate("");
    setToDate("");
    reset();
  }

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
            onClick={() => {
              setMode("all");
              reset();
            }}
            className={`rounded-2xl px-4 py-2 text-sm ${mode === "all" ? "bg-accent/15 text-accent" : "text-text-secondary hover:text-text-primary"}`}
          >
            Todo
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("ai");
              reset();
            }}
            className={`rounded-2xl px-4 py-2 text-sm ${mode === "ai" ? "bg-accent/15 text-accent" : "text-text-secondary hover:text-text-primary"}`}
          >
            Solo IA
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-text-secondary">Desde</label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => {
              setFromDate(e.target.value);
              reset();
            }}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-text-secondary">Hasta</label>
          <input
            type="date"
            value={toDate}
            onChange={(e) => {
              setToDate(e.target.value);
              reset();
            }}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>
        {allModules.length > 0 && (
          <div className="flex flex-col gap-1">
            <label className="text-xs text-text-secondary">Módulo</label>
            <select
              value={moduleFilter}
              onChange={(e) => setModuleFilter(e.target.value)}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
            >
              <option value="">Todos los módulos</option>
              {allModules.map((mod) => (
                <option key={mod} value={mod}>
                  {mod}
                </option>
              ))}
            </select>
          </div>
        )}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={handleResetFilters}
            className="rounded-xl border border-white/10 px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary"
          >
            Limpiar filtros
          </button>
        )}
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
        ) : filteredItems.length > 0 ? (
          <div className="space-y-3">
            {filteredItems.map((item) => {
              const href =
                buildEntityHref(item.entity_type, item.entity_id) ??
                (item.entityId ? guessEntityHref(item.entityId) : null);
              return (
                <div
                  key={item.id}
                  className="rounded-2xl border border-white/8 bg-white/4 px-4 py-4"
                >
                  <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                    <div className="flex items-start gap-2">
                      <span className="mt-0.5 text-base" aria-hidden="true">
                        {item.isAi ? "🤖" : "👤"}
                      </span>
                      <div>
                        {href ? (
                          <Link
                            href={href}
                            className="font-medium transition-colors hover:text-accent"
                          >
                            {item.title}
                          </Link>
                        ) : (
                          <p className="font-medium">{item.title}</p>
                        )}
                        {item.subtitle && (
                          <p className="mt-1 text-sm text-text-secondary">{item.subtitle}</p>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-text-secondary">
                      {item.timestamp ? new Date(item.timestamp).toLocaleString() : ""}
                    </p>
                  </div>
                </div>
              );
            })}
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

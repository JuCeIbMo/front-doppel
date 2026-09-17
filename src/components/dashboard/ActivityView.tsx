"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ApiError } from "@/lib/api-client";
import { formatDateTime } from "@/lib/dates";
import { operationLabel } from "@/lib/operation-labels";
import { readApi } from "@/lib/operations";
import { signOut } from "@/lib/supabase";

/** One row of `GET /dashboard/operations`. */
export interface LoggedOperation {
  id: string;
  operation: string;
  actor: { kind: "owner" | "public_agent" | "system" };
  status: "executed" | "rejected" | "approval_created";
  rejection_code: string | null;
  created_at: string;
}

type ActorFilter = "all" | "owner" | "public_agent" | "system";

const ACTORS: Array<{ id: ActorFilter; label: string }> = [
  { id: "all", label: "Todo" },
  { id: "owner", label: "Tú" },
  { id: "public_agent", label: "Bot con clientes" },
  { id: "system", label: "Automático" },
];

const ACTOR_ICON: Record<LoggedOperation["actor"]["kind"], string> = {
  owner: "👤",
  public_agent: "🤖",
  system: "⚙️",
};

const STATUS: Record<LoggedOperation["status"], { label: string; variant: "success" | "danger" | "warning" }> = {
  executed: { label: "Hecho", variant: "success" },
  rejected: { label: "Rechazado", variant: "danger" },
  approval_created: { label: "Esperando aprobación", variant: "warning" },
};

function pageUrl(before: string | null): string {
  return before ? `/dashboard/operations?${new URLSearchParams({ before })}` : "/dashboard/operations";
}

/** Everything that happened in the Business, newest first, a page at a time. */
export function ActivityView() {
  const router = useRouter();
  const [actor, setActor] = useState<ActorFilter>("all");
  const query = useInfiniteQuery({
    queryKey: ["operation-log"],
    queryFn: ({ pageParam }) => readApi<LoggedOperation[]>(pageUrl(pageParam)),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.at(-1)?.created_at ?? null,
  });

  if (query.error instanceof ApiError && query.error.status === 401) {
    void signOut();
    router.replace("/connect");
    return null;
  }

  const rows = (query.data?.pages ?? []).flat();
  const visible = actor === "all" ? rows : rows.filter((row) => row.actor.kind === actor);
  const lastPage = query.data?.pages.at(-1);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-xl font-semibold">Bitácora</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Todo lo que pasó en tu negocio: lo que hiciste tú, el bot con tus clientes y lo automático.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {ACTORS.map((option) => (
            <Button
              key={option.id}
              variant="ghost"
              size="sm"
              onClick={() => setActor(option.id)}
              className={actor === option.id ? "text-accent bg-accent/10" : ""}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      <Card>
        <CardHeader title="Actividad" />
        {query.isLoading ? (
          <div className="space-y-3">
            <div className="h-16 animate-pulse rounded-lg bg-bg-elevated" />
            <div className="h-16 animate-pulse rounded-lg bg-bg-elevated" />
          </div>
        ) : query.error ? (
          <p className="text-sm text-danger">
            {query.error instanceof Error ? query.error.message : "No se pudo cargar la bitácora."}
          </p>
        ) : visible.length === 0 ? (
          <p className="text-sm text-text-secondary">Todavía no hay actividad.</p>
        ) : (
          <div className="space-y-3">
            {visible.map((row) => (
              <div key={row.id} className="rounded-lg border border-border bg-bg-elevated/40 px-4 py-3">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-center gap-2">
                    <span aria-hidden="true">{ACTOR_ICON[row.actor.kind]}</span>
                    <p className="font-medium">{operationLabel(row.operation)}</p>
                    <Badge variant={STATUS[row.status].variant} className="text-[10px]">
                      {STATUS[row.status].label}
                    </Badge>
                  </div>
                  <p className="text-xs text-text-secondary">
                    {formatDateTime(row.created_at)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {lastPage && lastPage.length > 0 && (
        <div className="flex justify-center">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => query.fetchNextPage()}
            disabled={query.isFetchingNextPage}
          >
            {query.isFetchingNextPage ? "Cargando..." : "Cargar más"}
          </Button>
        </div>
      )}
    </div>
  );
}

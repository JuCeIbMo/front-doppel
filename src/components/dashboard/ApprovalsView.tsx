"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ApiError } from "@/lib/api-client";
import { operationLabel } from "@/lib/operation-labels";
import { answerApproval, readApi } from "@/lib/operations";
import { signOut } from "@/lib/supabase";

/** One row of `GET /dashboard/approvals`: a change waiting for the Owner's yes or no. */
export interface PendingApproval {
  id: string;
  operation: string;
  payload: Record<string, unknown>;
  requested_by: { kind?: string };
  reason: string;
  created_at: string;
  expires_at: string;
}

const REQUESTER: Record<string, string> = {
  owner: "Tú o tu agente",
  public_agent: "El bot, hablando con un cliente",
  system: "Doppel",
};

export function ApprovalsView() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["approvals"],
    queryFn: () => readApi<PendingApproval[]>("/dashboard/approvals"),
  });
  const answer = useMutation({
    mutationFn: async ({ id, choice }: { id: string; choice: "approve" | "decline" }) => {
      const result = await answerApproval(id, choice);
      if (result.status === "rejected") throw new Error(result.message);
      return choice;
    },
    onSuccess: async (choice) => {
      await queryClient.invalidateQueries({ queryKey: ["approvals"] });
      toast.success(choice === "approve" ? "Aprobado." : "Rechazado.");
    },
    onError: async (error) => {
      await queryClient.invalidateQueries({ queryKey: ["approvals"] });
      toast.error(error instanceof Error ? error.message : "No se pudo responder.");
    },
  });

  if (query.error instanceof ApiError && query.error.status === 401) {
    void signOut();
    router.replace("/connect");
    return null;
  }

  const pending = query.data ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Aprobaciones</h1>
        <p className="mt-0.5 text-sm text-text-secondary">
          Cambios delicados que esperan tu sí o tu no antes de hacerse.
        </p>
      </div>

      <Card>
        <CardHeader title="Pendientes" />
        {query.isLoading ? (
          <div className="h-16 animate-pulse rounded-lg bg-bg-elevated" />
        ) : query.error ? (
          <p className="text-sm text-danger">
            {query.error instanceof Error ? query.error.message : "No se pudo cargar."}
          </p>
        ) : pending.length === 0 ? (
          <p className="text-sm text-text-secondary">No hay nada esperando tu aprobación.</p>
        ) : (
          <div className="space-y-3">
            {pending.map((approval) => (
              <div key={approval.id} className="rounded-lg border border-border bg-bg-elevated/40 px-4 py-3">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="font-medium">{operationLabel(approval.operation)}</p>
                    <p className="mt-1 text-sm text-text-secondary">{approval.reason}</p>
                    <p className="mt-1 text-xs text-text-muted">
                      Pedido por: {REQUESTER[approval.requested_by.kind ?? ""] ?? "Desconocido"} · vence{" "}
                      {new Date(approval.expires_at).toLocaleString()}
                    </p>
                    <pre className="mt-2 overflow-auto rounded bg-bg-elevated p-2 text-xs text-text-secondary">
                      {JSON.stringify(approval.payload, null, 2)}
                    </pre>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="primary"
                      size="sm"
                      disabled={answer.isPending}
                      onClick={() => answer.mutate({ id: approval.id, choice: "approve" })}
                    >
                      Aprobar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={answer.isPending}
                      onClick={() => answer.mutate({ id: approval.id, choice: "decline" })}
                    >
                      Rechazar
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

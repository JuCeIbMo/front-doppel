"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Pagination } from "@/components/ui/Pagination";
import { apiFetch, ApiError, getBrowserSessionStore } from "@/lib/api-client";
import { clearToken } from "@/lib/auth";
import { useCurrency } from "@/hooks/useCurrency";
import { usePagination } from "@/hooks/usePagination";
import type { ClientResponse } from "@/lib/erp-types";
import { buildClientPayload, type ClientDraftInput } from "@/lib/erp-entities";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

const emptyDraft: ClientDraftInput = {
  name: "",
  phone: "",
  email: "",
  address: "",
  notes: "",
  tags: "",
  whatsapp_id: "",
};

async function getClients(limit: number, offset: number) {
  return apiFetch<ClientResponse[]>(`/erp/clients?limit=${limit}&offset=${offset}`, {
    baseUrl: API_URL,
    session: getBrowserSessionStore(),
  });
}

export function ErpClientsView() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { format } = useCurrency();
  const [draft, setDraft] = useState<ClientDraftInput>(emptyDraft);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const { page, limit, offset, nextPage, prevPage } = usePagination();
  const query = useQuery({
    queryKey: ["erp-clients", { offset, limit }],
    queryFn: () => getClients(limit, offset),
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = buildClientPayload(draft);
      if (editingId) {
        return apiFetch<ClientResponse>(`/erp/clients/${editingId}`, {
          baseUrl: API_URL,
          session: getBrowserSessionStore(),
          method: "PUT",
          body: JSON.stringify(payload),
        });
      }

      return apiFetch<ClientResponse>("/erp/clients", {
        baseUrl: API_URL,
        session: getBrowserSessionStore(),
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["erp-clients"] });
      toast.success(editingId ? "Cliente actualizado." : "Cliente creado.");
      setModalOpen(false);
      setEditingId(null);
      setDraft(emptyDraft);
      setFormError(null);
    },
    onError: (error) => {
      setFormError(error instanceof Error ? error.message : "No se pudo guardar el cliente.");
    },
  });

  if (query.error instanceof ApiError && query.error.status === 401) {
    clearToken();
    router.replace("/connect");
    return null;
  }

  const clients = query.data ?? [];
  const hasMore = clients.length === limit;

  function openCreateModal() {
    setEditingId(null);
    setDraft(emptyDraft);
    setFormError(null);
    setModalOpen(true);
  }

  function openEditModal(client: ClientResponse) {
    setEditingId(client.id);
    setDraft({
      name: client.name,
      phone: client.phone ?? "",
      email: client.email ?? "",
      address: client.address ?? "",
      notes: client.notes ?? "",
      tags: client.tags.join(", "),
      whatsapp_id: client.whatsapp_id ?? "",
    });
    setFormError(null);
    setModalOpen(true);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Clientes</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Base actual de clientes del ERP.
          </p>
        </div>
        <Button variant="primary" className="px-5 py-3 text-sm" onClick={openCreateModal}>
          Nuevo cliente
        </Button>
      </div>

      <Card>
        {query.isLoading ? (
          <div className="space-y-3">
            <div className="h-16 animate-pulse rounded-2xl bg-white/5" />
            <div className="h-16 animate-pulse rounded-2xl bg-white/5" />
          </div>
        ) : query.error ? (
          <p className="text-sm text-red-400">
            {query.error instanceof Error ? query.error.message : "No se pudo cargar clientes."}
          </p>
        ) : clients.length === 0 ? (
          <p className="text-sm text-text-secondary">Todavía no hay clientes registrados.</p>
        ) : (
          <div className="space-y-3">
            {clients.map((client) => (
              <div key={client.id} className="rounded-2xl border border-white/8 bg-white/4 px-4 py-4">
                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div>
                    <Link href={`/dashboard/clients/${client.id}`} className="font-medium hover:text-accent">
                      {client.name}
                    </Link>
                    <p className="mt-1 text-sm text-text-secondary">
                      {client.phone || "Sin teléfono"} {client.email ? `· ${client.email}` : ""}
                    </p>
                    <p className="mt-2 text-sm text-text-secondary">
                      {client.purchase_count} compras · última{" "}
                      {client.last_purchase_at
                        ? new Date(client.last_purchase_at).toLocaleDateString()
                        : "sin compras"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold">{format(client.total_purchases)}</p>
                    <button
                      type="button"
                      onClick={() => openEditModal(client)}
                      className="mt-3 text-sm text-text-secondary hover:text-text-primary"
                    >
                      Editar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
      <Pagination
        page={page}
        onPrev={prevPage}
        onNext={nextPage}
        hasPrev={page > 0}
        hasMore={hasMore}
        isLoading={query.isLoading}
      />

      {modalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="w-full max-w-2xl rounded-3xl border border-white/10 bg-bg-primary p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-xl font-semibold">
                {editingId ? "Editar cliente" : "Nuevo cliente"}
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-sm text-text-secondary hover:text-text-primary"
              >
                Cerrar
              </button>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {[
                ["name", "Nombre"],
                ["phone", "Teléfono"],
                ["email", "Email"],
                ["address", "Dirección"],
                ["tags", "Tags (coma separada)"],
                ["whatsapp_id", "WhatsApp ID"],
              ].map(([field, label]) => (
                <div key={field}>
                  <label className="block text-sm text-text-secondary">{label}</label>
                  <input
                    value={draft[field as keyof ClientDraftInput] as string}
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, [field]: event.target.value }))
                    }
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent/30"
                  />
                </div>
              ))}
              <div className="md:col-span-2">
                <label className="block text-sm text-text-secondary">Notas</label>
                <textarea
                  value={draft.notes}
                  onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))}
                  rows={3}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent/30"
                />
              </div>
            </div>

            {formError ? <p className="mt-4 text-sm text-red-400">{formError}</p> : null}

            <div className="mt-6 flex justify-end gap-3">
              <Button variant="ghost" className="px-5 py-3 text-sm" onClick={() => setModalOpen(false)}>
                Cancelar
              </Button>
              <Button
                variant="primary"
                className="px-5 py-3 text-sm"
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
              >
                {saveMutation.isPending ? "Guardando..." : "Guardar"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

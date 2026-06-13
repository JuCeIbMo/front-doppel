"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { CardHeader } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Table } from "@/components/ui/Table";
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
          <h1 className="text-xl font-semibold">Clientes</h1>
          <p className="mt-0.5 text-sm text-text-secondary">Base de clientes del ERP.</p>
        </div>
        <Button variant="primary" size="sm" onClick={openCreateModal}>
          Nuevo cliente
        </Button>
      </div>

      <Card>
        <CardHeader title="Clientes" />
        {query.isLoading ? (
          <Table>
            <Table.Loading rows={5} cols={5} />
          </Table>
        ) : query.error ? (
          <p className="text-sm text-danger">
            {query.error instanceof Error ? query.error.message : "No se pudo cargar clientes."}
          </p>
        ) : clients.length === 0 ? (
          <Table>
            <Table.Empty>Todavía no hay clientes registrados.</Table.Empty>
          </Table>
        ) : (
          <Table>
            <Table.Head>
              <tr>
                <Table.Th>Nombre</Table.Th>
                <Table.Th>Contacto</Table.Th>
                <Table.Th>Compras</Table.Th>
                <Table.Th>Total</Table.Th>
                <Table.Th className="text-right">Acciones</Table.Th>
              </tr>
            </Table.Head>
            <Table.Body>
              {clients.map((client) => (
                <Table.Row key={client.id}>
                  <Table.Cell>
                    <Link
                      href={`/dashboard/clients/${client.id}`}
                      className="font-medium text-text-primary hover:text-accent transition-colors"
                    >
                      {client.name}
                    </Link>
                  </Table.Cell>
                  <Table.Cell className="text-text-secondary text-xs">
                    {client.phone || "—"}{client.email ? ` · ${client.email}` : ""}
                  </Table.Cell>
                  <Table.Cell className="text-text-secondary">{client.purchase_count}</Table.Cell>
                  <Table.Cell className="text-text-primary font-semibold">
                    {format(client.total_purchases)}
                  </Table.Cell>
                  <Table.Cell className="text-right">
                    <button
                      type="button"
                      onClick={() => openEditModal(client)}
                      className="text-sm text-text-secondary hover:text-text-primary transition-colors"
                    >
                      Editar
                    </button>
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

      {modalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="w-full max-w-2xl rounded-xl border border-border bg-bg-secondary p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-4 mb-5">
              <h2 className="text-base font-semibold text-text-primary">
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

            <div className="grid gap-4 md:grid-cols-2">
              {(
                [
                  ["name", "Nombre"],
                  ["phone", "Teléfono"],
                  ["email", "Email"],
                  ["address", "Dirección"],
                  ["tags", "Tags (coma separada)"],
                  ["whatsapp_id", "WhatsApp ID"],
                ] as [keyof ClientDraftInput, string][]
              ).map(([field, label]) => (
                <Input
                  key={field}
                  label={label}
                  value={draft[field] as string}
                  onChange={(e) => setDraft((c) => ({ ...c, [field]: e.target.value }))}
                />
              ))}
              <div className="md:col-span-2 flex flex-col gap-1.5">
                <label className="text-xs font-medium text-text-muted uppercase tracking-wide">
                  Notas
                </label>
                <textarea
                  value={draft.notes}
                  onChange={(e) => setDraft((c) => ({ ...c, notes: e.target.value }))}
                  rows={3}
                  className="w-full rounded-lg border border-border bg-bg-elevated px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent/40 focus:border-accent/40 transition-colors resize-none"
                />
              </div>
            </div>

            {formError ? <p className="mt-4 text-sm text-danger">{formError}</p> : null}

            <div className="mt-6 flex justify-end gap-3">
              <Button variant="ghost" size="sm" onClick={() => setModalOpen(false)}>
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
          </div>
        </div>
      ) : null}
    </div>
  );
}

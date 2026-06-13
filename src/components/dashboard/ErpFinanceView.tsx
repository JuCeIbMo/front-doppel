"use client";

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
import type { CashAccountResponse, TransactionResponse } from "@/lib/erp-types";
import {
  buildCashAccountPayload,
  buildTransactionPayload,
  type CashAccountDraftInput,
  type TransactionDraftInput,
} from "@/lib/erp-entities";
import { buildCashAccountUpdatePayload, type CashAccountUpdateDraftInput } from "@/lib/erp-ops";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

const emptyAccountDraft: CashAccountDraftInput = {
  name: "",
  type: "cash",
  is_default: false,
};

const emptyTransactionDraft: TransactionDraftInput = {
  type: "expense",
  amount: "",
  category: "",
  description: "",
  cash_account_id: "",
  date: "",
};

async function getAccounts() {
  return apiFetch<CashAccountResponse[]>("/erp/finance/accounts", {
    baseUrl: API_URL,
    session: getBrowserSessionStore(),
  });
}

async function getTransactions(limit: number, offset: number) {
  return apiFetch<TransactionResponse[]>(`/erp/finance/transactions?limit=${limit}&offset=${offset}`, {
    baseUrl: API_URL,
    session: getBrowserSessionStore(),
  });
}

async function getCategories() {
  return apiFetch<string[]>("/erp/finance/categories", {
    baseUrl: API_URL,
    session: getBrowserSessionStore(),
  });
}

export function ErpFinanceView() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { format } = useCurrency();
  const { page, limit, offset, nextPage, prevPage } = usePagination();
  const [accountDraft, setAccountDraft] = useState<CashAccountDraftInput>(emptyAccountDraft);
  const [transactionDraft, setTransactionDraft] =
    useState<TransactionDraftInput>(emptyTransactionDraft);
  const [accountOpen, setAccountOpen] = useState(false);
  const [transactionOpen, setTransactionOpen] = useState(false);
  const [accountError, setAccountError] = useState<string | null>(null);
  const [transactionError, setTransactionError] = useState<string | null>(null);
  const [editingAccount, setEditingAccount] = useState<(CashAccountUpdateDraftInput & { id: string }) | null>(null);
  const [editAccountError, setEditAccountError] = useState<string | null>(null);

  const accountsQuery = useQuery({
    queryKey: ["erp-accounts"],
    queryFn: getAccounts,
  });

  const transactionsQuery = useQuery({
    queryKey: ["erp-transactions", { offset, limit }],
    queryFn: () => getTransactions(limit, offset),
  });

  const categoriesQuery = useQuery({
    queryKey: ["erp-categories"],
    queryFn: getCategories,
  });

  const createAccountMutation = useMutation({
    mutationFn: async () => {
      const payload = buildCashAccountPayload(accountDraft);
      return apiFetch<CashAccountResponse>("/erp/finance/accounts", {
        baseUrl: API_URL,
        session: getBrowserSessionStore(),
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["erp-accounts"] });
      toast.success("Caja creada.");
      setAccountDraft(emptyAccountDraft);
      setAccountOpen(false);
      setAccountError(null);
    },
    onError: (error) => {
      setAccountError(error instanceof Error ? error.message : "No se pudo crear la caja.");
    },
  });

  const createTransactionMutation = useMutation({
    mutationFn: async () => {
      const payload = buildTransactionPayload(transactionDraft);
      return apiFetch<TransactionResponse>("/erp/finance/transactions", {
        baseUrl: API_URL,
        session: getBrowserSessionStore(),
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["erp-transactions"] });
      await queryClient.invalidateQueries({ queryKey: ["erp-accounts"] });
      toast.success("Transacción creada.");
      setTransactionDraft(emptyTransactionDraft);
      setTransactionOpen(false);
      setTransactionError(null);
    },
    onError: (error) => {
      setTransactionError(
        error instanceof Error ? error.message : "No se pudo crear la transacción.",
      );
    },
  });

  const updateAccountMutation = useMutation({
    mutationFn: async () => {
      if (!editingAccount) {
        throw new Error("No hay caja seleccionada.");
      }
      const payload = buildCashAccountUpdatePayload(editingAccount);
      return apiFetch<CashAccountResponse>(`/erp/finance/accounts/${editingAccount.id}`, {
        baseUrl: API_URL,
        session: getBrowserSessionStore(),
        method: "PUT",
        body: JSON.stringify(payload),
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["erp-accounts"] });
      toast.success("Caja actualizada.");
      setEditingAccount(null);
      setEditAccountError(null);
    },
    onError: (error) => {
      setEditAccountError(error instanceof Error ? error.message : "No se pudo actualizar la caja.");
    },
  });

  const error = accountsQuery.error ?? transactionsQuery.error;

  if (error instanceof ApiError && error.status === 401) {
    clearToken();
    router.replace("/connect");
    return null;
  }

  const accounts = accountsQuery.data ?? [];
  const transactions = transactionsQuery.data ?? [];
  const categories = categoriesQuery.data ?? [];
  const hasMore = transactions.length === limit;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Finanzas</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Saldo de cajas y transacciones sobre backend actual.
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" className="px-5 py-3 text-sm" onClick={() => setAccountOpen(true)}>
            Nueva caja
          </Button>
          <Button variant="primary" className="px-5 py-3 text-sm" onClick={() => setTransactionOpen(true)}>
            Nueva transacción
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {accountsQuery.isLoading
          ? Array.from({ length: 4 }).map((_, index) => (
              <Card key={index}>
                <div className="h-20 animate-pulse rounded-2xl bg-white/5" />
              </Card>
            ))
          : accounts.map((account) => (
              <Card key={account.id}>
                <p className="text-sm text-text-secondary">{account.name}</p>
                <p className="mt-3 text-xl font-semibold">{format(account.balance)}</p>
                <p className="mt-2 text-xs text-text-secondary">
                  {account.type} · {account.is_active ? "Activa" : "Inactiva"}
                </p>
                <button
                  type="button"
                  onClick={() =>
                    setEditingAccount({
                      id: account.id,
                      name: account.name,
                      type: account.type,
                      is_default: account.is_default,
                      is_active: account.is_active,
                    })
                  }
                  className="mt-4 text-sm text-text-secondary transition-colors hover:text-text-primary"
                >
                  Editar
                </button>
              </Card>
            ))}
      </div>

      <Card>
        {transactionsQuery.isLoading ? (
          <div className="space-y-3">
            <div className="h-16 animate-pulse rounded-2xl bg-white/5" />
            <div className="h-16 animate-pulse rounded-2xl bg-white/5" />
          </div>
        ) : error ? (
          <p className="text-sm text-red-400">
            {error instanceof Error ? error.message : "No se pudo cargar finanzas."}
          </p>
        ) : transactions.length === 0 ? (
          <p className="text-sm text-text-secondary">No hay transacciones registradas todavía.</p>
        ) : (
          <div className="space-y-3">
            {transactions.map((transaction) => (
              <div key={transaction.id} className="rounded-2xl border border-white/8 bg-white/4 px-4 py-4">
                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="font-medium">{transaction.category}</p>
                    <p className="mt-1 text-sm text-text-secondary">
                      {transaction.description || "Sin descripción"}
                    </p>
                    <p className="mt-2 text-xs text-text-secondary">
                      {transaction.actor} · {transaction.date}
                    </p>
                  </div>
                  <p
                    className={`text-lg font-semibold ${
                      transaction.type === "income" ? "text-accent" : "text-red-300"
                    }`}
                  >
                    {transaction.type === "income" ? "+" : "-"}
                    {format(transaction.amount)}
                  </p>
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
        hasMore={hasMore}
        isLoading={transactionsQuery.isLoading}
      />

      {accountOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4" onClick={() => setAccountOpen(false)}>
          <div className="w-full max-w-xl rounded-3xl border border-white/10 bg-bg-primary p-6" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-xl font-semibold">Nueva caja</h2>
              <button type="button" onClick={() => setAccountOpen(false)} className="text-sm text-text-secondary hover:text-text-primary">Cerrar</button>
            </div>
            <div className="mt-6 grid gap-4">
              <div>
                <label className="block text-sm text-text-secondary">Nombre</label>
                <input value={accountDraft.name} onChange={(event) => setAccountDraft((current) => ({ ...current, name: event.target.value }))} className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent/30" />
              </div>
              <div>
                <label className="block text-sm text-text-secondary">Tipo</label>
                <input value={accountDraft.type} onChange={(event) => setAccountDraft((current) => ({ ...current, type: event.target.value }))} className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent/30" />
              </div>
              <label className="inline-flex items-center gap-3 text-sm">
                <input type="checkbox" checked={accountDraft.is_default} onChange={(event) => setAccountDraft((current) => ({ ...current, is_default: event.target.checked }))} />
                Caja por defecto
              </label>
            </div>
            {accountError ? <p className="mt-4 text-sm text-red-400">{accountError}</p> : null}
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="ghost" className="px-5 py-3 text-sm" onClick={() => setAccountOpen(false)}>Cancelar</Button>
              <Button variant="primary" className="px-5 py-3 text-sm" onClick={() => createAccountMutation.mutate()} disabled={createAccountMutation.isPending}>
                {createAccountMutation.isPending ? "Guardando..." : "Guardar"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {transactionOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4" onClick={() => setTransactionOpen(false)}>
          <div className="w-full max-w-2xl rounded-3xl border border-white/10 bg-bg-primary p-6" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-xl font-semibold">Nueva transacción</h2>
              <button type="button" onClick={() => setTransactionOpen(false)} className="text-sm text-text-secondary hover:text-text-primary">Cerrar</button>
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm text-text-secondary">Tipo</label>
                <select value={transactionDraft.type} onChange={(event) => setTransactionDraft((current) => ({ ...current, type: event.target.value as "income" | "expense" }))} className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent/30">
                  <option value="income">Ingreso</option>
                  <option value="expense">Egreso</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-text-secondary">Monto</label>
                <input value={transactionDraft.amount} onChange={(event) => setTransactionDraft((current) => ({ ...current, amount: event.target.value }))} className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent/30" />
              </div>
              <div>
                <label className="block text-sm text-text-secondary">Categoría</label>
                <input value={transactionDraft.category} list="finance-categories" onChange={(event) => setTransactionDraft((current) => ({ ...current, category: event.target.value }))} className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent/30" />
                <datalist id="finance-categories">
                  {categories.map((category) => (
                    <option key={category} value={category} />
                  ))}
                </datalist>
              </div>
              <div>
                <label className="block text-sm text-text-secondary">Caja</label>
                <select value={transactionDraft.cash_account_id} onChange={(event) => setTransactionDraft((current) => ({ ...current, cash_account_id: event.target.value }))} className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent/30">
                  <option value="">Sin caja</option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm text-text-secondary">Fecha (opcional)</label>
                <input value={transactionDraft.date} onChange={(event) => setTransactionDraft((current) => ({ ...current, date: event.target.value }))} placeholder="YYYY-MM-DD" className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent/30" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm text-text-secondary">Descripción</label>
                <textarea value={transactionDraft.description} onChange={(event) => setTransactionDraft((current) => ({ ...current, description: event.target.value }))} rows={3} className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent/30" />
              </div>
            </div>
            {transactionError ? <p className="mt-4 text-sm text-red-400">{transactionError}</p> : null}
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="ghost" className="px-5 py-3 text-sm" onClick={() => setTransactionOpen(false)}>Cancelar</Button>
              <Button variant="primary" className="px-5 py-3 text-sm" onClick={() => createTransactionMutation.mutate()} disabled={createTransactionMutation.isPending}>
                {createTransactionMutation.isPending ? "Guardando..." : "Guardar"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {editingAccount ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4" onClick={() => setEditingAccount(null)}>
          <div className="w-full max-w-xl rounded-3xl border border-white/10 bg-bg-primary p-6" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-xl font-semibold">Editar caja</h2>
              <button type="button" onClick={() => setEditingAccount(null)} className="text-sm text-text-secondary hover:text-text-primary">Cerrar</button>
            </div>
            <div className="mt-6 grid gap-4">
              <div>
                <label className="block text-sm text-text-secondary">Nombre</label>
                <input value={editingAccount.name} onChange={(event) => setEditingAccount((current) => current ? { ...current, name: event.target.value } : current)} className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent/30" />
              </div>
              <div>
                <label className="block text-sm text-text-secondary">Tipo</label>
                <input value={editingAccount.type} onChange={(event) => setEditingAccount((current) => current ? { ...current, type: event.target.value } : current)} className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent/30" />
              </div>
              <label className="inline-flex items-center gap-3 text-sm">
                <input type="checkbox" checked={editingAccount.is_default} onChange={(event) => setEditingAccount((current) => current ? { ...current, is_default: event.target.checked } : current)} />
                Caja por defecto
              </label>
              <label className="inline-flex items-center gap-3 text-sm">
                <input type="checkbox" checked={editingAccount.is_active} onChange={(event) => setEditingAccount((current) => current ? { ...current, is_active: event.target.checked } : current)} />
                Caja activa
              </label>
            </div>
            {editAccountError ? <p className="mt-4 text-sm text-red-400">{editAccountError}</p> : null}
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="ghost" className="px-5 py-3 text-sm" onClick={() => setEditingAccount(null)}>Cancelar</Button>
              <Button variant="primary" className="px-5 py-3 text-sm" onClick={() => updateAccountMutation.mutate()} disabled={updateAccountMutation.isPending}>
                {updateAccountMutation.isPending ? "Guardando..." : "Guardar"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

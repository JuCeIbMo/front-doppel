"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { Input } from "@/components/ui/Input";
import { Table } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { Pagination } from "@/components/ui/Pagination";
import { apiFetch, ApiError, getBrowserSessionStore } from "@/lib/api-client";
import { clearToken } from "@/lib/auth";
import { useCurrency } from "@/hooks/useCurrency";
import { usePagination } from "@/hooks/usePagination";
import type { CashAccountResponse, CashflowItem, TransactionResponse } from "@/lib/erp-types";
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

async function getTransactions(limit: number, offset: number, fromDate: string, toDate: string) {
  const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
  if (fromDate) params.set("date_from", fromDate);
  if (toDate) params.set("date_to", toDate);
  return apiFetch<TransactionResponse[]>(`/erp/finance/transactions?${params}`, {
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
  const { page, limit, offset, nextPage, prevPage, reset } = usePagination();

  const today = new Date();
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const [fromDate, setFromDate] = useState(firstOfMonth.toISOString().slice(0, 10));
  const [toDate, setToDate] = useState(today.toISOString().slice(0, 10));
  const [drillDate, setDrillDate] = useState<string | null>(null);

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
    queryKey: ["erp-transactions", { offset, limit, fromDate, toDate }],
    queryFn: () => getTransactions(limit, offset, fromDate, toDate),
  });

  const categoriesQuery = useQuery({
    queryKey: ["erp-categories"],
    queryFn: getCategories,
  });

  const cashflowQuery = useQuery({
    queryKey: ["erp-cashflow", { fromDate, toDate }],
    queryFn: () => {
      const params = new URLSearchParams({ group_by: "day" });
      if (fromDate) params.set("date_from", fromDate);
      if (toDate) params.set("date_to", toDate);
      return apiFetch<{ items: CashflowItem[] }>(
        `/erp/finance/cashflow?${params}`,
        { baseUrl: API_URL, session: getBrowserSessionStore() },
      );
    },
    enabled: fromDate <= toDate,
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

  const displayedTransactions = drillDate
    ? transactions.filter((t) => t.date?.startsWith(drillDate))
    : transactions;

  return (
    <div className="flex flex-col gap-6">
      {/* PAGE HEADER */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Finanzas</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Saldo de cajas y transacciones.
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" size="sm" onClick={() => setAccountOpen(true)}>
            Nueva caja
          </Button>
          <Button variant="primary" size="sm" onClick={() => setTransactionOpen(true)}>
            Nueva transacción
          </Button>
        </div>
      </div>

      {/* ACCOUNTS GRID */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {accountsQuery.isLoading
          ? Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="bg-bg-secondary border border-border rounded-xl h-28 animate-pulse"
              />
            ))
          : accounts.map((account) => (
              <div key={account.id} className="relative">
                <StatCard
                  label={account.name}
                  value={format(account.balance)}
                  delta={`${account.type} · ${account.is_active ? "Activa" : "Inactiva"}`}
                  deltaPositive={account.is_active}
                />
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
                  className="absolute top-4 right-4 text-xs text-text-muted hover:text-text-primary transition-colors"
                >
                  Editar
                </button>
              </div>
            ))}
      </div>

      {/* CASHFLOW CHART */}
      <Card>
        <CardHeader
          title="Flujo de caja"
          action={
            <div className="flex gap-2">
              <Input
                type="date"
                value={fromDate}
                max={toDate}
                onChange={(e) => {
                  setFromDate(e.target.value);
                  setDrillDate(null);
                  reset();
                }}
                className="py-1"
              />
              <Input
                type="date"
                value={toDate}
                min={fromDate}
                onChange={(e) => {
                  setToDate(e.target.value);
                  setDrillDate(null);
                  reset();
                }}
                className="py-1"
              />
            </div>
          }
        />

        {cashflowQuery.isLoading && (
          <div className="h-60 animate-pulse rounded-xl bg-white/5" />
        )}

        {cashflowQuery.data?.items && cashflowQuery.data.items.length > 0 && (
          <ResponsiveContainer width="100%" height={240}>
            <ComposedChart
              data={cashflowQuery.data.items}
              margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
              onClick={(data) => {
                const label = data?.activeLabel;
                if (typeof label === "string" && label) setDrillDate(label);
              }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="label" tick={{ fill: "#9ca3af", fontSize: 12 }} />
              <YAxis tick={{ fill: "#9ca3af", fontSize: 12 }} />
              <Tooltip
                contentStyle={{ background: "#111", border: "1px solid rgba(255,255,255,0.1)" }}
                labelStyle={{ color: "#fff" }}
              />
              <Legend />
              <Bar dataKey="income" fill="#25d366" name="Ingresos" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expense" fill="#ef4444" name="Egresos" radius={[4, 4, 0, 0]} />
              <Line
                type="monotone"
                dataKey="net"
                stroke="#ffffff"
                strokeWidth={2}
                dot={false}
                name="Neto"
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}

        {cashflowQuery.data?.items?.length === 0 && (
          <p className="text-sm text-text-secondary text-center py-8">
            No hay datos para el período seleccionado.
          </p>
        )}
      </Card>

      {/* TRANSACTIONS */}
      <Card>
        {drillDate && (
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm text-text-secondary">Mostrando: {drillDate}</span>
            <button
              type="button"
              onClick={() => setDrillDate(null)}
              className="text-xs text-accent hover:text-accent/80"
            >
              ✕ Limpiar filtro
            </button>
          </div>
        )}
        <CardHeader title="Transacciones" />
        {transactionsQuery.isLoading ? (
          <Table><Table.Loading rows={5} cols={5} /></Table>
        ) : error ? (
          <p className="text-sm text-danger">
            {error instanceof Error ? error.message : "No se pudo cargar finanzas."}
          </p>
        ) : displayedTransactions.length === 0 ? (
          <Table><Table.Empty>No hay transacciones registradas todavía.</Table.Empty></Table>
        ) : (
          <Table>
            <Table.Head>
              <tr>
                <Table.Th>Fecha</Table.Th>
                <Table.Th>Tipo</Table.Th>
                <Table.Th>Categoría</Table.Th>
                <Table.Th>Descripción</Table.Th>
                <Table.Th className="text-right">Monto</Table.Th>
              </tr>
            </Table.Head>
            <Table.Body>
              {displayedTransactions.map((transaction) => (
                <Table.Row key={transaction.id}>
                  <Table.Cell className="text-text-muted text-xs">{transaction.date}</Table.Cell>
                  <Table.Cell>
                    <Badge variant={transaction.type === "income" ? "success" : "danger"}>
                      {transaction.type === "income" ? "Ingreso" : "Egreso"}
                    </Badge>
                  </Table.Cell>
                  <Table.Cell className="text-text-primary">{transaction.category}</Table.Cell>
                  <Table.Cell className="text-text-muted">{transaction.description || "—"}</Table.Cell>
                  <Table.Cell className={`text-right font-semibold ${transaction.type === "income" ? "text-accent" : "text-danger"}`}>
                    {transaction.type === "income" ? "+" : "-"}{format(transaction.amount)}
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
        isLoading={transactionsQuery.isLoading}
      />

      {/* MODAL: Nueva caja */}
      {accountOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
          onClick={() => setAccountOpen(false)}
        >
          <div
            className="w-full max-w-xl rounded-xl border border-border bg-bg-secondary p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-4 mb-5">
              <h2 className="text-base font-semibold text-text-primary">Nueva caja</h2>
              <button
                type="button"
                onClick={() => setAccountOpen(false)}
                className="text-sm text-text-secondary hover:text-text-primary"
              >
                Cerrar
              </button>
            </div>
            <div className="grid gap-4">
              <Input
                label="Nombre"
                value={accountDraft.name}
                onChange={(event) =>
                  setAccountDraft((current) => ({ ...current, name: event.target.value }))
                }
              />
              <Input
                label="Tipo"
                value={accountDraft.type}
                onChange={(event) =>
                  setAccountDraft((current) => ({ ...current, type: event.target.value }))
                }
              />
              <label className="inline-flex items-center gap-3 text-sm">
                <input
                  type="checkbox"
                  checked={accountDraft.is_default}
                  onChange={(event) =>
                    setAccountDraft((current) => ({ ...current, is_default: event.target.checked }))
                  }
                />
                Caja por defecto
              </label>
            </div>
            {accountError ? <p className="mt-4 text-sm text-danger">{accountError}</p> : null}
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="ghost" size="sm" onClick={() => setAccountOpen(false)}>
                Cancelar
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => createAccountMutation.mutate()}
                disabled={createAccountMutation.isPending}
              >
                {createAccountMutation.isPending ? "Guardando..." : "Guardar"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {/* MODAL: Nueva transacción */}
      {transactionOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
          onClick={() => setTransactionOpen(false)}
        >
          <div
            className="w-full max-w-2xl rounded-xl border border-border bg-bg-secondary p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-4 mb-5">
              <h2 className="text-base font-semibold text-text-primary">Nueva transacción</h2>
              <button
                type="button"
                onClick={() => setTransactionOpen(false)}
                className="text-sm text-text-secondary hover:text-text-primary"
              >
                Cerrar
              </button>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-text-muted uppercase tracking-wide mb-1.5">
                  Tipo
                </label>
                <select
                  value={transactionDraft.type}
                  onChange={(event) =>
                    setTransactionDraft((current) => ({
                      ...current,
                      type: event.target.value as "income" | "expense",
                    }))
                  }
                  className="w-full rounded-lg border border-border bg-bg-elevated px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent/40 focus:border-accent/40 transition-colors"
                >
                  <option value="income">Ingreso</option>
                  <option value="expense">Egreso</option>
                </select>
              </div>
              <Input
                label="Monto"
                value={transactionDraft.amount}
                onChange={(event) =>
                  setTransactionDraft((current) => ({ ...current, amount: event.target.value }))
                }
              />
              <div>
                <Input
                  label="Categoría"
                  value={transactionDraft.category}
                  list="finance-categories"
                  onChange={(event) =>
                    setTransactionDraft((current) => ({
                      ...current,
                      category: event.target.value,
                    }))
                  }
                />
                <datalist id="finance-categories">
                  {categories.map((category) => (
                    <option key={category} value={category} />
                  ))}
                </datalist>
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted uppercase tracking-wide mb-1.5">
                  Caja
                </label>
                <select
                  value={transactionDraft.cash_account_id}
                  onChange={(event) =>
                    setTransactionDraft((current) => ({
                      ...current,
                      cash_account_id: event.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-border bg-bg-elevated px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent/40 focus:border-accent/40 transition-colors"
                >
                  <option value="">Sin caja</option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <Input
                  label="Fecha (opcional)"
                  placeholder="YYYY-MM-DD"
                  value={transactionDraft.date}
                  onChange={(event) =>
                    setTransactionDraft((current) => ({ ...current, date: event.target.value }))
                  }
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-text-muted uppercase tracking-wide mb-1.5">
                  Descripción
                </label>
                <textarea
                  value={transactionDraft.description}
                  onChange={(event) =>
                    setTransactionDraft((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  rows={3}
                  className="w-full rounded-lg border border-border bg-bg-elevated px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent/40 focus:border-accent/40 transition-colors resize-none"
                />
              </div>
            </div>
            {transactionError ? (
              <p className="mt-4 text-sm text-danger">{transactionError}</p>
            ) : null}
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="ghost" size="sm" onClick={() => setTransactionOpen(false)}>
                Cancelar
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => createTransactionMutation.mutate()}
                disabled={createTransactionMutation.isPending}
              >
                {createTransactionMutation.isPending ? "Guardando..." : "Guardar"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {/* MODAL: Editar caja */}
      {editingAccount ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
          onClick={() => setEditingAccount(null)}
        >
          <div
            className="w-full max-w-xl rounded-xl border border-border bg-bg-secondary p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-4 mb-5">
              <h2 className="text-base font-semibold text-text-primary">Editar caja</h2>
              <button
                type="button"
                onClick={() => setEditingAccount(null)}
                className="text-sm text-text-secondary hover:text-text-primary"
              >
                Cerrar
              </button>
            </div>
            <div className="grid gap-4">
              <Input
                label="Nombre"
                value={editingAccount.name}
                onChange={(event) =>
                  setEditingAccount((current) =>
                    current ? { ...current, name: event.target.value } : current
                  )
                }
              />
              <Input
                label="Tipo"
                value={editingAccount.type}
                onChange={(event) =>
                  setEditingAccount((current) =>
                    current ? { ...current, type: event.target.value } : current
                  )
                }
              />
              <label className="inline-flex items-center gap-3 text-sm">
                <input
                  type="checkbox"
                  checked={editingAccount.is_default}
                  onChange={(event) =>
                    setEditingAccount((current) =>
                      current ? { ...current, is_default: event.target.checked } : current
                    )
                  }
                />
                Caja por defecto
              </label>
              <label className="inline-flex items-center gap-3 text-sm">
                <input
                  type="checkbox"
                  checked={editingAccount.is_active}
                  onChange={(event) =>
                    setEditingAccount((current) =>
                      current ? { ...current, is_active: event.target.checked } : current
                    )
                  }
                />
                Caja activa
              </label>
            </div>
            {editAccountError ? (
              <p className="mt-4 text-sm text-danger">{editAccountError}</p>
            ) : null}
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="ghost" size="sm" onClick={() => setEditingAccount(null)}>
                Cancelar
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => updateAccountMutation.mutate()}
                disabled={updateAccountMutation.isPending}
              >
                {updateAccountMutation.isPending ? "Guardando..." : "Guardar"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

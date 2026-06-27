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
import { Input } from "@/components/ui/Input";
import { Pagination } from "@/components/ui/Pagination";
import {
  MPage,
  MPanel,
  MStat,
  MSectionHead,
  MPill,
  MThread,
  MEyebrow,
} from "@/components/ui/MeridianKit";
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
    <MPage
      eyebrow="Módulo de finanzas · Consolidado"
      title="Finanzas"
      right={
        <div style={{ display: "flex", gap: 10 }}>
          <Button variant="secondary" size="sm" onClick={() => setAccountOpen(true)}>
            Nueva caja
          </Button>
          <Button variant="primary" size="sm" onClick={() => setTransactionOpen(true)}>
            Nueva transacción
          </Button>
        </div>
      }
    >
      {/* ACCOUNTS — KPI STRIP */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "var(--m-gut, 28px)",
          marginBottom: "var(--m-gut, 28px)",
        }}
      >
        {accountsQuery.isLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                style={{
                  height: 120,
                  borderRadius: "var(--m-r)",
                  background: "var(--m-surface-2)",
                  animation: "pulse 1.5s ease-in-out infinite",
                }}
              />
            ))
          : accounts.slice(0, 4).map((account) => (
              <MPanel key={account.id} pad={20} style={{ minHeight: 120 }}>
                <div style={{ position: "relative" }}>
                  <MStat
                    eyebrow={account.name}
                    value={format(account.balance)}
                    caption={`${account.type} · ${account.is_active ? "Activa" : "Inactiva"}`}
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
                    style={{
                      position: "absolute",
                      top: 0,
                      right: 0,
                      background: "none",
                      border: "none",
                      color: "var(--m-ink-faint)",
                      fontSize: 11,
                      fontFamily: "var(--m-mono)",
                      cursor: "pointer",
                      letterSpacing: "0.06em",
                    }}
                  >
                    Editar
                  </button>
                </div>
              </MPanel>
            ))}
      </div>

      {/* CASHFLOW CHART */}
      <MPanel pad={24} style={{ marginBottom: "var(--m-gut, 28px)" }}>
        <MSectionHead
          eyebrow="Flujo de caja · por día"
          title="Trayectoria de Caja"
          action={
            <div style={{ display: "flex", gap: 8 }}>
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
          <div
            style={{
              height: 240,
              borderRadius: "var(--m-r-sm)",
              background: "var(--m-surface-2)",
              animation: "pulse 1.5s ease-in-out infinite",
            }}
          />
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
              <CartesianGrid strokeDasharray="3 3" stroke="var(--m-line)" />
              <XAxis
                dataKey="label"
                tick={{ fill: "var(--m-ink-faint)", fontSize: 10, fontFamily: "var(--m-mono)" }}
              />
              <YAxis
                tick={{ fill: "var(--m-ink-faint)", fontSize: 10, fontFamily: "var(--m-mono)" }}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--m-panel)",
                  border: "1px solid var(--m-line)",
                  borderRadius: "var(--m-r-sm)",
                  color: "var(--m-ink)",
                  fontFamily: "var(--m-mono)",
                  fontSize: 11,
                }}
                labelStyle={{ color: "var(--m-ink)" }}
              />
              <Legend
                wrapperStyle={{
                  fontFamily: "var(--m-mono)",
                  fontSize: 10,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "var(--m-ink-dim)",
                }}
              />
              <Bar dataKey="income" fill="var(--m-pos)" name="Ingresos" radius={[3, 3, 0, 0]} opacity={0.85} />
              <Bar dataKey="expense" fill="var(--m-neg)" name="Egresos" radius={[3, 3, 0, 0]} opacity={0.85} />
              <Line
                type="monotone"
                dataKey="net"
                stroke="var(--m-accent)"
                strokeWidth={2}
                dot={false}
                name="Neto"
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}

        {cashflowQuery.data?.items?.length === 0 && (
          <div
            style={{
              padding: "40px 0",
              textAlign: "center",
              color: "var(--m-ink-faint)",
              fontFamily: "var(--m-mono)",
              fontSize: 12,
            }}
          >
            No hay datos para el período seleccionado.
          </div>
        )}
      </MPanel>

      {/* TRANSACTIONS — book ledger */}
      <MPanel pad={24}>
        {drillDate && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <span style={{ fontSize: 12, color: "var(--m-ink-dim)", fontFamily: "var(--m-mono)" }}>
              Mostrando: {drillDate}
            </span>
            <button
              type="button"
              onClick={() => setDrillDate(null)}
              style={{
                background: "none",
                border: "none",
                color: "var(--m-accent)",
                fontFamily: "var(--m-mono)",
                fontSize: 11,
                cursor: "pointer",
              }}
            >
              ✕ Limpiar
            </button>
          </div>
        )}
        <MSectionHead eyebrow="Libro de transacciones" title="Transacciones" />

        {/* header row */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 0.8fr 1fr 1.6fr 1fr",
            gap: 14,
            paddingBottom: 10,
            borderBottom: "1px solid var(--m-line)",
          }}
        >
          {["Fecha", "Tipo", "Categoría", "Descripción", "Monto"].map((h) => (
            <MEyebrow key={h}>{h}</MEyebrow>
          ))}
        </div>

        {transactionsQuery.isLoading ? (
          <div style={{ paddingTop: 16 }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                style={{
                  height: 44,
                  marginBottom: 8,
                  borderRadius: "var(--m-r-sm)",
                  background: "var(--m-surface-2)",
                  animation: "pulse 1.5s ease-in-out infinite",
                }}
              />
            ))}
          </div>
        ) : error ? (
          <div style={{ padding: "20px 0", color: "var(--m-neg)", fontSize: 13 }}>
            {error instanceof Error ? error.message : "No se pudo cargar finanzas."}
          </div>
        ) : displayedTransactions.length === 0 ? (
          <div
            style={{
              padding: "32px 0",
              textAlign: "center",
              color: "var(--m-ink-faint)",
              fontFamily: "var(--m-mono)",
              fontSize: 12,
            }}
          >
            No hay transacciones registradas todavía.
          </div>
        ) : (
          displayedTransactions.map((tx, i) => (
            <div
              key={tx.id}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 0.8fr 1fr 1.6fr 1fr",
                gap: 14,
                alignItems: "center",
                padding: "13px 0",
                borderBottom:
                  i < displayedTransactions.length - 1
                    ? "1px solid var(--m-line-soft)"
                    : "none",
              }}
            >
              <span
                className="m-mono m-tnum"
                style={{ fontSize: 11.5, color: "var(--m-ink-faint)" }}
              >
                {tx.date}
              </span>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  fontSize: 10,
                  fontFamily: "var(--m-mono)",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: tx.type === "income" ? "var(--m-pos)" : "var(--m-neg)",
                  border: "1px solid currentColor",
                  borderRadius: 999,
                  padding: "2px 8px",
                }}
              >
                <span style={{ width: 4, height: 4, borderRadius: 999, background: "currentColor" }} />
                {tx.type === "income" ? "Ingreso" : "Egreso"}
              </span>
              <span style={{ fontSize: 13, color: "var(--m-ink)" }}>{tx.category}</span>
              <span style={{ fontSize: 12.5, color: "var(--m-ink-dim)" }}>
                {tx.description || "—"}
              </span>
              <span
                className="m-mono m-tnum"
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: tx.type === "income" ? "var(--m-pos)" : "var(--m-neg)",
                  textAlign: "right",
                }}
              >
                {tx.type === "income" ? "+" : "-"}
                {format(tx.amount)}
              </span>
            </div>
          ))
        )}
      </MPanel>

      <div style={{ marginTop: 16 }}>
        <Pagination
          page={page}
          onPrev={prevPage}
          onNext={nextPage}
          hasMore={hasMore}
          isLoading={transactionsQuery.isLoading}
        />
      </div>

      {/* MODAL: Nueva caja */}
      {accountOpen ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 50,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,0.75)",
            padding: "0 16px",
          }}
          onClick={() => setAccountOpen(false)}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 480,
              background: "var(--m-panel)",
              border: "1px solid var(--m-line)",
              borderRadius: "var(--m-r)",
              padding: 28,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
              <h2 className="m-serif" style={{ margin: 0, fontSize: 22, fontWeight: 500, color: "var(--m-ink)" }}>
                Nueva caja
              </h2>
              <button type="button" onClick={() => setAccountOpen(false)} style={{ background: "none", border: "none", color: "var(--m-ink-faint)", cursor: "pointer", fontSize: 18 }}>✕</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <Input label="Nombre" value={accountDraft.name} onChange={(e) => setAccountDraft((c) => ({ ...c, name: e.target.value }))} />
              <Input label="Tipo" value={accountDraft.type} onChange={(e) => setAccountDraft((c) => ({ ...c, type: e.target.value }))} />
              <label style={{ display: "inline-flex", alignItems: "center", gap: 10, fontSize: 13, color: "var(--m-ink-dim)" }}>
                <input type="checkbox" checked={accountDraft.is_default} onChange={(e) => setAccountDraft((c) => ({ ...c, is_default: e.target.checked }))} />
                Caja por defecto
              </label>
            </div>
            {accountError && <p style={{ marginTop: 14, fontSize: 12, color: "var(--m-neg)" }}>{accountError}</p>}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 24 }}>
              <Button variant="ghost" size="sm" onClick={() => setAccountOpen(false)}>Cancelar</Button>
              <Button variant="primary" size="sm" onClick={() => createAccountMutation.mutate()} disabled={createAccountMutation.isPending}>
                {createAccountMutation.isPending ? "Guardando..." : "Guardar"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {/* MODAL: Nueva transacción */}
      {transactionOpen ? (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.75)", padding: "0 16px" }}
          onClick={() => setTransactionOpen(false)}
        >
          <div
            style={{ width: "100%", maxWidth: 640, background: "var(--m-panel)", border: "1px solid var(--m-line)", borderRadius: "var(--m-r)", padding: 28 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
              <h2 className="m-serif" style={{ margin: 0, fontSize: 22, fontWeight: 500, color: "var(--m-ink)" }}>Nueva transacción</h2>
              <button type="button" onClick={() => setTransactionOpen(false)} style={{ background: "none", border: "none", color: "var(--m-ink-faint)", cursor: "pointer", fontSize: 18 }}>✕</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div>
                <MEyebrow style={{ marginBottom: 6 }}>Tipo</MEyebrow>
                <select
                  value={transactionDraft.type}
                  onChange={(e) => setTransactionDraft((c) => ({ ...c, type: e.target.value as "income" | "expense" }))}
                  style={{ width: "100%", padding: "8px 12px", background: "var(--m-surface-2)", border: "1px solid var(--m-line)", borderRadius: "var(--m-r-sm)", color: "var(--m-ink)", fontFamily: "var(--m-sans)", fontSize: 13 }}
                >
                  <option value="income">Ingreso</option>
                  <option value="expense">Egreso</option>
                </select>
              </div>
              <Input label="Monto" value={transactionDraft.amount} onChange={(e) => setTransactionDraft((c) => ({ ...c, amount: e.target.value }))} />
              <div>
                <Input label="Categoría" value={transactionDraft.category} list="finance-categories" onChange={(e) => setTransactionDraft((c) => ({ ...c, category: e.target.value }))} />
                <datalist id="finance-categories">{categories.map((cat) => <option key={cat} value={cat} />)}</datalist>
              </div>
              <div>
                <MEyebrow style={{ marginBottom: 6 }}>Caja</MEyebrow>
                <select
                  value={transactionDraft.cash_account_id}
                  onChange={(e) => setTransactionDraft((c) => ({ ...c, cash_account_id: e.target.value }))}
                  style={{ width: "100%", padding: "8px 12px", background: "var(--m-surface-2)", border: "1px solid var(--m-line)", borderRadius: "var(--m-r-sm)", color: "var(--m-ink)", fontFamily: "var(--m-sans)", fontSize: 13 }}
                >
                  <option value="">Sin caja</option>
                  {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <Input label="Fecha (opcional)" placeholder="YYYY-MM-DD" value={transactionDraft.date} onChange={(e) => setTransactionDraft((c) => ({ ...c, date: e.target.value }))} />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <MEyebrow style={{ marginBottom: 6 }}>Descripción</MEyebrow>
                <textarea
                  value={transactionDraft.description}
                  onChange={(e) => setTransactionDraft((c) => ({ ...c, description: e.target.value }))}
                  rows={3}
                  style={{ width: "100%", padding: "8px 12px", background: "var(--m-surface-2)", border: "1px solid var(--m-line)", borderRadius: "var(--m-r-sm)", color: "var(--m-ink)", fontFamily: "var(--m-sans)", fontSize: 13, resize: "none", outline: "none" }}
                />
              </div>
            </div>
            {transactionError && <p style={{ marginTop: 14, fontSize: 12, color: "var(--m-neg)" }}>{transactionError}</p>}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 24 }}>
              <Button variant="ghost" size="sm" onClick={() => setTransactionOpen(false)}>Cancelar</Button>
              <Button variant="primary" size="sm" onClick={() => createTransactionMutation.mutate()} disabled={createTransactionMutation.isPending}>
                {createTransactionMutation.isPending ? "Guardando..." : "Guardar"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {/* MODAL: Editar caja */}
      {editingAccount ? (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.75)", padding: "0 16px" }}
          onClick={() => setEditingAccount(null)}
        >
          <div
            style={{ width: "100%", maxWidth: 480, background: "var(--m-panel)", border: "1px solid var(--m-line)", borderRadius: "var(--m-r)", padding: 28 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
              <h2 className="m-serif" style={{ margin: 0, fontSize: 22, fontWeight: 500, color: "var(--m-ink)" }}>Editar caja</h2>
              <button type="button" onClick={() => setEditingAccount(null)} style={{ background: "none", border: "none", color: "var(--m-ink-faint)", cursor: "pointer", fontSize: 18 }}>✕</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <Input label="Nombre" value={editingAccount.name} onChange={(e) => setEditingAccount((c) => c ? { ...c, name: e.target.value } : c)} />
              <Input label="Tipo" value={editingAccount.type} onChange={(e) => setEditingAccount((c) => c ? { ...c, type: e.target.value } : c)} />
              <label style={{ display: "inline-flex", alignItems: "center", gap: 10, fontSize: 13, color: "var(--m-ink-dim)" }}>
                <input type="checkbox" checked={editingAccount.is_default} onChange={(e) => setEditingAccount((c) => c ? { ...c, is_default: e.target.checked } : c)} />
                Caja por defecto
              </label>
              <label style={{ display: "inline-flex", alignItems: "center", gap: 10, fontSize: 13, color: "var(--m-ink-dim)" }}>
                <input type="checkbox" checked={editingAccount.is_active} onChange={(e) => setEditingAccount((c) => c ? { ...c, is_active: e.target.checked } : c)} />
                Caja activa
              </label>
            </div>
            {editAccountError && <p style={{ marginTop: 14, fontSize: 12, color: "var(--m-neg)" }}>{editAccountError}</p>}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 24 }}>
              <Button variant="ghost" size="sm" onClick={() => setEditingAccount(null)}>Cancelar</Button>
              <Button variant="primary" size="sm" onClick={() => updateAccountMutation.mutate()} disabled={updateAccountMutation.isPending}>
                {updateAccountMutation.isPending ? "Guardando..." : "Guardar"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </MPage>
  );
}

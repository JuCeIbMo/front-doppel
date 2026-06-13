export interface ClientDraftInput {
  name: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
  tags: string;
  whatsapp_id: string;
}

export interface CashAccountDraftInput {
  name: string;
  type: string;
  is_default: boolean;
}

export interface TransactionDraftInput {
  type: "income" | "expense";
  amount: string;
  category: string;
  description: string;
  cash_account_id: string;
  date: string;
}

function normalizeOptionalText(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function parseNonNegativeNumber(raw: string, label: string): number {
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${label} debe ser un número mayor o igual a 0.`);
  }
  return value;
}

export function buildClientPayload(draft: ClientDraftInput) {
  const name = draft.name.trim();
  if (!name) {
    throw new Error("El nombre es obligatorio.");
  }

  return {
    name,
    phone: normalizeOptionalText(draft.phone),
    email: normalizeOptionalText(draft.email),
    address: normalizeOptionalText(draft.address),
    notes: normalizeOptionalText(draft.notes),
    tags: draft.tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean),
    whatsapp_id: normalizeOptionalText(draft.whatsapp_id),
  };
}

export function buildCashAccountPayload(draft: CashAccountDraftInput) {
  const name = draft.name.trim();
  if (!name) {
    throw new Error("El nombre de la caja es obligatorio.");
  }

  return {
    name,
    type: draft.type.trim() || "cash",
    is_default: draft.is_default,
  };
}

export function buildTransactionPayload(draft: TransactionDraftInput) {
  const amount = parseNonNegativeNumber(draft.amount, "El monto");
  const category = draft.category.trim();
  if (!category) {
    throw new Error("La categoría es obligatoria.");
  }

  return {
    type: draft.type,
    amount,
    category,
    description: normalizeOptionalText(draft.description),
    cash_account_id: normalizeOptionalText(draft.cash_account_id),
    date: normalizeOptionalText(draft.date),
  };
}

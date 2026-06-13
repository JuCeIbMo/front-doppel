export interface MovementQueryInput {
  productId: string;
  limit: number;
  offset: number;
  type?: string;
}

export interface CashAccountUpdateDraftInput {
  name: string;
  type: string;
  is_default: boolean;
  is_active: boolean;
}

export function buildMovementQuery(input: MovementQueryInput): string {
  const params = new URLSearchParams();
  params.set("limit", String(input.limit));
  params.set("offset", String(input.offset));
  if (input.type) {
    params.set("type", input.type);
  }

  const productId = input.productId.trim();
  if (productId) {
    return `/erp/inventory/movements/${productId}?${params.toString()}`;
  }

  return `/erp/inventory/movements?${params.toString()}`;
}

export function buildCashAccountUpdatePayload(input: CashAccountUpdateDraftInput) {
  const name = input.name.trim();
  if (!name) {
    throw new Error("El nombre de la caja es obligatorio.");
  }

  return {
    name,
    type: input.type.trim() || "cash",
    is_default: input.is_default,
    is_active: input.is_active,
  };
}

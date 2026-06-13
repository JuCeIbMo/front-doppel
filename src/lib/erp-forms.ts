export interface ProductDraftInput {
  name: string;
  description: string;
  sku: string;
  barcode: string;
  category: string;
  image_url: string;
  cost_price: string;
  price: string;
  unit: string;
  available: boolean;
  low_stock_threshold: string;
}

export interface ProductPayload {
  name: string;
  description: string | null;
  sku: string | null;
  barcode: string | null;
  category: string | null;
  image_url: string | null;
  cost_price: number;
  price: number;
  unit: string;
  available: boolean;
  low_stock_threshold: number;
}

export interface InventoryAdjustmentDraft {
  product_id: string;
  variant_id: string;
  mode: "set" | "delta";
  quantity: string;
  note: string;
}

export interface InventoryAdjustmentPayload {
  product_id: string;
  variant_id: string | null;
  new_quantity?: number;
  delta?: number;
  note: string;
}

function parseNonNegativeNumber(raw: string, label: string): number {
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${label} debe ser un número mayor o igual a 0.`);
  }
  return value;
}

function normalizeOptionalText(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export function buildProductPayload(draft: ProductDraftInput): ProductPayload {
  const name = draft.name.trim();
  if (!name) {
    throw new Error("El nombre es obligatorio.");
  }

  const unit = draft.unit.trim();
  if (!unit) {
    throw new Error("La unidad es obligatoria.");
  }

  return {
    name,
    description: normalizeOptionalText(draft.description),
    sku: normalizeOptionalText(draft.sku),
    barcode: normalizeOptionalText(draft.barcode),
    category: normalizeOptionalText(draft.category),
    image_url: normalizeOptionalText(draft.image_url),
    cost_price: parseNonNegativeNumber(draft.cost_price, "El costo"),
    price: parseNonNegativeNumber(draft.price, "El precio"),
    unit,
    available: draft.available,
    low_stock_threshold: parseNonNegativeNumber(
      draft.low_stock_threshold,
      "El umbral de stock",
    ),
  };
}

export function buildInventoryAdjustmentPayload(
  draft: InventoryAdjustmentDraft,
): InventoryAdjustmentPayload {
  const note = draft.note.trim();
  if (!note) {
    throw new Error("La nota es obligatoria.");
  }

  const productId = draft.product_id.trim();
  if (!productId) {
    throw new Error("Falta el producto.");
  }

  if (!draft.quantity.trim()) {
    throw new Error("La cantidad es obligatoria.");
  }

  const quantity = Number(draft.quantity);
  if (!Number.isFinite(quantity)) {
    throw new Error("La cantidad debe ser numérica.");
  }

  if (draft.mode === "set" && quantity < 0) {
    throw new Error("La nueva cantidad no puede ser negativa.");
  }

  return {
    product_id: productId,
    variant_id: normalizeOptionalText(draft.variant_id),
    ...(draft.mode === "set" ? { new_quantity: quantity } : { delta: quantity }),
    note,
  };
}

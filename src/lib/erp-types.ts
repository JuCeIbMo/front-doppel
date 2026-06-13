export interface ErpDashboardResponse {
  period: Record<string, unknown>;
  sales_total: number;
  sales_count: number;
  gross_margin: number;
  gross_margin_pct: number;
  new_clients: number;
  low_stock_count: number;
  top_product?: Record<string, unknown> | null;
  cash_balances?: Array<Record<string, unknown>>;
}

export interface ErpProduct {
  id: string;
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
  has_variants: boolean;
  low_stock_threshold: number;
  stock: number | null;
  created_at: string | null;
}

export interface InventoryRow {
  product_id: string;
  product_name: string;
  variant_id: string | null;
  variant_name?: string | null;
  category: string | null;
  unit: string;
  quantity: number;
  low_stock_threshold: number;
}

export interface SaleItemResponse {
  id: string;
  product_id: string;
  variant_id: string | null;
  product_name: string;
  quantity: number;
  unit_price: number;
  unit_cost: number;
  total: number;
}

export interface SaleResponse {
  id: string;
  client_id: string | null;
  status: "completed" | "cancelled";
  payment_method: "cash" | "card" | "transfer" | "whatsapp" | "other";
  subtotal: number;
  discount: number;
  total: number;
  notes: string | null;
  actor: string;
  created_at: string;
  items: SaleItemResponse[];
}

export interface ClientResponse {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  tags: string[];
  whatsapp_id: string | null;
  total_purchases: number;
  purchase_count: number;
  last_purchase_at: string | null;
  created_at: string | null;
}

export interface TransactionResponse {
  id: string;
  type: "income" | "expense";
  amount: number;
  category: string;
  description: string | null;
  cash_account_id: string | null;
  sale_id: string | null;
  actor: string;
  date: string;
  created_at: string;
}

export interface CashAccountResponse {
  id: string;
  name: string;
  type: string;
  balance: number;
  is_default: boolean;
  is_active: boolean;
}

export interface ImportResult {
  imported: number;
  errors?: Array<Record<string, unknown>>;
}

export interface MovementResponse {
  id: string;
  product_id: string;
  product_name: string | null;
  variant_id: string | null;
  type: "purchase" | "sale" | "adjustment_in" | "adjustment_out" | "return" | "loss";
  quantity: number;
  unit_cost: number | null;
  reference_id: string | null;
  notes: string | null;
  actor: string;
  created_at: string;
}

export interface ActivityItemResponse {
  id: string;
  action: string;
  actor: string;
  detail?: string | null;
  module?: string | null;
  entity_type?: string | null;
  entity_id?: string | null;
  created_at: string;
}

export interface PinSetResponse {
  pin: string;
}

export interface PinLoginResponse {
  access_token: string;
  expires_in: number;
}

export interface CartItem {
  product_id: string;
  product_name: string;
  unit_price: number;
  quantity: number;
}

export interface TopProductItem {
  product_name: string;
  quantity: number;
  total: number;
}

export interface SalesByPeriodItem {
  label: string;
  value: number;
  previous?: number;
}

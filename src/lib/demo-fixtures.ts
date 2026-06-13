import type { ErpDashboardResponse, ErpProduct, InventoryRow, SaleResponse } from "@/lib/erp-types";

export const DEMO_DASHBOARD: ErpDashboardResponse = {
  period: { from: "2026-06-01", to: "2026-06-13" },
  sales_total: 18450,
  sales_count: 47,
  gross_margin: 7380,
  gross_margin_pct: 40,
  new_clients: 8,
  low_stock_count: 3,
  top_product: { name: "Heineken 1L", quantity: 62, total: 3968 },
  cash_balances: [
    { id: "1", name: "Caja principal", balance: 12300 },
    { id: "2", name: "Transferencias", balance: 6150 },
  ],
};

export const DEMO_PRODUCTS: ErpProduct[] = [
  {
    id: "prod_001", name: "Heineken 1L", description: "Cerveza Heineken botella 1L",
    sku: "HNK-1L", barcode: "7891234567890", category: "Cervezas",
    image_url: null, cost_price: 38, price: 64, unit: "unidad",
    available: true, has_variants: false, low_stock_threshold: 10,
    stock: 8, created_at: "2026-01-15T10:00:00Z",
  },
  {
    id: "prod_002", name: "Marlboro Rojo", description: "Cigarrillos Marlboro caja",
    sku: "MRB-R", barcode: "7899876543210", category: "Cigarrillos",
    image_url: null, cost_price: 45, price: 72, unit: "caja",
    available: true, has_variants: false, low_stock_threshold: 5,
    stock: 23, created_at: "2026-01-15T10:00:00Z",
  },
  {
    id: "prod_003", name: "Jack Daniel's 750ml", description: "Whisky Jack Daniel's Old No. 7",
    sku: "JD-750", barcode: "7892222222222", category: "Whisky",
    image_url: null, cost_price: 280, price: 420, unit: "botella",
    available: true, has_variants: false, low_stock_threshold: 3,
    stock: 2, created_at: "2026-01-20T10:00:00Z",
  },
];

export const DEMO_INVENTORY: InventoryRow[] = DEMO_PRODUCTS.map((p) => ({
  product_id: p.id,
  product_name: p.name,
  variant_id: null,
  category: p.category,
  unit: p.unit,
  quantity: p.stock ?? 0,
  low_stock_threshold: p.low_stock_threshold,
}));

export const DEMO_SALES: SaleResponse[] = [
  {
    id: "sale_001", client_id: null, status: "completed",
    payment_method: "cash", subtotal: 384, discount: 0, total: 384,
    notes: null, actor: "Bot WhatsApp", created_at: "2026-06-13T09:15:00Z",
    items: [
      { id: "si_001", product_id: "prod_001", variant_id: null, product_name: "Heineken 1L", quantity: 6, unit_price: 64, unit_cost: 38, total: 384 },
    ],
  },
  {
    id: "sale_002", client_id: "client_001", status: "completed",
    payment_method: "transfer", subtotal: 216, discount: 20, total: 196,
    notes: "Cliente frecuente", actor: "dueño@ejemplo.com", created_at: "2026-06-13T08:30:00Z",
    items: [
      { id: "si_002", product_id: "prod_002", variant_id: null, product_name: "Marlboro Rojo", quantity: 3, unit_price: 72, unit_cost: 45, total: 216 },
    ],
  },
];

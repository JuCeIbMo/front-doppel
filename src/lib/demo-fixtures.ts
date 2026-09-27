/** Sample data for the public /demo page; shaped like the old ERP responses. */
interface ErpDashboardResponse {
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

interface ErpProduct {
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

interface InventoryRow {
  product_id: string;
  product_name: string;
  variant_id: string | null;
  variant_name?: string | null;
  category: string | null;
  unit: string;
  quantity: number;
  low_stock_threshold: number;
}


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

const DEMO_PRODUCTS: ErpProduct[] = [
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


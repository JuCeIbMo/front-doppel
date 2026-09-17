import { test, expect, type Page } from "@playwright/test";
import { E2E_API_URL } from "../../playwright.config";
import { CORS, json, signIn } from "./owner";

const PHONE = { width: 375, height: 740 };
const DESKTOP = { width: 1280, height: 800 };

/** Every screen that works against the API, with the heading it opens on. */
const READY_SCREENS = [
  { path: "/dashboard", heading: "Inicio" },
  { path: "/dashboard/automation", heading: "Inbox de automatización" },
  { path: "/dashboard/orders", heading: "Pedidos" },
  { path: "/dashboard/approvals", heading: "Aprobaciones" },
  { path: "/dashboard/sales", heading: "Ventas" },
  { path: "/dashboard/sales/SALE01", heading: "Venta SALE01" },
  { path: "/dashboard/products", heading: "Productos" },
  { path: "/dashboard/products/new", heading: "Nuevo producto" },
  { path: "/dashboard/products/P1", heading: "Barra de chocolate amargo" },
  { path: "/dashboard/templates", heading: "Plantillas" },
  { path: "/dashboard/knowledge", heading: "Lo que sabe el bot" },
  { path: "/dashboard/activity", heading: "Bitácora" },
  { path: "/dashboard/settings", heading: "Ajustes" },
];

/** What the navigation offers that works, and where each one leads. */
const NAVIGATION = [
  { label: "Inicio", path: "/dashboard" },
  { label: "Automatización", path: "/dashboard/automation" },
  { label: "Pedidos", path: "/dashboard/orders" },
  { label: "Plantillas", path: "/dashboard/templates" },
  { label: "Lo que sabe el bot", path: "/dashboard/knowledge" },
  { label: "Aprobaciones", path: "/dashboard/approvals" },
  { label: "Ventas", path: "/dashboard/sales" },
  { label: "Productos", path: "/dashboard/products" },
  { label: "Bitácora", path: "/dashboard/activity" },
  { label: "Ajustes", path: "/dashboard/settings" },
];

const LINE = { phone_number_id: "pn-1", display_phone_number: "+591 70000000", public_agent_enabled: true };

const ANSWERS: Record<string, unknown> = {
  "/dashboard/business": { id: "biz-1", name: "Panadería La Espiga de Oro del Centro" },
  "/dashboard/whatsapp-line": LINE,
  "/dashboard/manager-phones": [{ phone: "59177777777" }],
  "/dashboard/pipeline": [
    {
      id: "c1",
      contact_code: "AAAAAA",
      whatsapp_number: "59170000001",
      last_message_at: new Date().toISOString(),
      last_message_body: "Quiero dos barras de chocolate amargo para mañana temprano, ¿tienen?",
      intervention_started_at: new Date().toISOString(),
      paused_until: new Date(Date.now() + 30 * 60000).toISOString(),
      reply_window_closes_at: new Date(Date.now() + 23 * 3600000).toISOString(),
    },
  ],
  "/dashboard/pipeline/c1/messages": [
    {
      id: "m1",
      direction: "inbound",
      body: "Quiero dos barras de chocolate amargo para mañana temprano, ¿tienen?",
      created_at: new Date().toISOString(),
      code: "M1",
      media_type: null,
      media_url: null,
      transcript: null,
      summary: null,
      media_state: null,
    },
  ],
  "/dashboard/overview": {
    sold_today: "1250.50",
    sales_today: 12,
    orders_to_collect: 3,
    orders_to_deliver: 1,
    pending_approvals: 1,
    handed_over: 1,
    messages_this_month: 850,
    free_messages_per_month: 1000,
    onboarding: { line_connected: true, has_product: true, has_knowledge: false, has_manager_phone: true },
  },
  "/dashboard/orders": [
    {
      code: "ORDER1",
      status: "placed",
      total: "1240.00",
      contact_code: "AAAAAA",
      whatsapp_number: "59170000001",
      placed_at: "2026-09-16T10:00:00Z",
      expires_at: "2026-09-17T10:00:00Z",
    },
  ],
  "/dashboard/approvals": [
    {
      id: "a1",
      operation: "void_sale",
      payload: { sale_code: "SALE01", reason: "El cliente devolvió todo el pedido por un error de talla" },
      requested_by: { kind: "owner" },
      reason: "Anular una venta devuelve el stock y cambia tus números del día.",
      created_at: "2026-09-16T10:00:00Z",
      expires_at: "2026-09-17T10:00:00Z",
    },
  ],
  "/dashboard/sales": [
    {
      code: "SALE01",
      total: "1240.00",
      payment_method: "transfer",
      status: "registered",
      created_at: "2026-09-16T10:00:00Z",
      voided_at: null,
    },
  ],
  "/dashboard/sales/SALE01": {
    code: "SALE01",
    total: "1240.00",
    payment_method: "transfer",
    status: "registered",
    created_at: "2026-09-16T10:00:00Z",
    voided_at: null,
    order_code: "ORDER1",
    lines: [{ product_code: "P1", name: "Barra de chocolate amargo", quantity: 100, unit_price: "12.40" }],
  },
  "/dashboard/products": [
    {
      code: "P1",
      name: "Barra de chocolate amargo",
      unit_price: "12.40",
      stock: 120,
      reserved: 2,
      archived: false,
      signed_url: null,
    },
  ],
  "/dashboard/templates": [
    {
      name: "pedido_listo_para_recoger_en_tienda",
      category: "UTILITY",
      language: "es",
      status: "REJECTED",
      body: "Hola {{1}}, tu pedido {{2}} ya está listo para recoger.",
      rejected_reason: "INVALID_FORMAT",
    },
  ],
  "/dashboard/knowledge": { knowledge: [], unwritten_topics: [] },
  "/dashboard/operations": [
    {
      id: "o1",
      operation: "confirm_payment",
      actor: { kind: "owner" },
      status: "executed",
      rejection_code: null,
      created_at: "2026-09-16T10:00:00Z",
    },
  ],
};

async function mockApi(page: Page) {
  await page.route(`${E2E_API_URL}/**`, async (route) => {
    if (route.request().method() === "OPTIONS") {
      return route.fulfill({ status: 204, headers: CORS });
    }
    const { pathname } = new URL(route.request().url());
    if (pathname in ANSWERS) return json(route, ANSWERS[pathname]);
    return route.fulfill({ status: 404, headers: CORS, body: `unmocked ${pathname}` });
  });
}

/** Whether the page is wider than the window, which on a phone means sideways scrolling. */
function overflowsSideways(page: Page) {
  return page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
}

for (const [device, viewport] of Object.entries({ phone: PHONE, desktop: DESKTOP })) {
  test(`every ready screen fits a ${device} without scrolling sideways`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await signIn(page);
    await mockApi(page);

    for (const screen of READY_SCREENS) {
      await page.goto(screen.path);
      await expect(page.getByRole("heading", { level: 1, name: screen.heading })).toBeVisible();
      expect(await overflowsSideways(page), `${screen.path} overflows`).toBe(false);
    }
  });
}

test("on a phone the Owner reaches every ready screen from the menu", async ({ page }) => {
  await page.setViewportSize(PHONE);
  await signIn(page);
  await mockApi(page);
  await page.goto("/dashboard/automation");

  for (const entry of NAVIGATION) {
    await page.getByRole("button", { name: "Más", exact: true }).click();
    const menu = page.getByRole("dialog", { name: "Menú" });
    await menu.getByRole("link", { name: entry.label, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`${entry.path}$`));
    await expect(menu).toBeHidden();
  }
});

test("when the API cannot be reached the Owner reads it in Spanish", async ({ page }) => {
  await signIn(page);
  await page.route(`${E2E_API_URL}/**`, (route) => route.abort("internetdisconnected"));

  await page.goto("/dashboard/sales");
  await expect(page.getByText("No pudimos conectar con Doppel")).toBeVisible();

  await page.goto("/dashboard/automation");
  await expect(page.getByText("No pudimos conectar con Doppel")).toBeVisible();
  await expect(page.getByText(/failed to fetch/i)).toHaveCount(0);
});

test("the connect screens fit a phone", async ({ page }) => {
  await page.setViewportSize(PHONE);

  await page.goto("/connect");
  await expect(page.getByRole("heading", { name: "Conecta tu WhatsApp Business" })).toBeVisible();
  expect(await overflowsSideways(page)).toBe(false);

  await page.goto("/connect/manager?phone=%2B591%2070000000&business=Panader%C3%ADa");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  expect(await overflowsSideways(page)).toBe(false);

  await page.goto("/connect/success?phone=%2B591%2070000000&business=Panader%C3%ADa");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  expect(await overflowsSideways(page)).toBe(false);
});

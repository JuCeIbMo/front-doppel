import { test, type Page } from "@playwright/test";
import { E2E_API_URL } from "../../playwright.config";
import { CORS, json, signIn } from "./owner";

// Every Owner screen with believable data, captured on a phone and a computer.
// Copy into tests/e2e/ to run; the shots land in .impeccable/review/all/.

const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/La_Paz" }).format(new Date());
const at = (hm: string, day = today) => `${day}T${hm}:00-04:00`;
const ago = (min: number) => new Date(Date.now() - min * 60000).toISOString();
const ahead = (min: number) => new Date(Date.now() + min * 60000).toISOString();

const LINE = {
  phone_number_id: "pn-1",
  display_phone_number: "+591 70000000",
  public_agent_enabled: true,
  calls_state: "on",
  calls_refused_reason: null,
  voice_instructions: "Saluda con el nombre del salón y habla con calma.",
};

const appt = (code: string, hm: string, end: string, status: string, service: string, pro: string, customer: string, due = "0.00") => ({
  appointment_code: code, starts_at: at(hm), ends_at: at(end), status, service_code: "S1", service,
  professional_code: pro === "Wara" ? "PR1" : "PR2", professional: pro, customer,
  whatsapp_number: "59170000001", price: "150.00", amount_due: due, pay_by: due !== "0.00" ? at("09:30") : null,
});

const HOURS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"].map((day) => ({ day, starts_at: "09:00", ends_at: day === "saturday" ? "13:00" : "18:00" }));

const ANSWERS: Record<string, unknown> = {
  "/dashboard/business": { id: "b1", name: "Salón Wara", selling_enabled: true, booking_enabled: true, calendar_email: "wara@gmail.com" },
  "/dashboard/whatsapp-line": LINE,
  "/dashboard/manager-phones": [{ phone: "59177777777" }],
  "/dashboard/overview": {
    sold_today: "1240.00", sales_today: 7, orders_to_collect: 3, orders_to_deliver: 1, pending_approvals: 2, handed_over: 1,
    messages_this_month: 812, free_messages_per_month: 1000, call_minutes_this_month: 34, call_minutes_per_month: 60,
    onboarding: { line_connected: true, has_product: true, has_service: true, has_hours: true, has_knowledge: true, has_manager_phone: true },
  },
  "/dashboard/pipeline": [
    { id: "c1", contact_code: "C-0042", whatsapp_number: "59171234567", last_message_at: ago(4), last_message_body: "¿Tienen torta de chocolate para 20 personas para el sábado?", intervention_started_at: ago(10), paused_until: ahead(26), reply_window_closes_at: ahead(23 * 60) },
    { id: "c2", contact_code: "C-0041", whatsapp_number: "59176543210", last_message_at: ago(80), last_message_body: "Listo, ya te mandé el comprobante", intervention_started_at: null, paused_until: null, reply_window_closes_at: ahead(22 * 60) },
    { id: "c3", contact_code: "C-0040", whatsapp_number: "59170011223", last_message_at: ago(60 * 26), last_message_body: "Hola, info", intervention_started_at: null, paused_until: null, reply_window_closes_at: ago(120) },
  ],
  "/dashboard/pipeline/c1/messages": [
    { kind: "message", id: "m1", code: "M1", direction: "inbound", body: "Hola, ¿tienen torta de chocolate?", created_at: ago(30), media_type: null, choice_id: null, media_url: null, transcript: null, summary: null, media_state: null },
    { kind: "message", id: "m2", code: "M2", direction: "outbound", body: "¡Hola! Sí, tenemos torta de chocolate a Bs 120. ¿Para cuántas personas?", created_at: ago(29), media_type: null, choice_id: null, media_url: null, transcript: null, summary: null, media_state: null },
    { kind: "call", id: "k1", created_at: ago(20), outcome: "answered", duration_seconds: 184, missed_reason: null, transcript: [{ who: "contact", text: "¿Hacen envíos a Sopocachi?" }, { who: "public_agent", text: "Sí, el envío cuesta Bs 15." }] },
    { kind: "message", id: "m3", code: "M3", direction: "inbound", body: "¿Tienen torta de chocolate para 20 personas para el sábado?", created_at: ago(4), media_type: null, choice_id: null, media_url: null, transcript: null, summary: null, media_state: null },
  ],
  "/dashboard/pipeline/c1/appointments": [],
  "/dashboard/orders": [
    { code: "O-0112", status: "placed", total: "240.00", contact_code: "C-0042", whatsapp_number: "59171234567", placed_at: ago(58), expires_at: ahead(120) },
    { code: "O-0111", status: "placed", total: "85.50", contact_code: "C-0039", whatsapp_number: "59170099887", placed_at: ago(200), expires_at: ahead(30) },
    { code: "O-0109", status: "paid", total: "120.00", contact_code: "C-0041", whatsapp_number: "59176543210", placed_at: ago(300), expires_at: ahead(600) },
    { code: "O-0104", status: "delivered", total: "360.00", contact_code: "C-0030", whatsapp_number: "59170001111", placed_at: ago(3000), expires_at: ago(2000) },
  ],
  "/dashboard/orders/O-0112": {
    code: "O-0112", status: "placed", total: "240.00", placed_at: ago(58), expires_at: ahead(120), ended_at: null,
    lines: [{ product_code: "P1", name: "Torta de chocolate", quantity: 2, unit_price: "120.00" }],
    payment_proofs: [{ attached_at: ago(20), read_amount: "240.00", matches_order: true, current: true, photo_url: null, summary: "Transferencia BNB a nombre de Salón Wara" }],
  },
  "/dashboard/approvals": [
    { id: "a1", operation: "confirm_payment", payload: { order_code: "O-0112" }, requested_by: { kind: "public_agent" }, reason: "El cliente mandó el comprobante de Bs 240.", created_at: ago(5), expires_at: ahead(23 * 60) },
    { id: "a2", operation: "void_sale", payload: { sale_code: "V-0099" }, requested_by: { kind: "owner" }, reason: "Anular una venta devuelve el stock y cambia tus números del día.", created_at: ago(90), expires_at: ahead(20 * 60) },
  ],
  "/dashboard/sales": [
    { code: "V-0107", total: "120.00", payment_method: "cash", status: "registered", created_at: at("12:05"), voided_at: null },
    { code: "V-0106", total: "350.00", payment_method: "transfer", status: "registered", created_at: at("11:40"), voided_at: null },
    { code: "V-0105", total: "80.00", payment_method: "card", status: "voided", created_at: at("10:12"), voided_at: at("10:30") },
    { code: "V-0104", total: "690.00", payment_method: "transfer", status: "registered", created_at: ago(60 * 26), voided_at: null },
  ],
  "/dashboard/sales/V-0107": {
    code: "V-0107", total: "120.00", payment_method: "cash", status: "registered", created_at: at("12:05"), voided_at: null, order_code: "O-0101", appointment_code: null,
    lines: [{ product_code: "P1", name: "Torta de chocolate", quantity: 1, unit_price: "120.00" }],
  },
  "/dashboard/products": [
    { code: "P1", name: "Torta de chocolate", unit_price: "120.00", stock: 8, reserved: 2, archived: false, signed_url: null },
    { code: "P2", name: "Alfajor de maicena", unit_price: "8.00", stock: 0, reserved: 0, archived: false, signed_url: null },
    { code: "P3", name: "Queque de naranja", unit_price: "45.00", stock: 12, reserved: 0, archived: false, signed_url: null },
    { code: "P4", name: "Torta tres leches", unit_price: "150.00", stock: 3, reserved: 0, archived: true, signed_url: null },
  ],
  "/dashboard/services": [
    { code: "S1", name: "Corte y lavado", duration_minutes: 45, price: "60.00", payment_ahead: "none", deposit: null, archived: false },
    { code: "S2", name: "Tinte completo", duration_minutes: 120, price: "250.00", payment_ahead: "deposit", deposit: "50.00", archived: false },
    { code: "S3", name: "Manicure", duration_minutes: 30, price: "40.00", payment_ahead: "full", deposit: null, archived: false },
  ],
  "/dashboard/team": {
    professionals: [
      { professional_code: "PR1", name: "Wara", hours: HOURS, services: [{ code: "S1", name: "Corte y lavado" }, { code: "S2", name: "Tinte completo" }], days_off: [] },
      { professional_code: "PR2", name: "Carla", hours: HOURS.slice(0, 5), services: [{ code: "S3", name: "Manicure" }], days_off: [] },
    ],
    business_closed: [],
  },
  "/dashboard/agenda": [
    appt("A-0086", "09:00", "09:45", "attended", "Corte y lavado", "Wara", "Ana Pérez"),
    appt("A-0087", "10:30", "12:30", "booked", "Tinte completo", "Wara", "Luis Mamani", "50.00"),
    appt("A-0088", "11:00", "11:30", "paid", "Manicure", "Carla", "Sofía Quispe"),
    appt("A-0089", "15:00", "15:45", "booked", "Corte y lavado", "Wara", "Jorge Choque"),
  ],
  "/dashboard/templates": [
    { name: "pedido_listo", category: "UTILITY", language: "es", status: "APPROVED", body: "Hola {{1}}, tu pedido {{2}} ya está listo para recoger.", rejected_reason: null },
    { name: "promo_sabado", category: "MARKETING", language: "es", status: "REJECTED", body: "¡Este sábado 2x1 en tortas, {{1}}!", rejected_reason: "INVALID_FORMAT" },
    { name: "recordatorio_cita", category: "UTILITY", language: "es", status: "PENDING", body: "Te esperamos mañana a las {{1}}.", rejected_reason: null },
  ],
  "/dashboard/reminders": { template_name: "recordatorio_cita", status: "APPROVED", rejected_reason: null, sending: true, cost_note: "Cada recordatorio cuesta unos Bs 0,20." },
  "/dashboard/knowledge": {
    knowledge: [
      { topic: "identidad", body: "Somos un salón de belleza en Sopocachi con 10 años de experiencia.", recorded_at: ago(60 * 72), recorded_by: { id: "u1", name: "Wara" } },
      { topic: "horarios", body: "Lunes a viernes de 9 a 18, sábados de 9 a 13.", recorded_at: ago(60 * 30), recorded_by: { id: "u1", name: "Wara" } },
      { topic: "medios_de_pago", body: "QR del BNB, transferencia y efectivo.", recorded_at: ago(60 * 5), recorded_by: null },
    ],
    unwritten_topics: ["ubicacion", "envios", "devoluciones", "preguntas_frecuentes", "tono", "reglas", "escalado", "otros"],
  },
  "/dashboard/operations": [
    { id: "o1", operation: "change_price", actor: { kind: "owner" }, status: "executed", rejection_code: null, payload: { product_code: "P1", unit_price: "120.00" }, result: {}, created_at: ago(15) },
    { id: "o2", operation: "confirm_payment", actor: { kind: "public_agent" }, status: "approval_created", rejection_code: null, payload: { order_code: "O-0112" }, result: null, created_at: ago(30) },
    { id: "o3", operation: "place_order", actor: { kind: "public_agent" }, status: "rejected", rejection_code: "NOT_ENOUGH_STOCK", payload: {}, result: null, created_at: ago(55) },
  ],
};

async function mockApi(page: Page) {
  await page.route(`${E2E_API_URL}/**`, async (route) => {
    if (route.request().method() === "OPTIONS") return route.fulfill({ status: 204, headers: CORS });
    const { pathname } = new URL(route.request().url());
    if (pathname in ANSWERS) return json(route, ANSWERS[pathname]);
    if (pathname.startsWith("/dashboard/pipeline/")) return json(route, []);
    return json(route, []);
  });
}

const SCREENS = [
  "/dashboard", "/dashboard/automation", "/dashboard/orders", "/dashboard/orders?code=O-0112", "/dashboard/sales",
  "/dashboard/sales/V-0107", "/dashboard/agenda", "/dashboard/approvals", "/dashboard/products",
  "/dashboard/products/new", "/dashboard/products/P1", "/dashboard/services", "/dashboard/services/S2",
  "/dashboard/hours", "/dashboard/knowledge", "/dashboard/templates", "/dashboard/activity", "/dashboard/settings",
];

const only = process.env.SCREENS?.split(",");

for (const [device, width, height] of [["m", 390, 844], ["d", 1440, 900]] as const) {
  for (const path of SCREENS.filter((p) => !only || only.includes(p))) {
    test(`${device} ${path}`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await page.emulateMedia({ reducedMotion: "reduce" });
      await signIn(page);
      await mockApi(page);
      await page.goto(path);
      await page.addStyleTag({ content: "nextjs-portal{display:none!important}" });
      await page.locator("h1").first().waitFor({ timeout: 60000 }).catch(() => {});
      await page.waitForTimeout(1200);
      const name = path.replace("/dashboard", "inicio").replace(/[/?=]/g, "_");
      await page.screenshot({ path: `.impeccable/review/all/${device}-${name}.png`, fullPage: true });
    });
  }
}

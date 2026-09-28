import { test, type Page } from "@playwright/test";
import { E2E_API_URL } from "../../playwright.config";
import { CORS, json, signIn } from "./owner";

const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/La_Paz" }).format(new Date());
const at = (hm: string) => `${today}T${hm}:00-04:00`;

const DONE = { line_connected: true, has_product: true, has_service: true, has_hours: true, has_knowledge: true, has_manager_phone: true };
const base = { sold_today: "1240.00", sales_today: 7, orders_to_collect: 3, orders_to_deliver: 0, pending_approvals: 2, handed_over: 1, messages_this_month: 812, free_messages_per_month: 1000, call_minutes_this_month: 34, call_minutes_per_month: 60, onboarding: DONE };
const scenes: Record<string, object> = {
  pend: base,
  ok: { ...base, orders_to_collect: 0, pending_approvals: 0, handed_over: 0 },
  alta: { ...base, sold_today: "0.00", sales_today: 0, orders_to_collect: 0, handed_over: 0, pending_approvals: 1, messages_this_month: 40, call_minutes_this_month: 0, onboarding: { ...DONE, has_knowledge: false, has_manager_phone: false } },
};

async function mock(page: Page, overview: object) {
  await page.route(`${E2E_API_URL}/**`, async (route) => {
    if (route.request().method() === "OPTIONS") return route.fulfill({ status: 204, headers: CORS });
    const { pathname } = new URL(route.request().url());
    if (pathname === "/dashboard/business") return json(route, { id: "b1", name: "Salón Wara", selling_enabled: true, booking_enabled: true, calendar_email: null });
    if (pathname === "/dashboard/overview") return json(route, overview);
    if (pathname === "/dashboard/sales") return json(route, (overview as { sales_today: number }).sales_today ? [
      { code: "V-0107", total: "120.00", payment_method: "cash", status: "registered", created_at: at("12:05"), voided_at: null },
      { code: "V-0106", total: "350.00", payment_method: "transfer", status: "registered", created_at: at("11:40"), voided_at: null },
      { code: "V-0105", total: "80.00", payment_method: "cash", status: "registered", created_at: at("10:12"), voided_at: null },
    ] : []);
    if (pathname === "/dashboard/agenda") return json(route, [
      { appointment_code: "A1", starts_at: at("08:00"), ends_at: at("09:00"), status: "attended", service_code: "s1", service: "Corte y lavado", professional_code: "p1", professional: "Wara", customer: "Carla Mamani", whatsapp_number: "59170000001" },
      { appointment_code: "A2", starts_at: at("23:00"), ends_at: at("23:59"), status: "booked", service_code: "s2", service: "Tinte completo", professional_code: "p1", professional: "Wara", customer: "Jorge Quispe", whatsapp_number: "59170000002" },
    ]);
    return json(route, []);
  });
}

scenes.big = { ...base, sold_today: "12480.00", sales_today: 23 };

for (const [name, overview] of Object.entries(scenes)) {
  for (const [device, width, height] of (name === "big" ? [["user-360", 360, 780]] : [["mobile", 390, 844], ["desktop", 1440, 900]]) as [string, number, number][]) {
    test(`capture ${name} ${device}`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await page.emulateMedia({ reducedMotion: "reduce" });
      await signIn(page);
      await mock(page, overview);
      await page.goto("/dashboard");
      await page.getByText("Minutos de llamadas").waitFor();
      await page.waitForTimeout(800);
      await page.screenshot({ path: device === "user-360" ? ".impeccable/review/user-360.png" : `.impeccable/review/${device}-${name}.png`, fullPage: true });
    });
  }
}

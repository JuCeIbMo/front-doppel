import { test, expect, type Page, type Route } from "@playwright/test";
import { E2E_API_URL } from "../../playwright.config";

/** The API lives on another origin, as in production, so every answer carries CORS headers. */
const CORS = {
  "access-control-allow-origin": "http://localhost:3101",
  "access-control-allow-headers": "authorization, content-type, idempotency-key",
  "access-control-allow-methods": "GET, POST, OPTIONS",
};

function json(route: Route, payload: unknown) {
  return route.fulfill({
    status: 200,
    headers: CORS,
    contentType: "application/json",
    body: JSON.stringify(payload),
  });
}

/** A signed-in Owner as supabase-js stores it, so no network call is needed to read it. */
async function signIn(page: Page) {
  await page.addInitScript(() => {
    const now = Math.floor(Date.now() / 1000);
    window.localStorage.setItem(
      "sb-e2e-auth-token",
      JSON.stringify({
        access_token: "e2e-access",
        refresh_token: "e2e-refresh",
        token_type: "bearer",
        expires_in: 3600,
        expires_at: now + 3600,
        user: { id: "owner-1", aud: "authenticated", email: "owner@e2e.test" },
      }),
    );
  });
}

async function mockApi(page: Page, confirmed: string[]) {
  await page.route(`${E2E_API_URL}/**`, async (route) => {
    if (route.request().method() === "OPTIONS") {
      return route.fulfill({ status: 204, headers: CORS });
    }
    const { pathname } = new URL(route.request().url());
    expect(route.request().headers()["authorization"]).toBe("Bearer e2e-access");
    if (pathname === "/dashboard/business") return json(route, { id: "biz-1", name: "Panadería" });
    if (pathname === "/dashboard/whatsapp-line") {
      return json(route, {
        phone_number_id: "pn-1",
        display_phone_number: "+591 70000000",
        public_agent_enabled: true,
      });
    }
    if (pathname === "/dashboard/manager-phones") return json(route, [{ phone: "59177777777" }]);
    if (pathname === "/dashboard/pipeline") {
      return json(route, [
        {
          id: "c1",
          contact_code: "AAAAAA",
          whatsapp_number: "59170000001",
          last_message_at: "2026-09-16T10:00:00Z",
          last_message_body: "Quiero dos barras",
          intervention_started_at: null,
        },
      ]);
    }
    if (pathname === "/dashboard/pipeline/c1/messages") return json(route, []);
    if (pathname === "/dashboard/orders") {
      return json(route, [
        {
          code: "ORDER1",
          status: "placed",
          total: "2.40",
          contact_code: "AAAAAA",
          whatsapp_number: "59170000001",
          placed_at: "2026-09-16T10:00:00Z",
          expires_at: "2026-09-17T10:00:00Z",
        },
      ]);
    }
    if (pathname === "/dashboard/orders/ORDER1") {
      return json(route, {
        code: "ORDER1",
        status: "placed",
        total: "2.40",
        placed_at: "2026-09-16T10:00:00Z",
        expires_at: "2026-09-17T10:00:00Z",
        ended_at: null,
        lines: [{ product_code: "P1", name: "Barra", quantity: 2, unit_price: "1.20" }],
        payment_proofs: [],
      });
    }
    if (pathname === "/operations/confirm_payment") {
      expect(route.request().headers()["idempotency-key"]).toBeTruthy();
      confirmed.push(route.request().postDataJSON().order_code);
      return json(route, { status: "executed", result: { order_code: "ORDER1" } });
    }
    return route.fulfill({ status: 404, headers: CORS, body: `unmocked ${pathname}` });
  });
}

test("a signed-in Owner reads the inbox, confirms an Order's payment and sees what is coming", async ({
  page,
}) => {
  const confirmed: string[] = [];
  await signIn(page);
  await mockApi(page, confirmed);
  page.on("dialog", (dialog) => dialog.accept());

  await page.goto("/dashboard/automation");
  await expect(page.getByRole("heading", { name: "Inbox de automatización" })).toBeVisible();
  await expect(page.getByText("Quiero dos barras").first()).toBeVisible();

  await page.getByRole("link", { name: "Pedidos" }).first().click();
  await page.getByRole("button", { name: "Ver" }).click();
  await expect(page.getByText("2 × Barra")).toBeVisible();
  await page.getByRole("button", { name: "Confirmar pago" }).click();
  await expect.poll(() => confirmed).toEqual(["ORDER1"]);

  await page.getByRole("link", { name: /Finanzas/ }).first().click();
  await expect(page.getByText("Próximamente")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Finanzas" })).toBeVisible();
});

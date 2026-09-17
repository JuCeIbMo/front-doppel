import type { Page, Route } from "@playwright/test";

/** The API lives on another origin, as in production, so every answer carries CORS headers. */
export const CORS = {
  "access-control-allow-origin": "http://localhost:3101",
  "access-control-allow-headers": "authorization, content-type, idempotency-key",
  "access-control-allow-methods": "GET, POST, OPTIONS",
};

export function json(route: Route, payload: unknown) {
  return route.fulfill({
    status: 200,
    headers: CORS,
    contentType: "application/json",
    body: JSON.stringify(payload),
  });
}

/** A signed-in Owner as supabase-js stores it, so no network call is needed to read it. */
export async function signIn(page: Page) {
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

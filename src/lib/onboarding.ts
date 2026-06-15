import { authenticatedFetch } from "@/lib/api";

/**
 * Whether the logged-in user already has a connected business (tenant).
 *
 * `/me/tenant` returns 200 when a tenant exists and 404 when the user still
 * needs to connect WhatsApp. Used to route returning users straight to the
 * dashboard after login instead of forcing them through the connect step again.
 * Network errors are treated as "not onboarded" so the worst case is showing the
 * (idempotent) connect step rather than crashing the login flow.
 */
export async function isOnboarded(): Promise<boolean> {
  try {
    const res = await authenticatedFetch("/me/tenant");
    return res.ok;
  } catch {
    return false;
  }
}

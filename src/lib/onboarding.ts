import { authenticatedFetch } from "@/lib/api";

/**
 * Whether the signed-in Owner already connected a WhatsApp Line. The API creates the
 * Business on first sign-in, so the Line is what separates a returning Owner from one
 * who still needs the connect step. Network errors count as "not onboarded": the worst
 * case is showing the connect step again rather than crashing the login flow.
 */
export async function isOnboarded(): Promise<boolean> {
  try {
    const res = await authenticatedFetch("/dashboard/whatsapp-line");
    return res.ok && (await res.json()) !== null;
  } catch {
    return false;
  }
}

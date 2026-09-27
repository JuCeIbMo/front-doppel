import { callApi } from "@/lib/api";

/**
 * Whether the signed-in Owner already connected a WhatsApp Line. The API creates the
 * Business on first sign-in, so the Line is what separates a returning Owner from one
 * who still needs the connect step. Network errors count as "not onboarded": the worst
 * case is showing the connect step again rather than crashing the login flow.
 */
export async function isOnboarded(): Promise<boolean> {
  try {
    return Boolean(await callApi<object | null>("/dashboard/whatsapp-line"));
  } catch {
    return false;
  }
}

/**
 * Whether the Business already has something of its own: a product, a Service, hours,
 * knowledge or a Manager phone. Only one that has nothing is asked whether it sells or
 * books, so an Owner who disconnected WhatsApp and comes back does not switch off what
 * their Business runs on. When unsure it answers true, for the same reason.
 */
export async function hasStarted(): Promise<boolean> {
  try {
    const { onboarding } = await callApi<{ onboarding: Record<string, boolean> }>(
      "/dashboard/overview",
    );
    return (
      onboarding.has_product ||
      onboarding.has_service ||
      onboarding.has_hours ||
      onboarding.has_knowledge ||
      onboarding.has_manager_phone
    );
  } catch {
    return true;
  }
}

import { apiFetch, apiRequest, getBrowserSessionStore } from "@/lib/api-client";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

/**
 * Calls the Doppel API as the signed-in Owner and answers the parsed body: the base URL
 * and the session are already set, and an error status throws an ApiError. Screens call
 * it through React Query, so a 401 reaches the one handler in AppProviders.
 */
export function callApi<T>(path: string, init: RequestInit = {}): Promise<T> {
  return apiFetch<T>(path, { ...init, baseUrl: API_URL, session: getBrowserSessionStore() });
}

/**
 * The raw Response with the Owner's Bearer token; it never throws on an error status and
 * does not refresh anything on a 401. Kept only for the Meta connect flow
 * (EmbeddedSignup); everything else uses `callApi`.
 */
export async function authenticatedFetch(
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  return apiRequest(path, {
    ...options,
    baseUrl: API_URL,
    session: getBrowserSessionStore(),
    throwOnError: false,
  });
}

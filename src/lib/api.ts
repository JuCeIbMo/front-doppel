import { apiRequest, getBrowserSessionStore } from "@/lib/api-client";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

/**
 * Fetch wrapper that adds Bearer token and auto-refreshes on 401.
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

import {
  getToken,
  setToken,
  getRefreshToken,
  setRefreshToken,
  clearToken,
} from "@/lib/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

/**
 * Fetch wrapper that adds Bearer token and auto-refreshes on 401.
 */
export async function authenticatedFetch(
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  const token = getToken();
  const headers = new Headers(options.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (!headers.has("Content-Type") && options.body)
    headers.set("Content-Type", "application/json");

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (res.status !== 401) return res;

  // Attempt token refresh
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    clearToken();
    return res;
  }

  const refreshRes = await fetch(`${API_URL}/auth/token/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  if (!refreshRes.ok) {
    clearToken();
    return res;
  }

  const data = await refreshRes.json();
  setToken(data.access_token);
  if (data.refresh_token) setRefreshToken(data.refresh_token);

  // Retry original request with new token
  const retryHeaders = new Headers(options.headers);
  retryHeaders.set("Authorization", `Bearer ${data.access_token}`);
  if (!retryHeaders.has("Content-Type") && options.body)
    retryHeaders.set("Content-Type", "application/json");

  return fetch(`${API_URL}${path}`, { ...options, headers: retryHeaders });
}

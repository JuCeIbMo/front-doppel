import { getAccessToken } from "@/lib/supabase";

export interface SessionStore {
  getAccessToken(): Promise<string | null> | string | null;
}

export class ApiError extends Error {
  status: number;
  code?: string;
  detail?: unknown;

  constructor({
    status,
    message,
    code,
    detail,
  }: {
    status: number;
    message: string;
    code?: string;
    detail?: unknown;
  }) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.detail = detail;
  }
}

export interface ApiRequestOptions extends RequestInit {
  baseUrl: string;
  fetcher?: typeof fetch;
  session?: SessionStore;
  skipAuth?: boolean;
  throwOnError?: boolean;
}

const browserSessionStore: SessionStore = { getAccessToken };

function withDefaultHeaders(options: RequestInit, accessToken?: string | null): RequestInit {
  const headers = new Headers(options.headers);
  const isFormDataBody = typeof FormData !== "undefined" && options.body instanceof FormData;

  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  if (options.body && !headers.has("Content-Type") && !isFormDataBody) {
    headers.set("Content-Type", "application/json");
  }

  return {
    ...options,
    headers,
  };
}

async function parseJsonSafe(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return null;
  return response.json().catch(() => null);
}

/**
 * The API answers errors as `{detail}`: an object `{code, message}` for its own
 * refusals, a plain string for simple ones, and a list for invalid input.
 */
export function readErrorDetail(detail: unknown): { code?: string; message?: string } {
  if (typeof detail === "string") return { message: detail };
  if (detail && typeof detail === "object" && !Array.isArray(detail)) {
    const { code, message } = detail as { code?: unknown; message?: unknown };
    return {
      code: typeof code === "string" ? code : undefined,
      message: typeof message === "string" ? message : undefined,
    };
  }
  if (Array.isArray(detail)) return { code: "invalid_input", message: "Revisa los datos ingresados." };
  return {};
}

export async function apiRequest(path: string, options: ApiRequestOptions): Promise<Response> {
  const {
    baseUrl,
    fetcher = fetch,
    session = browserSessionStore,
    skipAuth = false,
    throwOnError = true,
    ...init
  } = options;

  const accessToken = skipAuth ? null : await session.getAccessToken();
  const response = await fetcher(`${baseUrl}${path}`, withDefaultHeaders(init, accessToken));

  if (!response.ok && throwOnError) {
    const payload = (await parseJsonSafe(response)) as { detail?: unknown } | null;
    const { code, message } = readErrorDetail(payload?.detail);
    throw new ApiError({
      status: response.status,
      code,
      message: message ?? "Ocurrió un error inesperado.",
      detail: payload?.detail,
    });
  }

  return response;
}

export async function apiFetch<T>(path: string, options: ApiRequestOptions): Promise<T> {
  const response = await apiRequest(path, options);

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export function getBrowserSessionStore(): SessionStore {
  return browserSessionStore;
}

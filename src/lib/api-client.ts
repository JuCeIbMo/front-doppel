import { clearTokens, readTokens, writeTokens, type StoredTokens } from "@/lib/session";

export interface SessionStore {
  getAccessToken(): Promise<string | null> | string | null;
  getRefreshToken(): Promise<string | null> | string | null;
  setTokens(tokens: StoredTokens): Promise<void> | void;
  clear(): Promise<void> | void;
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

const browserSessionStore: SessionStore = {
  async getAccessToken() {
    return readTokens().accessToken;
  },
  async getRefreshToken() {
    return readTokens().refreshToken;
  },
  async setTokens(tokens) {
    writeTokens(tokens);
  },
  async clear() {
    clearTokens();
  },
};

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

async function refreshAccessToken(
  baseUrl: string,
  fetcher: typeof fetch,
  session: SessionStore,
): Promise<string | null> {
  const refreshToken = await session.getRefreshToken();
  if (!refreshToken) {
    await session.clear();
    return null;
  }

  const response = await fetcher(`${baseUrl}/auth/token/refresh`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    await session.clear();
    return null;
  }

  const payload = (await response.json()) as {
    access_token: string;
    refresh_token?: string | null;
    expires_in?: number;
  };

  await session.setTokens({
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token,
    expiresIn: payload.expires_in,
  });

  return payload.access_token;
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
  let response = await fetcher(`${baseUrl}${path}`, withDefaultHeaders(init, accessToken));

  if (response.status === 401 && !skipAuth) {
    const refreshedAccessToken = await refreshAccessToken(baseUrl, fetcher, session);
    if (!refreshedAccessToken) {
      if (!throwOnError) {
        return response;
      }
      throw new ApiError({
        status: 401,
        code: "unauthorized",
        message: "Tu sesión expiró. Volvé a iniciar sesión.",
      });
    }

    response = await fetcher(
      `${baseUrl}${path}`,
      withDefaultHeaders(init, refreshedAccessToken),
    );
  }

  if (!response.ok && throwOnError) {
    const payload = (await parseJsonSafe(response)) as
      | {
          error?: string;
          code?: string;
          message?: string;
          detail?: unknown;
        }
      | null;

    throw new ApiError({
      status: response.status,
      code: payload?.error ?? payload?.code,
      message: payload?.message ?? "Ocurrió un error inesperado.",
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

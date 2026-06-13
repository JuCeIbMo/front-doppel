const ACCESS_TOKEN_KEY = "doppel_token";
const REFRESH_TOKEN_KEY = "doppel_refresh_token";

export interface TokenSnapshot {
  accessToken: string | null;
  refreshToken: string | null;
}

export interface StoredTokens {
  accessToken: string;
  refreshToken?: string | null;
  expiresIn?: number | null;
}

export function readTokens(): TokenSnapshot {
  if (typeof window === "undefined") {
    return {
      accessToken: null,
      refreshToken: null,
    };
  }

  return {
    accessToken: window.localStorage.getItem(ACCESS_TOKEN_KEY),
    refreshToken: window.localStorage.getItem(REFRESH_TOKEN_KEY),
  };
}

export function writeTokens(tokens: StoredTokens): void {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);

  if (tokens.refreshToken) {
    window.localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
  }
}

export function clearTokens(): void {
  if (typeof window === "undefined") return;

  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  window.localStorage.removeItem(REFRESH_TOKEN_KEY);
}

import { type SessionStore } from "@/lib/api-client";
import { type StoredTokens } from "@/lib/session";

const CASHIER_TOKEN_KEY = "cashier_access_token";
const CASHIER_EXPIRES_KEY = "cashier_expires_at";

export function getCashierToken(): string | null {
  if (typeof window === "undefined") return null;
  const token = sessionStorage.getItem(CASHIER_TOKEN_KEY);
  const expiresAt = Number(sessionStorage.getItem(CASHIER_EXPIRES_KEY) ?? "0");
  if (!token || (expiresAt > 0 && Date.now() > expiresAt)) return null;
  return token;
}

export function setCashierToken(token: string, expiresIn: number): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(CASHIER_TOKEN_KEY, token);
  sessionStorage.setItem(
    CASHIER_EXPIRES_KEY,
    String(Date.now() + expiresIn * 1000),
  );
}

export function clearCashierToken(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(CASHIER_TOKEN_KEY);
  sessionStorage.removeItem(CASHIER_EXPIRES_KEY);
}

export const cashierSessionStore: SessionStore = {
  getAccessToken: () => getCashierToken(),
  getRefreshToken: () => null, // no refresh for cashier; 401 = re-enter PIN
  setTokens: (tokens: StoredTokens) => {
    setCashierToken(tokens.accessToken, tokens.expiresIn ?? 28800);
  },
  clear: () => clearCashierToken(),
};

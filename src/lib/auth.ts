import { clearTokens, readTokens, writeTokens } from "@/lib/session";

export function getToken(): string | null {
  return readTokens().accessToken;
}

export function setToken(token: string): void {
  writeTokens({ accessToken: token, refreshToken: readTokens().refreshToken });
}

export function getRefreshToken(): string | null {
  return readTokens().refreshToken;
}

export function setRefreshToken(token: string): void {
  writeTokens({ accessToken: readTokens().accessToken ?? "", refreshToken: token });
}

export function clearToken(): void {
  clearTokens();
}

"use client";

import { useSyncExternalStore } from "react";
import { readTokens } from "@/lib/session";

/**
 * Whether the visitor has a session to resume. Returns `null` on the server and
 * during hydration so markup matches (no mismatch), then resolves to a boolean on
 * the client. A session counts as present when either an access or a refresh token
 * exists — the same recoverable-session notion as `useRequireAuth`. Lets the
 * marketing navbar show "Ir al dashboard" for returning users and "Iniciar sesión"
 * for everyone else.
 *
 * Implemented with useSyncExternalStore: the canonical way to read a client-only
 * value without a hydration flash or a set-state-in-effect. Token changes mid-page
 * don't need to be reactive here, so `subscribe` is a no-op.
 */
function subscribe(): () => void {
  return () => {};
}

function getSnapshot(): boolean | null {
  const { accessToken, refreshToken } = readTokens();
  return Boolean(accessToken || refreshToken);
}

function getServerSnapshot(): boolean | null {
  return null;
}

export function useHasSession(): boolean | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

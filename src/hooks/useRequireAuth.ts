"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { readTokens } from "@/lib/session";

/**
 * Client-side guard for owner-only routes. If there is no session to work with
 * (neither an access token nor a refresh token), bounce to the login page instead
 * of rendering a dashboard that can only spam the API with unauthenticated calls
 * (which now correctly 401). A lone refresh token counts as a recoverable session
 * — the API client refreshes it on demand — so those are let through.
 */
export function useRequireAuth(): void {
  const router = useRouter();

  useEffect(() => {
    const { accessToken, refreshToken } = readTokens();
    if (!accessToken && !refreshToken) {
      router.replace("/");
    }
  }, [router]);
}

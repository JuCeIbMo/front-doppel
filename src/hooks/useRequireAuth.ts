"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getAccessToken } from "@/lib/supabase";

/**
 * Client-side guard for owner-only routes: with no session, bounce to the landing
 * page instead of rendering a dashboard whose every call would answer 401.
 */
export function useRequireAuth(): void {
  const router = useRouter();

  useEffect(() => {
    getAccessToken().then((token) => {
      if (token === null) router.replace("/");
    });
  }, [router]);
}

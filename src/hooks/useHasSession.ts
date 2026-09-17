"use client";

import { useEffect, useState } from "react";
import { getAccessToken } from "@/lib/supabase";

/**
 * Whether the visitor has a session to resume. `null` on the server and until the
 * browser answers, so markup matches during hydration. Lets the marketing navbar show
 * "Ir al dashboard" for returning users and "Iniciar sesión" for everyone else.
 */
export function useHasSession(): boolean | null {
  const [hasSession, setHasSession] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    getAccessToken().then((token) => {
      if (active) setHasSession(token !== null);
    });
    return () => {
      active = false;
    };
  }, []);

  return hasSession;
}

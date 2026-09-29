"use client";

import Link from "next/link";
import { useHasSession } from "@/hooks/useHasSession";

/** Where the Owner's panel opens: Inicio, which lists whatever is still missing. */
export const PANEL_HREF = "/dashboard";

/**
 * The landing's main button. A visitor hires the employee (/connect); an Owner who is
 * already signed in has nothing to hire and goes straight to their panel instead.
 */
export function HireLink({ className, tabIndex }: { className: string; tabIndex?: number }) {
  const hasSession = useHasSession();
  return hasSession ? (
    <Link href={PANEL_HREF} className={className} tabIndex={tabIndex}>
      Ir a mi panel →
    </Link>
  ) : (
    <Link href="/connect" className={className} tabIndex={tabIndex}>
      Contratar a mi empleado →
    </Link>
  );
}

/** "¿Ya tienes cuenta?" for visitors; an Owner already signed in does not need it. */
export function LoginHint() {
  const hasSession = useHasSession();
  if (hasSession) return null;
  return (
    <p className="mt-4 text-sm font-semibold md:text-base">
      ¿Ya tienes cuenta?{" "}
      <Link href="/connect" className="inline-flex min-h-11 items-center underline underline-offset-4">
        Iniciar sesión
      </Link>
    </p>
  );
}

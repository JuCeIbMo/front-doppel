"use client";

import Link from "next/link";
import { useHasSession } from "@/hooks/useHasSession";
import { HireLink, PANEL_HREF } from "@/components/landing/HireLink";

/**
 * The marketing bar: the name, and the way in. A signed-in Owner gets only "Ir a mi
 * panel". A visitor gets "Iniciar sesión" and, on a computer, the main button too (on a
 * phone it sticks to the bottom of the screen instead). Auth is passwordless OTP, so
 * logging in and signing up are the same /connect flow. `null` (session unknown before
 * mount) renders the logged-out view, the common landing case.
 */
export function Navbar() {
  const hasSession = useHasSession();

  return (
    <nav className="fixed inset-x-0 top-0 z-50 px-3 pt-3 md:px-6 md:pt-4">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 rounded-2xl border-[3px] border-ink bg-waiting px-3 shadow-[3px_3px_0_var(--color-ink)] md:h-16 md:px-4">
        <Link
          href="/"
          className="font-display text-[28px] font-black tracking-wide text-paper [font-stretch:75%] [paint-order:stroke_fill] [-webkit-text-stroke:1.5px_var(--color-ink)] md:text-[34px]"
        >
          DOPPEL
        </Link>
        {hasSession ? (
          <Link href={PANEL_HREF} className={pill}>
            Ir a mi panel →
          </Link>
        ) : (
          <div className="flex items-center gap-3">
            <Link href="/connect" className={pill}>
              Iniciar sesión
            </Link>
            <HireLink className={`${pillShape} hidden bg-ink text-paper md:inline-block`} />
          </div>
        )}
      </div>
    </nav>
  );
}

const pillShape =
  "rounded-xl border-[2.5px] border-ink px-3 py-2 text-sm font-extrabold shadow-[2px_2px_0_var(--color-ink)] transition-transform hover:-translate-y-0.5 md:px-4 md:text-base";
const pill = `${pillShape} bg-paper text-ink`;

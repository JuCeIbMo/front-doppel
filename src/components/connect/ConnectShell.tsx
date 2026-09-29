"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { BusinessSwitch } from "@/lib/business";
import { HiredEmployee, type HireStage } from "./HiredEmployee";

const STEPS = ["Tu correo", "Qué hará", "Tu WhatsApp"];

/**
 * Every onboarding screen: hiring the employee the landing promised. The employee stands
 * on top and says what this step needs, dressed as far as the hiring has gone; below it,
 * the three numbered steps and the step's own form.
 */
export function ConnectShell({
  stage,
  kind,
  says,
  step,
  children,
}: {
  stage: HireStage;
  kind?: BusinessSwitch | null;
  /** What the employee tells the Owner on this screen. */
  says: string;
  /** Which of the three steps this is (0-based); omitted once they are all done. */
  step?: number;
  children: ReactNode;
}) {
  return (
    <div className="landing font-body min-h-svh bg-money px-3 pt-3 pb-10 text-ink md:px-6 md:pt-4">
      <header className="mx-auto flex h-14 max-w-xl items-center md:h-16 md:max-w-5xl rounded-2xl border-[3px] border-ink bg-waiting px-3 shadow-[3px_3px_0_var(--color-ink)]">
        <Link
          href="/"
          className="font-display text-[28px] font-black tracking-wide text-paper [font-stretch:75%] [paint-order:stroke_fill] [-webkit-text-stroke:1.5px_var(--color-ink)] md:text-[34px]"
        >
          DOPPEL
        </Link>
      </header>

      <main className="mx-auto max-w-md px-2 md:mt-10 md:grid md:max-w-5xl md:grid-cols-2 md:items-center md:gap-14">
        <div className="mt-6 flex h-44 items-end gap-2 md:mt-0 md:h-auto md:flex-col-reverse md:items-center md:gap-4">
          <div className="h-full flex-none md:h-[400px]">
            <HiredEmployee stage={stage} kind={kind} />
          </div>
          <AnimatePresence mode="wait">
            <motion.p
              key={says}
              initial={{ opacity: 0, y: 8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="mb-24 rounded-2xl rounded-bl-sm border-[2.5px] border-ink bg-paper px-4 py-3 text-[15px] leading-snug font-bold shadow-[3px_3px_0_var(--color-ink)] md:mb-0 md:max-w-sm md:rounded-bl-2xl md:px-6 md:py-4 md:text-2xl"
              aria-live="polite"
            >
              {says}
            </motion.p>
          </AnimatePresence>
        </div>

        <div>
        {step !== undefined && (
          <ol className="mt-4 flex gap-2" aria-label="Pasos para contratar a tu empleado">
            {STEPS.map((label, i) => (
              <li
                key={label}
                aria-current={i === step ? "step" : undefined}
                className={`flex flex-1 items-center gap-2 rounded-xl border-[2.5px] border-ink px-2 py-2 text-xs font-extrabold md:px-3 md:text-sm shadow-[2px_2px_0_var(--color-ink)] ${
                  i < step ? "bg-settled text-white" : i === step ? "bg-paper" : "bg-money"
                }`}
              >
                <span className="font-display text-lg leading-none font-black">{i < step ? "✓" : i + 1}</span>
                {label}
              </li>
            ))}
          </ol>
        )}

        <div className="mt-4 rounded-2xl border-[3px] border-ink bg-paper p-5 shadow-[5px_5px_0_var(--color-ink)] md:p-8">
          {children}
        </div>
        </div>
      </main>
    </div>
  );
}

/** The heading every step card opens with. */
export function StepTitle({ children }: { children: ReactNode }) {
  return (
    <h1 className="font-display text-[34px] leading-[0.95] font-black text-balance uppercase [font-stretch:75%] md:text-5xl">{children}</h1>
  );
}

export const fieldClass =
  "w-full rounded-xl border-[2.5px] border-ink bg-white px-4 py-3.5 text-lg font-semibold text-ink outline-none placeholder:text-ink-muted focus:shadow-[3px_3px_0_var(--color-steps)] disabled:opacity-60";

export const primaryClass =
  "inline-flex min-h-13 w-full items-center justify-center gap-2 rounded-xl border-[3px] border-ink bg-ink px-5 text-base font-extrabold text-paper shadow-[4px_4px_0_var(--color-waiting)] transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0";

export function Spinner() {
  return <span className="size-5 animate-spin rounded-full border-[3px] border-current border-t-transparent" aria-hidden="true" />;
}

export function ErrorNote({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="mt-4 rounded-lg border-2 border-waiting bg-waiting/10 px-3 py-2 text-sm font-bold text-waiting">
      {children}
    </p>
  );
}

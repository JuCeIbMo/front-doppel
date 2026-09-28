import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";

export interface OnboardingStep {
  label: string;
  done: boolean;
  /** Where the step is done in the panel; without one, `hint` says how. */
  href?: string;
  hint?: string;
}

/**
 * The first steps of a new Business, numbered in the notebook's margin; Inicio shows it
 * only while one is missing. The first step still to do is the one to do now.
 */
export function OnboardingChecklist({ steps }: { steps: OnboardingStep[] }) {
  const done = steps.filter((step) => step.done).length;
  const current = steps.findIndex((step) => !step.done);
  return (
    <section aria-label="Pon a funcionar tu bot" className="mt-7">
      <h2 className="font-display text-[28px] font-black leading-none text-steps [font-stretch:78%]">
        {done} de {steps.length} pasos listos
      </h2>
      <ol className="mt-2">
        {steps.map((step, index) => {
          const isCurrent = index === current;
          const mark = (
            <span
              aria-hidden
              className={`absolute ${isCurrent ? "-left-[38px]" : "-left-[46px]"} flex h-6 w-6 items-center justify-center border-2 font-display text-xs font-black ${
                step.done
                  ? "border-settled bg-settled text-white"
                  : isCurrent
                    ? "border-steps bg-paper text-steps"
                    : "border-ink"
              }`}
            >
              {step.done ? <Check size={14} strokeWidth={3.5} /> : index + 1}
            </span>
          );
          const row = `relative flex min-h-[42px] items-center gap-3 border-b border-paper-rule py-2 text-[15px] ${
            isCurrent ? "-ml-2 bg-steps pl-2 pr-0 font-extrabold text-white" : ""
          }`;

          if (step.done) {
            return (
              <li key={step.label} className={`${row} text-ink-muted`}>
                {mark}
                <span className="line-through">{step.label}</span>
                <span className="sr-only">(listo)</span>
              </li>
            );
          }
          return (
            <li key={step.label} className={row}>
              {mark}
              {step.href ? (
                <Link
                  href={step.href}
                  className={`flex flex-1 items-center justify-between gap-3 ${isCurrent ? "" : "hover:text-steps"}`}
                >
                  <span>{step.label}</span>
                  <ArrowRight aria-hidden size={18} className={isCurrent ? "text-white" : "text-ink-muted"} />
                </Link>
              ) : (
                <span>
                  {step.label}
                  {step.hint && <span className="block text-sm font-normal text-ink-muted">{step.hint}</span>}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

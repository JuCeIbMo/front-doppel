import Link from "next/link";

export interface OnboardingStep {
  label: string;
  done: boolean;
  href: string;
}

/** The first steps of a new Business; Inicio shows it only while one is missing. */
export function OnboardingChecklist({ steps }: { steps: OnboardingStep[] }) {
  const done = steps.filter((step) => step.done).length;
  return (
    <div className="rounded-2xl border border-accent/30 bg-accent/5 p-6">
      <p className="font-semibold text-text-primary">Pon a funcionar tu bot</p>
      <p className="mt-1 text-sm text-text-secondary">
        {done} de {steps.length} pasos listos.
      </p>
      <ul className="mt-4 space-y-3">
        {steps.map((step) => (
          <li key={step.href} className="flex items-center gap-3">
            <span
              aria-hidden
              className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                step.done ? "bg-accent text-black" : "border border-border text-text-secondary"
              }`}
            >
              {step.done ? "✓" : ""}
            </span>
            {step.done ? (
              <span className="text-sm text-text-secondary line-through">{step.label}</span>
            ) : (
              <Link
                href={step.href}
                className="text-sm text-text-primary transition-colors hover:text-accent"
              >
                {step.label} →
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

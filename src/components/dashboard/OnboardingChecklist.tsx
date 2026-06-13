"use client";
import Link from "next/link";

interface Step {
  label: string;
  done: boolean;
  href: string;
}

interface OnboardingChecklistProps {
  steps: Step[];
  onDismiss: () => void;
}

export function OnboardingChecklist({ steps, onDismiss }: OnboardingChecklistProps) {
  return (
    <div className="rounded-2xl border border-accent/30 bg-accent/5 p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="font-semibold text-text-primary">¡Bienvenido a Doppel ERP!</p>
          <p className="text-sm text-text-secondary mt-1">Completá estos pasos para comenzar.</p>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="text-text-secondary hover:text-text-primary text-sm"
        >
          Descartar
        </button>
      </div>
      <ul className="space-y-3">
        {steps.map((step) => (
          <li key={step.href} className="flex items-center gap-3">
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
              step.done ? "bg-accent text-black" : "border border-border text-text-secondary"
            }`}>
              {step.done ? "✓" : ""}
            </span>
            {step.done ? (
              <span className="text-sm text-text-secondary line-through">{step.label}</span>
            ) : (
              <Link href={step.href} className="text-sm text-text-primary hover:text-accent transition-colors">
                {step.label} →
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

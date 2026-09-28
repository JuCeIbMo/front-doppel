import { forwardRef } from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  function Input({ label, error, className = "", id, ...props }, ref) {
    const inputId = id ?? (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-xs font-medium text-text-muted uppercase tracking-wide paper:font-display paper:font-extrabold paper:tracking-[0.12em] paper:text-ink"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`w-full rounded-lg border border-border bg-bg-elevated px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent/40 focus:border-accent/40 transition-colors paper:min-h-11 paper:rounded-none paper:border-ink/35 paper:bg-paper paper:text-[15px] paper:placeholder:text-ink-muted/70 paper:focus:border-ink paper:focus:ring-0 ${className}`}
          {...props}
        />
        {error && <p className="text-xs text-danger">{error}</p>}
      </div>
    );
  }
);

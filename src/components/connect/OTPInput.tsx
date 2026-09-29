"use client";

import { useRef, useState, useCallback, type KeyboardEvent, type ClipboardEvent } from "react";

interface OTPInputProps {
  length?: number;
  onComplete: (code: string) => void;
  disabled?: boolean;
  error?: boolean;
}

export function OTPInput({ length = 6, onComplete, disabled = false, error = false }: OTPInputProps) {
  const [values, setValues] = useState<string[]>(Array(length).fill(""));
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  const focusInput = useCallback((index: number) => {
    inputs.current[index]?.focus();
  }, []);

  const handleChange = useCallback(
    (index: number, digit: string) => {
      if (!/^\d?$/.test(digit)) return;

      const next = [...values];
      next[index] = digit;
      setValues(next);

      if (digit && index < length - 1) {
        focusInput(index + 1);
      }

      if (digit && next.every((v) => v !== "")) {
        onComplete(next.join(""));
      }
    },
    [values, length, focusInput, onComplete],
  );

  const handleKeyDown = useCallback(
    (index: number, e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Backspace" && !values[index] && index > 0) {
        focusInput(index - 1);
      }
    },
    [values, focusInput],
  );

  const handlePaste = useCallback(
    (e: ClipboardEvent<HTMLInputElement>) => {
      e.preventDefault();
      const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
      if (!pasted) return;

      const next = [...values];
      for (let i = 0; i < pasted.length; i++) {
        next[i] = pasted[i];
      }
      setValues(next);

      if (next.every((v) => v !== "")) {
        onComplete(next.join(""));
      } else {
        focusInput(pasted.length);
      }
    },
    [values, length, focusInput, onComplete],
  );

  return (
    <div className="grid grid-cols-6 gap-2">
      {values.map((val, i) => (
        <input
          key={i}
          ref={(el) => { inputs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={val}
          disabled={disabled}
          autoFocus={i === 0}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={i === 0 ? handlePaste : undefined}
          aria-label={`Número ${i + 1} del código`}
          className={`h-14 w-full min-w-0 rounded-xl border-[2.5px] bg-white text-center font-hand text-2xl font-bold text-steps outline-none transition-shadow focus:shadow-[3px_3px_0_var(--color-steps)]
            ${error ? "animate-shake border-waiting" : "border-ink"}
            ${disabled ? "cursor-not-allowed opacity-50" : ""}
          `}
        />
      ))}
    </div>
  );
}

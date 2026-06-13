"use client";
import { useState } from "react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { setCashierToken, cashierSessionStore } from "@/lib/cashier-session";
import type { PinLoginResponse } from "@/lib/erp-types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";
const MAX_DIGITS = 6;

interface Props {
  onLoginSuccess: () => void;
}

export function PinLoginScreen({ onLoginSuccess }: Props) {
  const [digits, setDigits] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submitPin(pin: string) {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<PinLoginResponse>("/erp/auth/pin/login", {
        baseUrl: API_URL,
        session: cashierSessionStore,
        method: "POST",
        skipAuth: true,
        body: JSON.stringify({ pin }),
      });
      setCashierToken(data.access_token, data.expires_in);
      onLoginSuccess();
    } catch (err) {
      navigator.vibrate?.([200, 100, 200]);
      setDigits("");
      if (err instanceof ApiError && err.status >= 400 && err.status < 500) {
        setError("PIN incorrecto");
      } else {
        setError("Error de conexión. Intenta de nuevo.");
      }
    } finally {
      setLoading(false);
    }
  }

  function handleDigit(d: string) {
    if (loading) return;
    const next = digits + d;
    if (next.length > MAX_DIGITS) return;
    setDigits(next);
    setError(null);
    if (next.length === MAX_DIGITS) {
      void submitPin(next);
    }
  }

  function handleBackspace() {
    if (loading) return;
    setDigits((prev) => prev.slice(0, -1));
    setError(null);
  }

  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 px-4">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight">Doppel Caja</h1>
        <p className="mt-2 text-gray-400">Ingresá tu PIN para continuar</p>
      </div>

      {/* PIN display */}
      <div className="flex gap-3">
        {Array.from({ length: MAX_DIGITS }).map((_, i) => (
          <div
            key={i}
            className={`h-5 w-5 rounded-full border-2 ${
              i < digits.length
                ? "border-white bg-white"
                : "border-gray-500 bg-transparent"
            }`}
          />
        ))}
      </div>

      {/* Error message */}
      {error && (
        <p className="text-sm font-medium text-red-400">{error}</p>
      )}

      {/* Numeric keypad */}
      <div className="grid grid-cols-3 gap-3">
        {keys.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => handleDigit(key)}
            disabled={loading}
            className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-700 text-xl font-semibold transition-colors hover:bg-gray-600 active:bg-gray-500 disabled:opacity-50"
          >
            {key}
          </button>
        ))}
        {/* Bottom row: empty, 0, backspace */}
        <div className="h-16 w-16" />
        <button
          type="button"
          onClick={() => handleDigit("0")}
          disabled={loading}
          className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-700 text-xl font-semibold transition-colors hover:bg-gray-600 active:bg-gray-500 disabled:opacity-50"
        >
          0
        </button>
        <button
          type="button"
          onClick={handleBackspace}
          disabled={loading || digits.length === 0}
          className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-700 text-xl font-semibold transition-colors hover:bg-gray-600 active:bg-gray-500 disabled:opacity-50"
          aria-label="Borrar"
        >
          ⌫
        </button>
      </div>

      {loading && (
        <p className="text-sm text-gray-400">Verificando...</p>
      )}
    </div>
  );
}

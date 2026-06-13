"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { apiFetch, ApiError, getBrowserSessionStore } from "@/lib/api-client";
import { clearToken } from "@/lib/auth";
import type { PinSetResponse } from "@/lib/erp-types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

async function getCategories() {
  return apiFetch<string[]>("/erp/finance/categories", {
    baseUrl: API_URL,
    session: getBrowserSessionStore(),
  });
}

export function ErpSettingsView() {
  const router = useRouter();
  // PIN state
  const [generatedPin, setGeneratedPin] = useState<string | null>(null);
  const [pinCopied, setPinCopied] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [confirmDisablePinOpen, setConfirmDisablePinOpen] = useState(false);


  // Ref for focusing the copy button when the PIN modal opens
  const copyBtnRef = useRef<HTMLButtonElement>(null);

  // Countdown effect — starts ticking whenever generatedPin is set.
  // State is reset to 60 / false in the mutation onSuccess before this runs.
  useEffect(() => {
    if (generatedPin === null) return;
    copyBtnRef.current?.focus();
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [generatedPin]);

  // Categories query
  const categoriesQuery = useQuery({
    queryKey: ["settings-categories"],
    queryFn: getCategories,
  });

  // Generate PIN mutation
  const generatePinMutation = useMutation({
    mutationFn: async () => {
      return apiFetch<PinSetResponse>("/erp/auth/pin/set", {
        baseUrl: API_URL,
        session: getBrowserSessionStore(),
        method: "POST",
      });
    },
    onSuccess: (data) => {
      // Reset per-PIN UI state before opening modal so the effect only sets the interval
      setPinCopied(false);
      setCountdown(60);
      setGeneratedPin(data.pin);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "No se pudo generar el PIN.");
    },
  });

  // Disable PIN mutation
  const disablePinMutation = useMutation({
    mutationFn: async () => {
      return apiFetch<void>("/erp/auth/pin", {
        baseUrl: API_URL,
        session: getBrowserSessionStore(),
        method: "DELETE",
      });
    },
    onSuccess: () => {
      setConfirmDisablePinOpen(false);
      toast.success("PIN deshabilitado");
    },
    onError: () => {
      // Inline modal error display is sufficient; no toast needed here.
    },
  });


  if (categoriesQuery.error instanceof ApiError && categoriesQuery.error.status === 401) {
    clearToken();
    router.replace("/connect");
    return null;
  }

  const categories = categoriesQuery.data ?? [];

  function handleCopyPin() {
    if (!generatedPin) return;
    navigator.clipboard.writeText(generatedPin).then(() => {
      setPinCopied(true);
    }).catch(() => {
      toast.error("No se pudo copiar el PIN.");
    });
  }

  function handleClosePin() {
    setGeneratedPin(null);
    setPinCopied(false);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Configuración</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Gestión de PIN de cajero y categorías financieras.
        </p>
      </div>

      {/* PIN section */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <h2 className="text-lg font-semibold">PIN de cajero</h2>
        <p className="mt-2 text-sm text-text-secondary">
          El PIN solo se mostrará una vez. Asegurate de copiarlo antes de cerrar.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <Button
            variant="secondary"
            className="px-5 py-3 text-sm"
            onClick={() => generatePinMutation.mutate()}
            disabled={generatePinMutation.isPending}
          >
            {generatePinMutation.isPending ? "Generando..." : "Generar PIN cajero"}
          </Button>
          <button
            type="button"
            className="text-sm text-red-400 hover:text-red-300"
            onClick={() => setConfirmDisablePinOpen(true)}
          >
            Deshabilitar PIN
          </button>
        </div>
      </div>

      {/* Categories section */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <h2 className="text-lg font-semibold">Categorías financieras</h2>
        <p className="mt-2 text-sm text-text-secondary">
          Las categorías se generan automáticamente a partir de las transacciones registradas.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          {categoriesQuery.isLoading ? (
            <p className="text-sm text-text-secondary">Cargando...</p>
          ) : categories.length === 0 ? (
            <p className="text-sm text-text-secondary">
              Sin categorías. Se crean al registrar transacciones.
            </p>
          ) : (
            categories.map((category) => (
              <span
                key={category}
                className="rounded-full bg-white/8 px-3 py-1 text-xs text-text-secondary"
              >
                {category}
              </span>
            ))
          )}
        </div>
      </div>

      {/* PIN display modal — no click-outside close, intentional */}
      {generatedPin !== null ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div
            className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#111] p-6"
            role="dialog"
            aria-modal="true"
            aria-labelledby="pin-modal-title"
          >
            <h2 id="pin-modal-title" className="text-xl font-semibold">PIN generado</h2>
            <p className="mt-2 text-sm text-text-secondary">
              Este PIN solo se mostrará una vez. Cópialo antes de cerrar.
            </p>

            <div className="mt-6 flex justify-center">
              <span className="text-4xl font-mono tracking-widest">{generatedPin}</span>
            </div>

            <div className="mt-6 flex flex-col items-center gap-3">
              <Button
                ref={copyBtnRef}
                variant="primary"
                className="w-full px-5 py-3 text-sm"
                onClick={handleCopyPin}
              >
                {pinCopied ? "¡Copiado!" : "Copiar"}
              </Button>
              <p className="text-sm text-text-secondary">
                {countdown > 0 ? `Puedes cerrar en: ${countdown}s` : "Podés cerrar ahora"}
              </p>
              <button
                type="button"
                className="text-sm text-text-secondary hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-40"
                onClick={handleClosePin}
                disabled={!pinCopied && countdown > 0}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Confirm disable PIN modal */}
      {confirmDisablePinOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
          onClick={() => setConfirmDisablePinOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#111] p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 className="text-xl font-semibold">Deshabilitar PIN</h2>
            <p className="mt-2 text-sm text-text-secondary">
              ¿Estás seguro que deseas deshabilitar el PIN de cajero?
            </p>
            {disablePinMutation.isError ? (
              <p className="mt-4 text-sm text-red-400">
                {disablePinMutation.error instanceof Error
                  ? disablePinMutation.error.message
                  : "No se pudo deshabilitar el PIN."}
              </p>
            ) : null}
            <div className="mt-6 flex justify-end gap-3">
              <Button
                variant="ghost"
                className="px-5 py-3 text-sm"
                onClick={() => setConfirmDisablePinOpen(false)}
              >
                Cancelar
              </Button>
              <button
                type="button"
                className="rounded-2xl px-5 py-3 text-sm text-red-400 hover:text-red-300 disabled:opacity-50"
                onClick={() => disablePinMutation.mutate()}
                disabled={disablePinMutation.isPending}
              >
                {disablePinMutation.isPending ? "Deshabilitando..." : "Deshabilitar"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

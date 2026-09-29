"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { OTPInput } from "@/components/connect/OTPInput";
import { EmbeddedSignup } from "@/components/connect/EmbeddedSignup";
import { SWITCH_SAYS, chooseKind, type BusinessSwitch } from "@/lib/business";
import { hasStarted, isOnboarded } from "@/lib/onboarding";
import { getAccessToken, getSupabase } from "@/lib/supabase";
import { ConnectShell, ErrorNote, Spinner, StepTitle, fieldClass, primaryClass } from "@/components/connect/ConnectShell";
import type { HireStage } from "@/components/connect/HiredEmployee";

type Step = "email" | "otp" | "kind" | "connect";

/** Where each screen sits among the three steps, how dressed the employee is, and what it says. */
const SCREENS: Record<Step, { step: number; stage: HireStage; says: string }> = {
  email: { step: 0, stage: 0, says: "¡Hola! Soy tu nuevo empleado. ¿A qué correo te escribo?" },
  otp: { step: 0, stage: 0, says: "Te mandé un código de 6 números. Revisa tu correo." },
  kind: { step: 1, stage: 1, says: "¿Qué hago en tu negocio?" },
  connect: { step: 2, stage: 2, says: "Dame tu WhatsApp y empiezo a atender." },
};

const KINDS: { kind: BusinessSwitch; label: string }[] = [
  { kind: "selling", label: "Que venda mis productos" },
  { kind: "booking", label: "Que agende mis citas" },
];

export function AuthFlow() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [otpError, setOtpError] = useState(false);
  const [checking, setChecking] = useState(true);
  const [kind, setKind] = useState<BusinessSwitch | null>(null);

  // On mount: if there's already a valid session, skip straight to where the user
  // belongs — the dashboard if their business is connected, otherwise what it does
  // (asked only of a Business with nothing yet) and then the connect step.
  useEffect(() => {
    getAccessToken()
      .then(async (token) => {
        if (!token) return;
        if (await isOnboarded()) {
          router.replace("/dashboard");
          return;
        }
        setStep((await hasStarted()) ? "connect" : "kind");
      })
      .finally(() => setChecking(false));
  }, [router]);

  const handleSendOTP = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError("");
      setLoading(true);

      try {
        const { error: sendError } = await getSupabase().auth.signInWithOtp({ email });
        if (sendError?.status === 429) {
          setError("Ya te enviamos un código. Revisa tu correo o espera un minuto.");
          return;
        }
        if (sendError) {
          setError("No pudimos enviar el código. Intenta de nuevo.");
          return;
        }
        setStep("otp");
      } catch {
        setError("Error de conexión. Intenta de nuevo.");
      } finally {
        setLoading(false);
      }
    },
    [email],
  );

  const handleVerifyOTP = useCallback(
    async (code: string) => {
      setOtpError(false);
      setError("");
      setLoading(true);

      try {
        const { error: verifyError } = await getSupabase().auth.verifyOtp({
          email,
          token: code,
          type: "email",
        });
        if (verifyError) {
          setOtpError(true);
          setError("Código inválido.");
          return;
        }

        // Returning users who already connected their business go straight to the
        // dashboard. Only those without a WhatsApp Line yet see the rest.
        if (await isOnboarded()) {
          router.replace("/dashboard");
          return;
        }
        setStep((await hasStarted()) ? "connect" : "kind");
      } catch {
        setOtpError(true);
        setError("Error de conexión. Intenta de nuevo.");
      } finally {
        setLoading(false);
      }
    },
    [email, router],
  );

  const handleChooseKind = useCallback(async (kind: BusinessSwitch) => {
    setError("");
    setLoading(true);
    try {
      await chooseKind(kind);
      setKind(kind);
      setStep("connect");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }, []);

  const screen = SCREENS[step];

  if (checking) {
    return (
      <ConnectShell stage={0} says="Un momento…">
        <div className="flex justify-center py-6">
          <Spinner />
        </div>
      </ConnectShell>
    );
  }

  const enter = {
    initial: { opacity: 0, x: 24 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -24 },
    transition: { duration: 0.25 },
  };

  return (
    <ConnectShell stage={screen.stage} kind={kind} says={screen.says} step={screen.step}>
      <AnimatePresence mode="wait">
        {step === "email" && (
          <motion.form key="email" {...enter} onSubmit={handleSendOTP} className="flex flex-col gap-4">
            <StepTitle>Entra con tu correo</StepTitle>
            <label className="flex flex-col gap-1.5 text-sm font-bold">
              Tu correo
              <input
                type="email"
                required
                autoFocus
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@correo.com"
                className={fieldClass}
              />
            </label>
            <button type="submit" disabled={loading || !email} className={primaryClass}>
              {loading ? (
                <>
                  <Spinner /> Enviando…
                </>
              ) : (
                "Mandarme el código"
              )}
            </button>
            <p className="text-sm text-ink-muted">Sin contraseñas: te llega un código cada vez que entras.</p>
          </motion.form>
        )}

        {step === "otp" && (
          <motion.div key="otp" {...enter} className="flex flex-col gap-4">
            <StepTitle>Escribe el código</StepTitle>
            <p className="text-sm">
              Lo mandamos a <b>{email}</b>
              <button
                type="button"
                onClick={() => {
                  setStep("email");
                  setError("");
                }}
                className="ml-2 font-bold text-steps underline underline-offset-4 cursor-pointer"
              >
                Cambiar
              </button>
            </p>
            <OTPInput onComplete={handleVerifyOTP} disabled={loading} error={otpError} />
            {loading && (
              <p className="flex items-center gap-2 text-sm font-semibold">
                <Spinner /> Revisando…
              </p>
            )}
          </motion.div>
        )}

        {step === "kind" && (
          <motion.div key="kind" {...enter} className="flex flex-col gap-3">
            <StepTitle>¿Qué hará tu empleado?</StepTitle>
            {KINDS.map(({ kind, label }) => (
              <button
                key={kind}
                type="button"
                disabled={loading}
                onClick={() => void handleChooseKind(kind)}
                className="flex flex-col gap-1 rounded-xl border-[2.5px] border-ink bg-white px-4 py-3.5 text-left shadow-[3px_3px_0_var(--color-ink)] transition-transform hover:-translate-y-0.5 hover:bg-money/30 disabled:opacity-50 cursor-pointer"
              >
                <span className="text-lg font-extrabold">{label}</span>
                <span className="text-sm text-ink-muted">{SWITCH_SAYS[kind]}</span>
              </button>
            ))}
            <p className="text-sm text-ink-muted">Más adelante puedes activar lo otro desde Ajustes.</p>
          </motion.div>
        )}

        {step === "connect" && (
          <motion.div key="connect" {...enter} className="flex flex-col gap-4">
            <StepTitle>Conecta tu WhatsApp</StepTitle>
            <p className="text-sm">
              Meta te pedirá entrar con tu cuenta de Facebook y elegir el número de tu negocio.
            </p>
            <EmbeddedSignup />
          </motion.div>
        )}
      </AnimatePresence>

      {error && <ErrorNote>{error}</ErrorNote>}

      {(step === "kind" || step === "connect") && (
        <Link href="/dashboard" className="mt-5 block text-center text-sm font-bold underline underline-offset-4">
          Hacerlo después e ir a mi panel
        </Link>
      )}
    </ConnectShell>
  );
}

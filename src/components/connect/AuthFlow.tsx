"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/Button";
import { OTPInput } from "@/components/connect/OTPInput";
import { EmbeddedSignup } from "@/components/connect/EmbeddedSignup";
import { getToken, setToken, setRefreshToken, clearToken } from "@/lib/auth";
import { authenticatedFetch } from "@/lib/api";

type Step = "email" | "otp" | "connect";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

const steps: { key: Step; label: string }[] = [
  { key: "email", label: "Email" },
  { key: "otp", label: "Verifica" },
  { key: "connect", label: "Conecta" },
];

export function AuthFlow() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [otpError, setOtpError] = useState(false);
  const [checking, setChecking] = useState(true);

  // On mount: check if there's already a valid token
  useEffect(() => {
    const token = getToken();
    if (!token) {
      setChecking(false);
      return;
    }
    authenticatedFetch("/auth/me")
      .then(async (res) => {
        if (res.ok) {
          const tenantRes = await authenticatedFetch("/me/tenant");
          if (tenantRes.ok) {
            router.replace("/dashboard");
            return;
          }
          setStep("connect");
        } else {
          clearToken();
        }
      })
      .catch(() => {
        clearToken();
      })
      .finally(() => setChecking(false));
  }, [router]);

  const handleSendOTP = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError("");
      setLoading(true);

      try {
        const res = await fetch(`${API_URL}/auth/otp/send`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });

        if (res.status === 429) {
          const data = await res.json();
          setError(data.detail || "Demasiados intentos. Espera unos minutos.");
          return;
        }

        // Always move to OTP step (backend returns 202 regardless)
        setStep("otp");
      } catch {
        setError("Error de conexion. Intenta de nuevo.");
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
        const res = await fetch(`${API_URL}/auth/otp/verify`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, token: code }),
        });

        if (!res.ok) {
          setOtpError(true);
          const data = await res.json();
          setError(data.detail || "Codigo invalido.");
          return;
        }

        const data = await res.json();
        setToken(data.access_token);
        if (data.refresh_token) setRefreshToken(data.refresh_token);
        setStep("connect");
      } catch {
        setOtpError(true);
        setError("Error de conexion. Intenta de nuevo.");
      } finally {
        setLoading(false);
      }
    },
    [email],
  );

  const currentStepIndex = steps.findIndex((s) => s.key === step);

  if (checking) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto text-center">
      {/* Headline */}
      <h1 className="text-3xl md:text-4xl font-bold text-text-primary">
        Conecta tu WhatsApp Business
      </h1>
      <p className="text-text-secondary mt-3">
        {step === "email" && "Ingresa tu email para comenzar"}
        {step === "otp" && "Te enviamos un codigo de verificacion"}
        {step === "connect" && "Ultimo paso: autoriza tu WhatsApp"}
      </p>

      {/* Stepper */}
      <div className="flex items-center justify-center mt-10">
        {steps.map((s, i) => (
          <div key={s.key} className="flex items-center">
            <div className="flex flex-col items-center gap-2">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300 ${
                  i < currentStepIndex
                    ? "bg-accent text-black"
                    : i === currentStepIndex
                      ? "bg-accent text-black shadow-[0_0_20px_rgba(37,211,102,0.4)]"
                      : "border border-white/8 text-text-secondary"
                }`}
              >
                {i < currentStepIndex ? (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  i + 1
                )}
              </div>
              <span
                className={`text-xs transition-colors duration-300 ${
                  i <= currentStepIndex ? "text-accent font-medium" : "text-text-secondary"
                }`}
              >
                {s.label}
              </span>
            </div>

            {i < steps.length - 1 && (
              <div
                className={`w-12 md:w-16 h-px mx-3 -mt-5 transition-colors duration-300 ${
                  i < currentStepIndex ? "bg-accent" : "bg-white/8"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step content with transitions */}
      <div className="mt-12 relative min-h-[180px]">
        <AnimatePresence mode="wait">
          {step === "email" && (
            <motion.form
              key="email"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              onSubmit={handleSendOTP}
              className="flex flex-col items-center gap-5"
            >
              <input
                type="email"
                required
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                className="w-full max-w-sm px-5 py-4 rounded-xl bg-white/5 border border-white/10 text-text-primary text-center text-lg placeholder:text-text-secondary/50 outline-none focus:border-accent focus:ring-1 focus:ring-accent/50 transition-all"
              />
              <Button type="submit" variant="primary" disabled={loading || !email}>
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    Enviando...
                  </span>
                ) : (
                  "Continuar"
                )}
              </Button>
            </motion.form>
          )}

          {step === "otp" && (
            <motion.div
              key="otp"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center gap-5"
            >
              <p className="text-text-secondary text-sm">
                Enviado a <span className="text-text-primary font-medium">{email}</span>
                <button
                  type="button"
                  onClick={() => { setStep("email"); setError(""); }}
                  className="text-accent ml-2 hover:underline cursor-pointer"
                >
                  Cambiar
                </button>
              </p>

              <OTPInput onComplete={handleVerifyOTP} disabled={loading} error={otpError} />

              {loading && (
                <div className="flex items-center gap-2 text-text-secondary text-sm">
                  <span className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                  Verificando...
                </div>
              )}
            </motion.div>
          )}

          {step === "connect" && (
            <motion.div
              key="connect"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <EmbeddedSignup />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error message */}
        <AnimatePresence>
          {error && (
            <motion.p
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-red-400 text-sm mt-4"
            >
              {error}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

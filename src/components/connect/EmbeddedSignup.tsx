"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { authenticatedFetch } from "@/lib/api";

declare global {
  interface Window {
    fbAsyncInit: () => void;
    FB: {
      init: (params: {
        appId: string;
        autoLogAppEvents: boolean;
        xfbml: boolean;
        version: string;
      }) => void;
      login: (
        callback: (response: { authResponse?: { code: string } }) => void,
        options: Record<string, unknown>,
      ) => void;
    };
  }
}

interface MetaSignupData {
  waba_id: string;
  phone_number_id?: string;
  is_coexistence: boolean;
}

type Status = "idle" | "loading" | "error";

export function EmbeddedSignup() {
  const [status, setStatus] = useState<Status>("idle");
  const [sdkReady, setSdkReady] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const router = useRouter();

  // Captured from Meta's window.message event during the signup popup
  const metaData = useRef<MetaSignupData | null>(null);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== "https://www.facebook.com" && event.origin !== "https://web.facebook.com") return;
      try {
        const data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
        if (data?.type === "WA_EMBEDDED_SIGNUP") {
          if (data?.event === "FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING" && data?.data?.waba_id) {
            metaData.current = { waba_id: data.data.waba_id, is_coexistence: true };
          } else if (data?.data?.waba_id && data?.data?.phone_number_id) {
            metaData.current = {
              waba_id: data.data.waba_id,
              phone_number_id: data.data.phone_number_id,
              is_coexistence: false,
            };
          }
        }
      } catch {
        // ignore non-JSON messages
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  const handleSdkLoad = useCallback(() => {
    window.fbAsyncInit = () => {
      window.FB.init({
        appId: process.env.NEXT_PUBLIC_META_APP_ID || "",
        autoLogAppEvents: true,
        xfbml: true,
        version: "v21.0",
      });
      setSdkReady(true);
    };
    // Trigger fbAsyncInit if FB is already loaded
    if (window.FB) {
      window.fbAsyncInit();
    }
  }, []);

  const launchSignup = useCallback(() => {
    if (!window.FB) return;
    setStatus("loading");
    setErrorMsg("");
    metaData.current = null;

    window.FB.login(
      (response) => {
        if (response.authResponse) {
          const code = response.authResponse.code;
          const signup = metaData.current;

          if (!signup?.waba_id) {
            setStatus("error");
            setErrorMsg("No se recibieron los datos de WhatsApp. Intenta de nuevo.");
            return;
          }

          authenticatedFetch("/oauth/exchange", {
            method: "POST",
            body: JSON.stringify({
              code,
              waba_id: signup.waba_id,
              phone_number_id: signup.phone_number_id ?? null,
              is_coexistence: signup.is_coexistence,
            }),
          })
            .then(async (res) => {
              if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.detail || "Error del servidor");
              }
              return res.json();
            })
            .then((data: { display_phone?: string | null; business_name?: string | null; requires_manager_setup?: boolean }) => {
              const params = new URLSearchParams();
              if (data.display_phone) params.set("phone", data.display_phone);
              if (data.business_name) params.set("business", data.business_name);
              if (data.requires_manager_setup) {
                router.push(`/connect/manager?${params.toString()}`);
              } else {
                router.push(`/connect/success?${params.toString()}`);
              }
            })
            .catch((err: Error) => {
              setStatus("error");
              setErrorMsg(err.message || "Error al procesar la conexion. Intenta de nuevo.");
            });
        } else {
          setStatus("idle");
        }
      },
      {
        config_id: process.env.NEXT_PUBLIC_META_CONFIG_ID || "",
        response_type: "code",
        override_default_response_type: true,
        extras: {
          setup: {},
          featureType: "whatsapp_business_app_onboarding",
          sessionInfoVersion: "3",
        },
      },
    );
  }, [router]);

  return (
    <div className="flex flex-col items-center gap-6">
      <Script
        src="https://connect.facebook.net/en_US/sdk.js"
        strategy="lazyOnload"
        onLoad={handleSdkLoad}
      />

      <Button
        variant="primary"
        onClick={launchSignup}
        disabled={!sdkReady || status === "loading"}
        className={
          !sdkReady || status === "loading"
            ? "opacity-50 cursor-not-allowed"
            : ""
        }
      >
        {status === "loading" ? (
          <span className="flex items-center gap-2">
            <svg
              className="animate-spin h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            Conectando...
          </span>
        ) : (
          "Conectar con Facebook"
        )}
      </Button>

      {!sdkReady && status === "idle" && (
        <p className="text-text-secondary text-sm">Cargando...</p>
      )}

      {status === "error" && (
        <div className="text-center">
          <p className="text-red-400 text-sm">{errorMsg}</p>
          <button
            onClick={() => {
              setStatus("idle");
              setErrorMsg("");
            }}
            className="text-accent text-sm mt-2 hover:underline cursor-pointer"
          >
            Intentar de nuevo
          </button>
        </div>
      )}
    </div>
  );
}

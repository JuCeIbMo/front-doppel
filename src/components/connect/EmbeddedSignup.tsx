"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { ErrorNote, Spinner, primaryClass } from "@/components/connect/ConnectShell";
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
              setErrorMsg(err.message || "No pudimos terminar la conexión. Intenta de nuevo.");
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
    <div className="flex flex-col gap-3">
      <Script
        src="https://connect.facebook.net/en_US/sdk.js"
        strategy="lazyOnload"
        onLoad={handleSdkLoad}
      />

      <button
        type="button"
        onClick={launchSignup}
        disabled={!sdkReady || status === "loading"}
        className={primaryClass.replace("bg-ink", "bg-settled")}
      >
        {status === "loading" ? (
          <>
            <Spinner /> Conectando…
          </>
        ) : !sdkReady ? (
          <>
            <Spinner /> Preparando…
          </>
        ) : (
          "Conectar mi WhatsApp"
        )}
      </button>

      {status === "error" && (
        <div>
          <ErrorNote>{errorMsg}</ErrorNote>
          <button
            type="button"
            onClick={() => {
              setStatus("idle");
              setErrorMsg("");
            }}
            className="mt-2 text-sm font-bold text-steps underline underline-offset-4 cursor-pointer"
          >
            Intentar de nuevo
          </button>
        </div>
      )}
    </div>
  );
}

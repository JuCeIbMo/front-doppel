// What Meta's Embedded Signup popup says to the page that opened it, and how it is opened.

export interface MetaSignupData {
  waba_id: string;
  phone_number_id?: string;
  is_coexistence: boolean;
}

// Why the Owner left the popup without finishing: the screen they left on, or the error
// they reported. Sent to the backend so support can see it.
export interface SignupLeftReport {
  event: string;
  current_step?: string;
  error_code?: string;
  error_message?: string;
  session_id?: string;
}

export type SignupMessage =
  | { kind: "finished"; signup: MetaSignupData }
  | { kind: "left"; report: SignupLeftReport };

export function signupLoginOptions(configId: string) {
  return {
    config_id: configId,
    response_type: "code",
    override_default_response_type: true,
    extras: { setup: {}, sessionInfoVersion: "3", version: "v4" },
  };
}

export function readSignupMessage(raw: unknown): SignupMessage | null {
  let data: Record<string, unknown>;
  try {
    data = typeof raw === "string" ? JSON.parse(raw) : (raw as Record<string, unknown>);
  } catch {
    return null;
  }
  if (data?.type !== "WA_EMBEDDED_SIGNUP") return null;

  const event = String(data.event ?? "");
  const info = (data.data ?? {}) as Record<string, unknown>;
  const text = (key: string) => (typeof info[key] === "string" ? (info[key] as string) : undefined);

  if (event === "FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING" && text("waba_id")) {
    return { kind: "finished", signup: { waba_id: text("waba_id")!, is_coexistence: true } };
  }
  if (event.startsWith("FINISH") && text("waba_id") && text("phone_number_id")) {
    return {
      kind: "finished",
      signup: {
        waba_id: text("waba_id")!,
        phone_number_id: text("phone_number_id")!,
        is_coexistence: false,
      },
    };
  }
  if (event === "CANCEL" || event === "ERROR") {
    const report: SignupLeftReport = { event };
    for (const key of ["current_step", "error_code", "error_message", "session_id"] as const) {
      const value = text(key);
      if (value !== undefined) report[key] = value;
    }
    return { kind: "left", report };
  }
  return null;
}

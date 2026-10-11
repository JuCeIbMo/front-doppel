import { describe, expect, it } from "vitest";
import { readSignupMessage, signupLoginOptions } from "./embeddedSignup";

describe("signupLoginOptions", () => {
  it("launches Embedded Signup v4 for Cloud API only", () => {
    expect(signupLoginOptions("1121994693714548")).toEqual({
      config_id: "1121994693714548",
      response_type: "code",
      override_default_response_type: true,
      extras: { setup: {}, sessionInfoVersion: "3", version: "v4" },
    });
  });
});

describe("readSignupMessage", () => {
  it("reads the assets of a finished signup", () => {
    const data = JSON.stringify({
      type: "WA_EMBEDDED_SIGNUP",
      event: "FINISH",
      data: { waba_id: "waba-1", phone_number_id: "phone-1", business_id: "biz-1" },
    });

    expect(readSignupMessage(data)).toEqual({
      kind: "finished",
      signup: { waba_id: "waba-1", phone_number_id: "phone-1", is_coexistence: false },
    });
  });

  it("marks a WhatsApp Business app onboarding as coexistence", () => {
    const data = {
      type: "WA_EMBEDDED_SIGNUP",
      event: "FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING",
      data: { waba_id: "waba-1" },
    };

    expect(readSignupMessage(data)).toEqual({
      kind: "finished",
      signup: { waba_id: "waba-1", is_coexistence: true },
    });
  });

  it("reads the screen an abandoned signup was left on", () => {
    const data = JSON.stringify({
      type: "WA_EMBEDDED_SIGNUP",
      event: "CANCEL",
      data: { current_step: "PHONE_NUMBER_SETUP" },
    });

    expect(readSignupMessage(data)).toEqual({
      kind: "left",
      report: { event: "CANCEL", current_step: "PHONE_NUMBER_SETUP" },
    });
  });

  it("reads what support needs from an error the Owner reported", () => {
    const data = JSON.stringify({
      type: "WA_EMBEDDED_SIGNUP",
      event: "CANCEL",
      data: {
        error_message: "Your verified name violates WhatsApp guidelines.",
        error_code: "524126",
        session_id: "f34b51dab5e0498",
        timestamp: "1746041036",
      },
    });

    expect(readSignupMessage(data)).toEqual({
      kind: "left",
      report: {
        event: "CANCEL",
        error_message: "Your verified name violates WhatsApp guidelines.",
        error_code: "524126",
        session_id: "f34b51dab5e0498",
      },
    });
  });

  it("ignores anything that is not an Embedded Signup message", () => {
    expect(readSignupMessage("not json")).toBeNull();
    expect(readSignupMessage(JSON.stringify({ type: "OTHER" }))).toBeNull();
  });
});

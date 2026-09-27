import { describe, expect, it, vi, beforeEach } from "vitest";
import { callApi } from "@/lib/api";
import { ApiError } from "@/lib/api-client";
import { hasStarted, isOnboarded } from "./onboarding";

vi.mock("@/lib/api", () => ({ callApi: vi.fn() }));
vi.mock("@/lib/supabase", () => ({ getAccessToken: vi.fn() }));

const mockCall = vi.mocked(callApi);

describe("isOnboarded", () => {
  beforeEach(() => {
    mockCall.mockReset();
  });

  it("is true when the Business has a WhatsApp Line", async () => {
    mockCall.mockResolvedValue({ phone_number_id: "1" });
    expect(await isOnboarded()).toBe(true);
    expect(mockCall).toHaveBeenCalledWith("/dashboard/whatsapp-line");
  });

  it("is false when the Business has no Line yet", async () => {
    mockCall.mockResolvedValue(null);
    expect(await isOnboarded()).toBe(false);
  });

  it("is false when the API cannot answer (treats errors as not onboarded)", async () => {
    // The catch must swallow the error into `false` rather than crashing the login flow.
    mockCall.mockRejectedValue(new ApiError({ status: 0, code: "network", message: "offline" }));
    expect(await isOnboarded()).toBe(false);
  });
});

describe("hasStarted", () => {
  const nothing = {
    line_connected: false,
    has_product: false,
    has_service: false,
    has_hours: false,
    has_knowledge: false,
    has_manager_phone: false,
  };

  beforeEach(() => {
    mockCall.mockReset();
  });

  it("is false for a Business with nothing of its own", async () => {
    mockCall.mockResolvedValue({ onboarding: nothing });
    expect(await hasStarted()).toBe(false);
    expect(mockCall).toHaveBeenCalledWith("/dashboard/overview");
  });

  it("is true once the Business has a product or a Manager phone", async () => {
    mockCall.mockResolvedValue({ onboarding: { ...nothing, has_manager_phone: true } });
    expect(await hasStarted()).toBe(true);
  });

  it("is true when unsure, so no switch is turned off by mistake", async () => {
    mockCall.mockRejectedValue(new ApiError({ status: 500, message: "boom" }));
    expect(await hasStarted()).toBe(true);
  });
});

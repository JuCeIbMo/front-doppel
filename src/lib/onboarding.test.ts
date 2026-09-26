import { describe, expect, it, vi, beforeEach } from "vitest";
import { authenticatedFetch } from "@/lib/api";
import { hasStarted, isOnboarded } from "./onboarding";

vi.mock("@/lib/api", () => ({ authenticatedFetch: vi.fn() }));

const mockFetch = vi.mocked(authenticatedFetch);

describe("isOnboarded", () => {
  beforeEach(() => mockFetch.mockReset());

  it("is true when the Business has a WhatsApp Line", async () => {
    mockFetch.mockResolvedValue(Response.json({ phone_number_id: "1" }));
    expect(await isOnboarded()).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith("/dashboard/whatsapp-line");
  });

  it("is false when the Business has no Line yet", async () => {
    mockFetch.mockResolvedValue(Response.json(null));
    expect(await isOnboarded()).toBe(false);
  });

  it("is false when the response is unusable (treats errors as not onboarded)", async () => {
    // A malformed/empty response: reading `.ok` throws inside isOnboarded, which
    // the catch must swallow into `false` rather than crashing the login flow.
    mockFetch.mockResolvedValue(undefined as never);
    const result = await isOnboarded();
    expect(result).toBe(false);
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

  beforeEach(() => mockFetch.mockReset());

  it("is false for a Business with nothing of its own", async () => {
    mockFetch.mockResolvedValue(Response.json({ onboarding: nothing }));
    expect(await hasStarted()).toBe(false);
    expect(mockFetch).toHaveBeenCalledWith("/dashboard/overview");
  });

  it("is true once the Business has a product or a Manager phone", async () => {
    mockFetch.mockResolvedValue(Response.json({ onboarding: { ...nothing, has_manager_phone: true } }));
    expect(await hasStarted()).toBe(true);
  });

  it("is true when unsure, so no switch is turned off by mistake", async () => {
    mockFetch.mockResolvedValue(new Response(null, { status: 500 }));
    expect(await hasStarted()).toBe(true);
  });
});

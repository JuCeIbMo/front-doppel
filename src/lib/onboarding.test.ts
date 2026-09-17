import { describe, expect, it, vi, beforeEach } from "vitest";
import { authenticatedFetch } from "@/lib/api";
import { isOnboarded } from "./onboarding";

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

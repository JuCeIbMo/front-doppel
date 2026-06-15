import { describe, expect, it, vi, beforeEach } from "vitest";
import { authenticatedFetch } from "@/lib/api";
import { isOnboarded } from "./onboarding";

vi.mock("@/lib/api", () => ({ authenticatedFetch: vi.fn() }));

const mockFetch = vi.mocked(authenticatedFetch);

describe("isOnboarded", () => {
  beforeEach(() => mockFetch.mockReset());

  it("is true when /me/tenant returns ok (business already connected)", async () => {
    mockFetch.mockResolvedValue(new Response(null, { status: 200 }));
    expect(await isOnboarded()).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith("/me/tenant");
  });

  it("is false when /me/tenant returns 404 (no business connected)", async () => {
    mockFetch.mockResolvedValue(new Response(null, { status: 404 }));
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

import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

const getAccessTokenMock = vi.fn();
vi.mock("@/lib/supabase", () => ({
  getAccessToken: () => getAccessTokenMock(),
}));

import { useHasSession } from "./useHasSession";

describe("useHasSession", () => {
  beforeEach(() => getAccessTokenMock.mockReset());

  it("is true when Supabase holds a session", async () => {
    getAccessTokenMock.mockResolvedValue("a");
    const { result } = renderHook(() => useHasSession());
    await waitFor(() => expect(result.current).toBe(true));
  });

  it("is false when there is no session", async () => {
    getAccessTokenMock.mockResolvedValue(null);
    const { result } = renderHook(() => useHasSession());
    await waitFor(() => expect(result.current).toBe(false));
  });
});

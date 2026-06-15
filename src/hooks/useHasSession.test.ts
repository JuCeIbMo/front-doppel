import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";

const readTokensMock = vi.fn();
vi.mock("@/lib/session", () => ({
  readTokens: () => readTokensMock(),
}));

import { useHasSession } from "./useHasSession";

describe("useHasSession", () => {
  beforeEach(() => readTokensMock.mockReset());

  it("is true when an access token is present", () => {
    readTokensMock.mockReturnValue({ accessToken: "a", refreshToken: null });
    const { result } = renderHook(() => useHasSession());
    expect(result.current).toBe(true);
  });

  it("is true when only a refresh token is present (recoverable session)", () => {
    readTokensMock.mockReturnValue({ accessToken: null, refreshToken: "r" });
    const { result } = renderHook(() => useHasSession());
    expect(result.current).toBe(true);
  });

  it("is false when there is no token at all", () => {
    readTokensMock.mockReturnValue({ accessToken: null, refreshToken: null });
    const { result } = renderHook(() => useHasSession());
    expect(result.current).toBe(false);
  });
});

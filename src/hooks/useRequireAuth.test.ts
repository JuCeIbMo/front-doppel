import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";

const replace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
}));

const readTokensMock = vi.fn();
vi.mock("@/lib/session", () => ({
  readTokens: () => readTokensMock(),
}));

import { useRequireAuth } from "./useRequireAuth";

describe("useRequireAuth", () => {
  beforeEach(() => {
    replace.mockClear();
    readTokensMock.mockReset();
  });

  it("redirects to login when there is no token at all", () => {
    readTokensMock.mockReturnValue({ accessToken: null, refreshToken: null });
    renderHook(() => useRequireAuth());
    expect(replace).toHaveBeenCalledWith("/");
  });

  it("stays put when an access token is present", () => {
    readTokensMock.mockReturnValue({ accessToken: "a", refreshToken: null });
    renderHook(() => useRequireAuth());
    expect(replace).not.toHaveBeenCalled();
  });

  it("stays put when only a refresh token is present (recoverable session)", () => {
    readTokensMock.mockReturnValue({ accessToken: null, refreshToken: "r" });
    renderHook(() => useRequireAuth());
    expect(replace).not.toHaveBeenCalled();
  });
});

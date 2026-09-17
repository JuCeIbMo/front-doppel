import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

const replace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
}));

const getAccessTokenMock = vi.fn();
vi.mock("@/lib/supabase", () => ({
  getAccessToken: () => getAccessTokenMock(),
}));

import { useRequireAuth } from "./useRequireAuth";

describe("useRequireAuth", () => {
  beforeEach(() => {
    replace.mockClear();
    getAccessTokenMock.mockReset();
  });

  it("redirects to the landing page when there is no session", async () => {
    getAccessTokenMock.mockResolvedValue(null);
    renderHook(() => useRequireAuth());
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/"));
  });

  it("stays put when there is a session", async () => {
    getAccessTokenMock.mockResolvedValue("a");
    renderHook(() => useRequireAuth());
    await waitFor(() => expect(getAccessTokenMock).toHaveBeenCalled());
    expect(replace).not.toHaveBeenCalled();
  });
});

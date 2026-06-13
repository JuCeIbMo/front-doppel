import { describe, expect, it, vi } from "vitest";
import { apiFetch, type SessionStore } from "@/lib/api-client";

function createSessionStore(seed?: Partial<SessionStore>): SessionStore {
  return {
    getAccessToken: vi.fn(async () => seed?.getAccessToken ? seed.getAccessToken() : null),
    getRefreshToken: vi.fn(async () => seed?.getRefreshToken ? seed.getRefreshToken() : null),
    setTokens: vi.fn(async () => undefined),
    clear: vi.fn(async () => undefined),
  };
}

describe("apiFetch", () => {
  it("retries once after a 401 when refresh succeeds", async () => {
    const session = createSessionStore({
      getAccessToken: async () => "old-access",
      getRefreshToken: async () => "refresh-token",
    });

    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(null, {
          status: 401,
        }),
      )
      .mockResolvedValueOnce(
        Response.json({
          access_token: "new-access",
          refresh_token: "new-refresh",
          expires_in: 3600,
        }),
      )
      .mockResolvedValueOnce(
        Response.json({
          ok: true,
        }),
      );

    const payload = await apiFetch<{ ok: boolean }>("/erp/products", {
      baseUrl: "https://api.example.com",
      fetcher,
      session,
    });

    expect(payload).toEqual({ ok: true });
    expect(fetcher).toHaveBeenCalledTimes(3);
    expect(session.setTokens).toHaveBeenCalledWith({
      accessToken: "new-access",
      refreshToken: "new-refresh",
      expiresIn: 3600,
    });
    const thirdCall = fetcher.mock.calls[2];
    expect(thirdCall?.[0]).toBe("https://api.example.com/erp/products");
    expect(
      new Headers((thirdCall?.[1] as RequestInit | undefined)?.headers).get("Authorization"),
    ).toBe("Bearer new-access");
  });

  it("throws a normalized ApiError with backend metadata", async () => {
    const session = createSessionStore();
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json(
        {
          error: "insufficient_stock",
          message: "Stock insuficiente: quedan 3 unidades",
          detail: {
            available: 3,
          },
        },
        {
          status: 409,
        },
      ),
    );

    await expect(
      apiFetch("/erp/sales", {
        baseUrl: "https://api.example.com",
        fetcher,
        session,
        method: "POST",
        body: JSON.stringify({}),
      }),
    ).rejects.toMatchObject({
      status: 409,
      code: "insufficient_stock",
      message: "Stock insuficiente: quedan 3 unidades",
      detail: {
        available: 3,
      },
    });
  });

  it("does not force application/json when body is FormData", async () => {
    const session = createSessionStore({
      getAccessToken: async () => "token",
    });

    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({
        ok: true,
      }),
    );

    await apiFetch("/erp/products/import", {
      baseUrl: "https://api.example.com",
      fetcher,
      session,
      method: "POST",
      body: new FormData(),
    });

    const headers = new Headers((fetcher.mock.calls[0]?.[1] as RequestInit | undefined)?.headers);
    expect(headers.get("Content-Type")).toBeNull();
  });
});

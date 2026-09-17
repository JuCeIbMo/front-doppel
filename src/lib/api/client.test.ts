import { describe, expect, it, vi } from "vitest";
import { ApiError, apiFetch, readErrorDetail } from "@/lib/api-client";

const session = { getAccessToken: async () => "access" };

describe("apiFetch", () => {
  it("sends the session's access token as a bearer token", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ ok: true }));

    const payload = await apiFetch<{ ok: boolean }>("/dashboard/business", {
      baseUrl: "https://api.example.com",
      fetcher,
      session,
    });

    expect(payload).toEqual({ ok: true });
    const [url, init] = fetcher.mock.calls[0]!;
    expect(url).toBe("https://api.example.com/dashboard/business");
    expect(new Headers(init?.headers).get("Authorization")).toBe("Bearer access");
  });

  it("turns the API's {detail: {code, message}} into an ApiError", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        Response.json({ detail: { code: "otp_unavailable", message: "Down" } }, { status: 502 }),
      );

    const error = await apiFetch("/x", { baseUrl: "", fetcher, session }).catch((e) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 502, code: "otp_unavailable", message: "Down" });
  });
});

describe("readErrorDetail", () => {
  it("reads a plain string, an object and an input-validation list", () => {
    expect(readErrorDetail("No such Order")).toEqual({ message: "No such Order" });
    expect(readErrorDetail({ code: "C", message: "M" })).toEqual({ code: "C", message: "M" });
    expect(readErrorDetail([{ loc: ["body"] }]).code).toBe("invalid_input");
    expect(readErrorDetail(undefined)).toEqual({});
  });
});

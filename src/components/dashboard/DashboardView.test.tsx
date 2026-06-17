import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DashboardView } from "@/components/dashboard/DashboardView";
import { authenticatedFetch } from "@/lib/api";

const replace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  usePathname: () => "/dashboard/automation",
}));

vi.mock("@/lib/api", () => ({
  authenticatedFetch: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  clearToken: vi.fn(),
}));

const mockFetch = vi.mocked(authenticatedFetch);

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("DashboardView", () => {
  beforeEach(() => {
    replace.mockReset();
    mockFetch.mockReset();
    window.localStorage.clear();
  });

  it("renders an inbox-first grouped conversations view", async () => {
    window.localStorage.setItem(
      "automation-crm:tenant_1:59170000001",
      JSON.stringify({
        leadStatus: "warm",
        notes: "Pidio precios",
        tags: ["vip"],
        displayName: "Andrea",
      }),
    );

    mockFetch.mockImplementation(async (path: string) => {
      if (path === "/me/tenant") {
        return jsonResponse({
          id: "tenant_1",
          business_name: "Doppel Store",
          email: "owner@doppel.test",
          plan: "pro",
          status: "active",
        });
      }

      if (path === "/me/whatsapp") {
        return jsonResponse([
          {
            id: "wa_1",
            waba_id: "waba_1",
            phone_number_id: "pn_1",
            display_phone: "+591 70000000",
            status: "connected",
          },
        ]);
      }

      if (path === "/me/bot-config") {
        return jsonResponse({
          id: "bot_1",
          system_prompt: "Ayuda a clientes",
          welcome_message: "Hola",
          language: "es",
          bot_enabled: true,
        });
      }

      if (path === "/me/messages?limit=20&offset=0") {
        return jsonResponse({
          total: 3,
          limit: 20,
          offset: 0,
          messages: [
            {
              id: "m1",
              user_phone: "59170000001",
              direction: "inbound",
              content: "Hola, precio?",
              message_type: "text",
              created_at: "2026-06-17T10:00:00.000Z",
            },
            {
              id: "m2",
              user_phone: "59170000002",
              direction: "inbound",
              content: "Siguen atendiendo?",
              message_type: "text",
              created_at: "2026-06-17T11:00:00.000Z",
            },
            {
              id: "m3",
              user_phone: "59170000001",
              direction: "outbound",
              content: "Si, claro",
              message_type: "text",
              created_at: "2026-06-17T12:00:00.000Z",
            },
          ],
        });
      }

      if (path === "/me/admin-phones") {
        return jsonResponse({ phones: ["59177777777"] });
      }

      throw new Error(`Unexpected path: ${path}`);
    });

    render(<DashboardView />);

    expect(await screen.findByText("Inbox de automatización")).toBeInTheDocument();
    expect(await screen.findByText("Andrea")).toBeInTheDocument();
    expect(screen.getByText("Siguen atendiendo?")).toBeInTheDocument();
    expect(screen.getByText("Pidio precios")).toBeInTheDocument();

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });
  });
});

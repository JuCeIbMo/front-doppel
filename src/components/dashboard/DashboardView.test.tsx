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

vi.mock("@/lib/supabase", () => ({
  signOut: vi.fn(),
  getAccessToken: vi.fn(async () => "token"),
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

  it("renders the Pipeline's conversations and the selected one's messages", async () => {
    window.localStorage.setItem(
      "automation-crm:biz_1:59170000001",
      JSON.stringify({
        leadStatus: "warm",
        notes: "Pidio precios",
        tags: ["vip"],
        displayName: "Andrea",
      }),
    );

    mockFetch.mockImplementation(async (path: string) => {
      if (path === "/dashboard/business") {
        return jsonResponse({ id: "biz_1", name: "Doppel Store" });
      }
      if (path === "/dashboard/whatsapp-line") {
        return jsonResponse({
          phone_number_id: "pn_1",
          display_phone_number: "+591 70000000",
          public_agent_enabled: true,
        });
      }
      if (path === "/dashboard/manager-phones") {
        return jsonResponse([{ phone: "59177777777" }]);
      }
      if (path === "/dashboard/pipeline") {
        return jsonResponse([
          {
            id: "c1",
            contact_code: "AAAAAA",
            whatsapp_number: "59170000001",
            last_message_at: "2026-06-17T12:00:00.000Z",
            last_message_body: "Si, claro",
            intervention_started_at: null,
          },
          {
            id: "c2",
            contact_code: "BBBBBB",
            whatsapp_number: "59170000002",
            last_message_at: "2026-06-17T11:00:00.000Z",
            last_message_body: "Siguen atendiendo?",
            intervention_started_at: null,
          },
        ]);
      }
      if (path === "/dashboard/pipeline/c1/messages") {
        return jsonResponse([
          {
            id: "m1",
            direction: "inbound",
            body: "",
            created_at: "2026-06-17T10:00:00.000Z",
            code: "M1",
            media_type: "audio",
            media_url: null,
            transcript: "Hola, precio?",
            summary: null,
            media_state: "ready",
          },
        ]);
      }
      throw new Error(`Unexpected path: ${path}`);
    });

    render(<DashboardView />);

    expect(await screen.findByText("Inbox de automatización")).toBeInTheDocument();
    expect((await screen.findAllByText("Andrea")).length).toBeGreaterThan(0);
    expect(screen.getByText("Siguen atendiendo?")).toBeInTheDocument();
    expect(await screen.findByDisplayValue("Pidio precios")).toBeInTheDocument();
    expect(await screen.findByText("Hola, precio?")).toBeInTheDocument();
    expect(screen.getByText("Bot respondiendo")).toBeInTheDocument();
  });

  it("sends an Owner with a Line but no Manager phone to the manager step", async () => {
    mockFetch.mockImplementation(async (path: string) => {
      if (path === "/dashboard/business") return jsonResponse({ id: "biz_1", name: "Tienda" });
      if (path === "/dashboard/whatsapp-line") {
        return jsonResponse({
          phone_number_id: "pn_1",
          display_phone_number: "+591 7",
          public_agent_enabled: false,
        });
      }
      if (path === "/dashboard/manager-phones") return jsonResponse([]);
      return jsonResponse([]);
    });

    render(<DashboardView />);

    await waitFor(() =>
      expect(replace).toHaveBeenCalledWith(expect.stringContaining("/connect/manager?")),
    );
  });
});

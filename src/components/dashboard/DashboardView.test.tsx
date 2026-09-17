import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DashboardView } from "@/components/dashboard/DashboardView";
import { authenticatedFetch } from "@/lib/api";
import { readApi, runOperation } from "@/lib/operations";

const replace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  usePathname: () => "/dashboard/automation",
}));

vi.mock("@/lib/api", () => ({
  authenticatedFetch: vi.fn(),
}));

vi.mock("@/lib/operations", () => ({
  readApi: vi.fn(),
  runOperation: vi.fn(),
  runOperationOrThrow: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({
  signOut: vi.fn(),
  getAccessToken: vi.fn(async () => "token"),
}));

const mockFetch = vi.mocked(authenticatedFetch);
const mockRun = vi.mocked(runOperation);
const mockRead = vi.mocked(readApi);

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
    mockRun.mockReset();
    mockRead.mockReset();
    mockRead.mockResolvedValue([]);
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
            paused_until: null,
            reply_window_closes_at: "2999-01-01T00:00:00.000Z",
          },
          {
            id: "c2",
            contact_code: "BBBBBB",
            whatsapp_number: "59170000002",
            last_message_at: "2026-06-17T11:00:00.000Z",
            last_message_body: "Siguen atendiendo?",
            intervention_started_at: null,
            paused_until: null,
            reply_window_closes_at: "2999-01-01T00:00:00.000Z",
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

  function oneConversation(conversation: Record<string, unknown>) {
    mockFetch.mockImplementation(async (path: string) => {
      if (path === "/dashboard/business") return jsonResponse({ id: "biz_1", name: "Tienda" });
      if (path === "/dashboard/whatsapp-line") {
        return jsonResponse({
          phone_number_id: "pn_1",
          display_phone_number: "+591 7",
          public_agent_enabled: true,
        });
      }
      if (path === "/dashboard/manager-phones") return jsonResponse([{ phone: "5917" }]);
      if (path === "/dashboard/pipeline") {
        return jsonResponse([
          {
            id: "c1",
            contact_code: "AAAAAA",
            whatsapp_number: "59170000001",
            last_message_at: "2026-06-17T12:00:00.000Z",
            last_message_body: "hola",
            intervention_started_at: null,
            paused_until: null,
            reply_window_closes_at: "2999-01-01T00:00:00.000Z",
            ...conversation,
          },
        ]);
      }
      return jsonResponse([]);
    });
  }

  it("sends the Owner's reply to the selected Contact", async () => {
    oneConversation({});
    mockRun.mockResolvedValue({
      status: "executed",
      result: { conversation_id: "c1", contact_code: "AAAAAA" },
    });

    render(<DashboardView />);
    fireEvent.change(await screen.findByLabelText("Respuesta al cliente"), {
      target: { value: "Te ayudo yo" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Enviar" }));

    await waitFor(() =>
      expect(mockRun).toHaveBeenCalledWith(
        "reply_to_contact",
        { contact_code: "AAAAAA", body: "Te ayudo yo" },
        expect.any(String),
      ),
    );
    await waitFor(() =>
      expect(screen.getByLabelText("Respuesta al cliente")).toHaveValue(""),
    );
  });

  it("explains instead of offering a reply box once the 24 hours are over", async () => {
    oneConversation({ reply_window_closes_at: "2020-01-01T00:00:00.000Z" });

    render(<DashboardView />);

    expect(
      await screen.findByText(/no escribió en las últimas 24 horas/),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Respuesta al cliente")).not.toBeInTheDocument();
  });

  it("sends an approved template once the 24 hours are over", async () => {
    oneConversation({ reply_window_closes_at: "2020-01-01T00:00:00.000Z" });
    mockRead.mockResolvedValue([
      {
        name: "pedido_listo",
        category: "UTILITY",
        language: "es",
        status: "APPROVED",
        body: "Hola {{1}}, ya está.",
        rejected_reason: null,
      },
      {
        name: "en_revision",
        category: "UTILITY",
        language: "es",
        status: "PENDING",
        body: "Nada",
        rejected_reason: null,
      },
    ]);
    mockRun.mockResolvedValue({ status: "executed", result: {} });
    vi.spyOn(window, "confirm").mockReturnValue(true);

    render(<DashboardView />);
    const picker = await screen.findByLabelText("Plantilla");
    expect(screen.queryByRole("option", { name: "en_revision" })).not.toBeInTheDocument();
    fireEvent.change(picker, { target: { value: "pedido_listo" } });
    fireEvent.change(screen.getByLabelText("Valor para {{1}}"), { target: { value: "Ana" } });
    expect(screen.getByText("Hola Ana, ya está.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Enviar plantilla" }));

    await waitFor(() =>
      expect(mockRun).toHaveBeenCalledWith(
        "send_template",
        {
          contact_code: "AAAAAA",
          template_name: "pedido_listo",
          body: "Hola {{1}}, ya está.",
          values: ["Ana"],
        },
        expect.any(String),
      ),
    );
  });

  it("shows until when the bot is paused and hands the chat back", async () => {
    oneConversation({ paused_until: "2999-01-01T15:40:00.000Z" });
    mockRun.mockResolvedValue({ status: "executed", result: { contact_code: "AAAAAA" } });

    render(<DashboardView />);
    expect(await screen.findByText(/Bot en pausa hasta las/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Reactivar bot" }));

    await waitFor(() =>
      expect(mockRun).toHaveBeenCalledWith("resume_public_agent", { contact_code: "AAAAAA" }),
    );
  });

  it.each(["/dashboard/business", "/dashboard/pipeline"])(
    "says so when %s cannot load, instead of an empty inbox",
    async (failing) => {
      mockFetch.mockImplementation(async (path: string) => {
        if (path === failing) return jsonResponse({ detail: "boom" }, 500);
        if (path === "/dashboard/business") return jsonResponse({ id: "biz_1", name: "Doppel Store" });
        if (path === "/dashboard/whatsapp-line") return jsonResponse(null);
        return jsonResponse([]);
      });

      render(<DashboardView />);

      expect(await screen.findByText(/No se pudo cargar tu bandeja/)).toBeInTheDocument();
      expect(screen.queryByText("Aún no hay conversaciones registradas")).not.toBeInTheDocument();
    },
  );

  it("passes on the network's Spanish message when the API cannot be reached", async () => {
    mockFetch.mockRejectedValue(new Error("No pudimos conectar con Doppel. Revisa tu conexión."));

    render(<DashboardView />);

    expect(await screen.findByText(/No pudimos conectar con Doppel/)).toBeInTheDocument();
  });
});

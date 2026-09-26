import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn() }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/lib/supabase", () => ({ signOut: vi.fn(), getAccessToken: vi.fn() }));
vi.mock("@/components/dashboard/WhatsAppDisconnectedNotice", () => ({
  WhatsAppDisconnectedNotice: () => <p>WhatsApp no conectado</p>,
}));
const readApi = vi.fn();
const runOperationOrThrow = vi.fn();
vi.mock("@/lib/operations", () => ({
  readApi: (path: string) => readApi(path),
  runOperationOrThrow: (name: string, payload?: unknown) => runOperationOrThrow(name, payload),
}));

const startRehearsal = vi.fn();
vi.mock("@/lib/rehearsal", () => ({
  startRehearsal: (onEnded: (failed: boolean) => void) => startRehearsal(onEnded),
}));

import { SettingsView } from "./SettingsView";

function answers(line: unknown) {
  readApi.mockImplementation(async (path: string) => {
    if (path === "/dashboard/business") return { name: "Tienda" };
    if (path === "/dashboard/whatsapp-line") return line;
    if (path === "/dashboard/manager-phones") return [{ phone: "59170000000" }];
    throw new Error(path);
  });
}

function renderView() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <SettingsView />
    </QueryClientProvider>,
  );
}

describe("SettingsView", () => {
  beforeEach(() => {
    readApi.mockReset();
    runOperationOrThrow.mockReset().mockResolvedValue({});
    answers({
      phone_number_id: "1",
      display_phone_number: "+591 7000 0000",
      public_agent_enabled: true,
      calls_state: "off",
      calls_refused_reason: null,
      voice_instructions: null,
    });
  });

  it("renames the business", async () => {
    renderView();

    fireEvent.change(await screen.findByDisplayValue("Tienda"), {
      target: { value: "Tienda Sol" },
    });
    fireEvent.click(screen.getAllByRole("button", { name: "Guardar" })[0]);

    await waitFor(() =>
      expect(runOperationOrThrow).toHaveBeenCalledWith("name_business", { name: "Tienda Sol" }),
    );
  });

  it("disconnects WhatsApp only after confirming", async () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValueOnce(false).mockReturnValueOnce(true);
    renderView();

    const button = await screen.findByRole("button", { name: "Desconectar" });
    expect(screen.getByText("+591 7000 0000")).toBeInTheDocument();
    fireEvent.click(button);
    expect(runOperationOrThrow).not.toHaveBeenCalled();
    fireEvent.click(button);

    await waitFor(() =>
      expect(runOperationOrThrow).toHaveBeenCalledWith("disconnect_whatsapp_line", undefined),
    );
    expect(confirm).toHaveBeenCalledTimes(2);
  });

  it("offers to connect when there is no line", async () => {
    answers(null);
    renderView();

    expect(await screen.findByText("WhatsApp no conectado")).toBeInTheDocument();
  });

  it("saves the manager phones as a whole list", async () => {
    renderView();

    expect(await screen.findByText("+59170000000")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Nuevo teléfono"), {
      target: { value: "+591 71111111" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Agregar" }));
    fireEvent.click(screen.getByRole("button", { name: "Quitar 59170000000" }));
    fireEvent.click(screen.getAllByRole("button", { name: "Guardar" })[1]);

    await waitFor(() =>
      expect(runOperationOrThrow).toHaveBeenCalledWith("set_manager_phones", {
        phones: ["+591 71111111"],
      }),
    );
  });

  function lineWithCalls(calls_state: string, calls_refused_reason: string | null = null) {
    answers({
      phone_number_id: "1",
      display_phone_number: "+591 7000 0000",
      public_agent_enabled: true,
      calls_state,
      calls_refused_reason,
      voice_instructions: "Trata de usted.",
    });
  }

  it("turns calls on when they are off", async () => {
    lineWithCalls("off");
    renderView();

    const calls = await screen.findByRole("switch", { name: "Llamadas" });
    expect(calls).toHaveAttribute("aria-checked", "false");
    fireEvent.click(calls);

    await waitFor(() => expect(runOperationOrThrow).toHaveBeenCalledWith("enable_calls", undefined));
  });

  it("turns calls off when they are on", async () => {
    lineWithCalls("on");
    renderView();

    const calls = await screen.findByRole("switch", { name: "Llamadas" });
    expect(calls).toHaveAttribute("aria-checked", "true");
    fireEvent.click(calls);

    await waitFor(() =>
      expect(runOperationOrThrow).toHaveBeenCalledWith("disable_calls", undefined),
    );
  });

  it.each([
    ["turning_on", "Activando las llamadas"],
    ["turning_off", "Apagando las llamadas"],
  ])("says WhatsApp is applying it while calls are %s", async (state, words) => {
    lineWithCalls(state);
    renderView();

    expect(await screen.findByText(new RegExp(words))).toBeInTheDocument();
    // Never stuck half-way: the owner can still change their mind.
    expect(screen.getByRole("switch", { name: "Llamadas" })).toBeEnabled();
  });

  it.each([
    ["messaging_limit", /2\.000 personas por día/],
    ["payment_method", /método de pago/],
    ["quality", /restringió las llamadas/],
    ["other", /no dio un motivo/],
  ])("explains a %s refusal and lets the owner try again", async (reason, explanation) => {
    lineWithCalls("refused", reason);
    renderView();

    expect(await screen.findByText(/WhatsApp no permitió activar las llamadas/)).toBeInTheDocument();
    expect(screen.getByText(explanation)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Intentar de nuevo" }));

    await waitFor(() => expect(runOperationOrThrow).toHaveBeenCalledWith("enable_calls", undefined));
  });

  it("saves the voice instructions the owner wrote", async () => {
    lineWithCalls("on");
    renderView();

    const box = await screen.findByLabelText("Instrucciones de voz");
    expect(box).toHaveValue("Trata de usted.");
    fireEvent.change(box, { target: { value: "Habla despacio, con acento boliviano." } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar instrucciones" }));

    await waitFor(() =>
      expect(runOperationOrThrow).toHaveBeenCalledWith("set_voice_instructions", {
        instructions: "Habla despacio, con acento boliviano.",
      }),
    );
  });

  it("rehearses a call and hangs up", async () => {
    const stop = vi.fn();
    startRehearsal.mockResolvedValue({ stop });
    lineWithCalls("off");
    renderView();

    fireEvent.click(await screen.findByRole("button", { name: "Probar llamada" }));
    fireEvent.click(await screen.findByRole("button", { name: "Colgar" }));

    expect(startRehearsal).toHaveBeenCalledTimes(1);
    expect(stop).toHaveBeenCalledTimes(1);
  });

  it("hangs up a rehearsal when the owner leaves Ajustes", async () => {
    const stop = vi.fn();
    startRehearsal.mockResolvedValue({ stop });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { unmount } = render(
      <QueryClientProvider client={client}>
        <SettingsView />
      </QueryClientProvider>,
    );

    fireEvent.click(await screen.findByRole("button", { name: "Probar llamada" }));
    await screen.findByRole("button", { name: "Colgar" });
    unmount();

    expect(stop).toHaveBeenCalledTimes(1);
  });

  it("says when the rehearsal's audio could not connect", async () => {
    startRehearsal.mockImplementation(async (onEnded: (failed: boolean) => void) => {
      setTimeout(() => onEnded(true));
      return { stop: vi.fn() };
    });
    const { toast } = await import("sonner");
    renderView();

    fireEvent.click(await screen.findByRole("button", { name: "Probar llamada" }));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(expect.stringMatching(/No se pudo conectar el audio/)),
    );
    expect(await screen.findByRole("button", { name: "Probar llamada" })).toBeEnabled();
  });

  it("says why a rehearsal could not start", async () => {
    startRehearsal.mockRejectedValue(new Error("Ya usaste los minutos de llamadas de este mes."));
    const { toast } = await import("sonner");
    renderView();

    fireEvent.click(await screen.findByRole("button", { name: "Probar llamada" }));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Ya usaste los minutos de llamadas de este mes."),
    );
    expect(screen.getByRole("button", { name: "Probar llamada" })).toBeEnabled();
  });
});

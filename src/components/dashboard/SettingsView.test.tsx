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
});

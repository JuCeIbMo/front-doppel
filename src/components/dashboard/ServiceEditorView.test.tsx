import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, replace: vi.fn() }) }));
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock("sonner", () => ({ toast }));
vi.mock("@/lib/supabase", () => ({ signOut: vi.fn(), getAccessToken: vi.fn() }));
const readApi = vi.fn();
const runOperation = vi.fn();
vi.mock("@/lib/operations", () => ({
  readApi: (path: string) => readApi(path),
  runOperation: (name: string, payload: unknown) => runOperation(name, payload),
}));

import { ServiceEditorView } from "./ServiceEditorView";
import { ServicesView } from "./ServicesView";

const CORTE = {
  code: "SRV001",
  name: "Corte",
  duration_minutes: 30,
  price: "50.00",
  payment_ahead: "none",
  deposit: null,
  archived: false,
};

function renderWith(ui: React.ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe("services", () => {
  beforeEach(() => {
    readApi.mockReset().mockResolvedValue([
      CORTE,
      { ...CORTE, code: "OLD001", name: "Tinte", payment_ahead: "deposit", deposit: "20.00", archived: true },
    ]);
    runOperation.mockReset().mockResolvedValue({ status: "executed", result: {} });
    push.mockReset();
    toast.error.mockReset();
  });

  it("lists what is on offer apart from what is archived", async () => {
    renderWith(<ServicesView />);

    expect(await screen.findByText("Corte")).toBeInTheDocument();
    expect(screen.queryByText("Tinte")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Archivados (1)" }));

    expect(screen.getByText("Tinte")).toBeInTheDocument();
    expect(screen.getByText(/seña de/)).toBeInTheDocument();
  });

  it("creates a Service that asks for a deposit", async () => {
    renderWith(<ServiceEditorView />);

    fireEvent.change(screen.getByLabelText("Nombre"), { target: { value: "Tinte" } });
    fireEvent.change(screen.getByLabelText("Minutos"), { target: { value: "60" } });
    fireEvent.change(screen.getByLabelText("Precio"), { target: { value: "80" } });
    fireEvent.click(screen.getByLabelText("Una seña"));
    expect(screen.getByText("Escribe cuánto es la seña, como 20.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Crear servicio" })).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Seña"), { target: { value: "20" } });
    fireEvent.click(screen.getByRole("button", { name: "Crear servicio" }));

    await waitFor(() => expect(push).toHaveBeenCalledWith("/dashboard/services"));
    expect(runOperation).toHaveBeenCalledWith("add_service", {
      name: "Tinte",
      duration_minutes: 60,
      price: "80.00",
      payment_ahead: "deposit",
      deposit: "20.00",
    });
  });

  it("saves only what changed on an existing Service", async () => {
    renderWith(<ServiceEditorView serviceCode="SRV001" />);

    fireEvent.change(await screen.findByLabelText("Minutos"), { target: { value: "45" } });
    fireEvent.click(screen.getByLabelText("El precio completo"));
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() => expect(push).toHaveBeenCalled());
    expect(runOperation).toHaveBeenCalledWith("change_service", {
      service_code: "SRV001",
      duration_minutes: 45,
      payment_ahead: "full",
    });
  });

  it("archives and restores", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    renderWith(<ServiceEditorView serviceCode="OLD001" />);

    expect(await screen.findByLabelText("Precio")).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Restaurar" }));

    await waitFor(() =>
      expect(runOperation).toHaveBeenCalledWith("restore_service", { service_code: "OLD001" }),
    );
  });

  it("says in Spanish why a change was refused", async () => {
    runOperation.mockResolvedValue({
      status: "rejected",
      code: "SWITCHED_OFF",
      message: "This Business has booking turned off",
    });
    renderWith(<ServiceEditorView serviceCode="SRV001" />);

    fireEvent.change(await screen.findByLabelText("Precio"), { target: { value: "60" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Agendar citas está apagado. Préndelo en Cuenta."),
    );
    expect(push).not.toHaveBeenCalled();
  });
});

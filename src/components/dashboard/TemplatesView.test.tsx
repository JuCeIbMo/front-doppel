import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn() }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/lib/supabase", () => ({ signOut: vi.fn(), getAccessToken: vi.fn() }));
const readApi = vi.fn();
const runOperationOrThrow = vi.fn();
vi.mock("@/lib/operations", () => ({
  readApi: (path: string) => readApi(path),
  runOperationOrThrow: (name: string, payload: unknown) => runOperationOrThrow(name, payload),
}));

import { TemplatesView } from "./TemplatesView";

function renderView() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <TemplatesView />
    </QueryClientProvider>,
  );
}

describe("TemplatesView", () => {
  beforeEach(() => {
    readApi.mockReset();
    runOperationOrThrow.mockReset();
  });

  it("lists Meta's verdict on each template, with the reason for a rejection", async () => {
    readApi.mockResolvedValue([
      {
        name: "pedido_listo",
        category: "UTILITY",
        language: "es",
        status: "APPROVED",
        body: "Hola {{1}}",
        rejected_reason: null,
      },
      {
        name: "oferta",
        category: "MARKETING",
        language: "es",
        status: "REJECTED",
        body: "Compra ya",
        rejected_reason: "INVALID_FORMAT",
      },
    ]);

    renderView();

    expect(await screen.findByText("pedido_listo")).toBeInTheDocument();
    expect(screen.getByText("Aprobada")).toBeInTheDocument();
    expect(screen.getByText(/Motivo de Meta: INVALID_FORMAT/)).toBeInTheDocument();
  });

  it("submits a template with one example per gap", async () => {
    readApi.mockResolvedValue([]);
    runOperationOrThrow.mockResolvedValue({ name: "pedido_listo" });

    renderView();
    fireEvent.change(await screen.findByLabelText("Nombre"), {
      target: { value: "Pedido listo" },
    });
    fireEvent.change(screen.getByLabelText("Mensaje"), {
      target: { value: "Hola {{1}}, tu pedido está listo." },
    });
    fireEvent.change(screen.getByLabelText("Ejemplo para {{1}}"), { target: { value: "Ana" } });
    fireEvent.click(screen.getByRole("button", { name: "Enviar a revisión" }));

    await waitFor(() =>
      expect(runOperationOrThrow).toHaveBeenCalledWith("submit_template", {
        name: "pedido_listo",
        category: "utility",
        body: "Hola {{1}}, tu pedido está listo.",
        examples: ["Ana"],
      }),
    );
  });
});

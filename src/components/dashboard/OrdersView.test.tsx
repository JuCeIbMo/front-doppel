import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn() }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));
vi.mock("@/lib/supabase", () => ({ signOut: vi.fn(), getAccessToken: vi.fn() }));
const readApi = vi.fn();
const runOperation = vi.fn();
vi.mock("@/lib/operations", () => ({
  readApi: (path: string) => readApi(path),
  runOperation: (name: string, payload: unknown) => runOperation(name, payload),
}));

import { OrdersView } from "./OrdersView";

describe("OrdersView", () => {
  beforeEach(() => {
    readApi.mockReset();
    runOperation.mockReset();
    vi.spyOn(window, "confirm").mockReturnValue(true);
  });

  it("opens a placed Order with its proof and confirms its payment", async () => {
    readApi.mockImplementation(async (path: string) => {
      if (path === "/dashboard/orders") {
        return [
          {
            code: "ORDER1",
            status: "placed",
            total: "2.40",
            contact_code: "C1",
            whatsapp_number: "+34655000001",
            placed_at: "2026-09-16T10:00:00Z",
            expires_at: "2026-09-17T10:00:00Z",
          },
        ];
      }
      return {
        code: "ORDER1",
        status: "placed",
        total: "2.40",
        placed_at: "2026-09-16T10:00:00Z",
        expires_at: "2026-09-17T10:00:00Z",
        ended_at: null,
        lines: [{ product_code: "P1", name: "Barra", quantity: 2, unit_price: "1.20" }],
        payment_proofs: [
          {
            attached_at: "2026-09-16T10:05:00Z",
            read_amount: "2.40",
            matches_order: true,
            current: true,
            photo_url: null,
            summary: "Bizum de 2,40",
          },
        ],
      };
    });
    runOperation.mockResolvedValue({ status: "executed", result: { order_code: "ORDER1" } });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <QueryClientProvider client={client}>
        <OrdersView />
      </QueryClientProvider>,
    );

    fireEvent.click(await screen.findByRole("button", { name: "Ver" }));
    expect(await screen.findByText("Bizum de 2,40")).toBeInTheDocument();
    expect(screen.getByText("2 × Barra")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Confirmar pago" }));
    await waitFor(() =>
      expect(runOperation).toHaveBeenCalledWith("confirm_payment", { order_code: "ORDER1" }),
    );
    expect(screen.queryByRole("button", { name: "Marcar entregado" })).not.toBeInTheDocument();
  });
});

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn() }) }));
const info = vi.fn();
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn(), info: (m: string) => info(m) } }));
vi.mock("@/lib/supabase", () => ({ signOut: vi.fn(), getAccessToken: vi.fn() }));
const readApi = vi.fn();
const runOperation = vi.fn();
vi.mock("@/lib/operations", () => ({
  readApi: (path: string) => readApi(path),
  runOperation: (name: string, payload: unknown) => runOperation(name, payload),
}));

import { SaleDetailView } from "./SaleDetailView";

const SALE = {
  code: "SALE01",
  total: "24.00",
  payment_method: "transfer",
  status: "registered",
  created_at: "2026-09-16T10:00:00Z",
  voided_at: null,
  order_code: null,
  lines: [
    { product_code: "AZUCAR", name: "Azúcar 1kg", quantity: 1, unit_price: "4.00" },
    { product_code: "CAFE01", name: "Café", quantity: 2, unit_price: "10.00" },
  ],
};

function renderView() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <SaleDetailView saleCode="SALE01" />
    </QueryClientProvider>,
  );
}

describe("SaleDetailView", () => {
  beforeEach(() => {
    readApi.mockReset().mockResolvedValue(SALE);
    runOperation.mockReset();
    info.mockReset();
    vi.spyOn(window, "confirm").mockReturnValue(true);
  });

  it("shows every line and the total", async () => {
    renderView();

    expect(await screen.findByText("Azúcar 1kg")).toBeInTheDocument();
    expect(screen.getByText("Café")).toBeInTheDocument();
    expect(screen.getByText("Transferencia", { exact: false })).toBeInTheDocument();
    expect(screen.getByText(/24,00/)).toBeInTheDocument();
    expect(readApi).toHaveBeenCalledWith("/dashboard/sales/SALE01");
  });

  it("voiding asks for an Approval", async () => {
    runOperation.mockResolvedValue({
      status: "approval_created",
      result: { approval_id: "a-1" },
    });
    renderView();

    fireEvent.click(await screen.findByRole("button", { name: "Anular venta" }));

    await waitFor(() =>
      expect(runOperation).toHaveBeenCalledWith("void_sale", { sale_code: "SALE01" }),
    );
    await waitFor(() => expect(info).toHaveBeenCalledWith(expect.stringMatching(/aprobación/)));
  });

  it("a voided sale offers no void", async () => {
    readApi.mockResolvedValue({ ...SALE, status: "voided", voided_at: "2026-09-16T11:00:00Z" });
    renderView();

    expect(await screen.findByText("Anulada")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Anular venta" })).not.toBeInTheDocument();
  });
});

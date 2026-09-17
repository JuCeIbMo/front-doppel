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

import { SalesView } from "./SalesView";

function renderView() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <SalesView />
    </QueryClientProvider>,
  );
}

describe("SalesView", () => {
  beforeEach(() => {
    readApi.mockReset();
    runOperationOrThrow.mockReset();
    vi.spyOn(window, "confirm").mockReturnValue(true);
  });

  it("lists the sales and voids a registered one with void_sale", async () => {
    readApi.mockResolvedValue([
      {
        code: "SALE01",
        total: "12.50",
        payment_method: "cash",
        status: "registered",
        created_at: "2026-09-16T10:00:00Z",
        voided_at: null,
      },
      {
        code: "SALE02",
        total: "3.00",
        payment_method: "card",
        status: "voided",
        created_at: "2026-09-16T09:00:00Z",
        voided_at: "2026-09-16T09:30:00Z",
      },
    ]);
    runOperationOrThrow.mockResolvedValue({ sale_code: "SALE01" });

    renderView();

    expect(await screen.findByText("SALE01")).toBeInTheDocument();
    expect(screen.getByText("Anulada")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Anular" }));
    await waitFor(() =>
      expect(runOperationOrThrow).toHaveBeenCalledWith("void_sale", { sale_code: "SALE01" }),
    );
    expect(readApi).toHaveBeenCalledWith("/dashboard/sales");
  });
});

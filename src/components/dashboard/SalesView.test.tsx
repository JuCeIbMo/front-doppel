import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn() }) }));
vi.mock("@/lib/supabase", () => ({ signOut: vi.fn(), getAccessToken: vi.fn() }));
const readApi = vi.fn();
vi.mock("@/lib/operations", () => ({
  readApi: (path: string) => readApi(path),
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
  });

  it("lists the sales, each leading to its detail", async () => {
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

    renderView();

    expect(await screen.findByRole("link", { name: "SALE01" })).toHaveAttribute(
      "href",
      "/dashboard/sales/SALE01",
    );
    expect(screen.getByText("Anulada")).toBeInTheDocument();
    expect(readApi).toHaveBeenCalledWith("/dashboard/sales");
  });
});

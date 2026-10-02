import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
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

  it("lists today's sales by whose they were, each leading to its detail, under the day's total", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-09-16T20:00:00Z"));
    readApi.mockImplementation(async (path: string) => {
      if (path === "/dashboard/overview") {
        return {
          sales_by_day: [
            { day: "2026-09-15", total: "100.00", sales: 2 },
            { day: "2026-09-16", total: "12.50", sales: 1 },
          ],
        };
      }
      if (path === "/dashboard/business") return { selling_enabled: true, booking_enabled: false };
      return [
        { code: "SALE01", total: "12.50", payment_method: "cash", status: "registered", created_at: "2026-09-16T14:00:00Z", voided_at: null, customer_name: "Carlos Mamani" },
        { code: "SALE02", total: "3.00", payment_method: "card", status: "voided", created_at: "2026-09-16T13:00:00Z", voided_at: "2026-09-16T13:30:00Z", customer_name: null },
        { code: "SALE00", total: "100.00", payment_method: "transfer", status: "registered", created_at: "2026-09-15T14:00:00Z", voided_at: null, customer_name: "Ana Rojas" },
      ];
    });

    renderView();

    expect(await screen.findByRole("link", { name: /Carlos Mamani/ })).toHaveAttribute(
      "href",
      "/dashboard/sales/SALE01",
    );
    expect(screen.getByRole("link", { name: /Sin cliente/ })).toHaveTextContent("Anulada");
    expect(screen.getByRole("link", { name: /Carlos Mamani/ })).toHaveTextContent("10:00 · Efectivo");
    expect(await screen.findByText("en 1 venta")).toBeInTheDocument();
    expect(screen.queryByText("Ana Rojas")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Esta semana" }));
    expect(screen.getByText("Ana Rojas")).toBeInTheDocument();
    expect(screen.getByText("en 3 ventas")).toBeInTheDocument();
    vi.useRealTimers();
  });
});

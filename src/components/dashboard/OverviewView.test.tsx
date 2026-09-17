import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn() }) }));
vi.mock("@/lib/supabase", () => ({ signOut: vi.fn(), getAccessToken: vi.fn() }));
const readApi = vi.fn();
vi.mock("@/lib/operations", () => ({ readApi: (path: string) => readApi(path) }));

import { OverviewView, type Overview } from "./OverviewView";

const EMPTY: Overview = {
  sold_today: "0.00",
  sales_today: 0,
  orders_to_collect: 0,
  orders_to_deliver: 0,
  pending_approvals: 0,
  handed_over: 0,
  messages_this_month: 0,
  free_messages_per_month: 1000,
  onboarding: {
    line_connected: false,
    has_product: false,
    has_knowledge: false,
    has_manager_phone: false,
  },
};

function renderView() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <OverviewView />
    </QueryClientProvider>,
  );
}

describe("OverviewView", () => {
  beforeEach(() => readApi.mockReset());

  it("walks a new business through four steps", async () => {
    readApi.mockResolvedValue(EMPTY);
    renderView();

    expect(await screen.findByText("0 de 4 pasos listos.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Conecta tu WhatsApp →" })).toHaveAttribute(
      "href",
      "/dashboard/settings",
    );
    expect(readApi).toHaveBeenCalledWith("/dashboard/overview");
  });

  it("shows the numbers and no checklist once every step is done", async () => {
    readApi.mockResolvedValue({
      ...EMPTY,
      sold_today: "150.50",
      sales_today: 3,
      orders_to_collect: 2,
      orders_to_deliver: 1,
      pending_approvals: 4,
      handed_over: 1,
      messages_this_month: 850,
      onboarding: {
        line_connected: true,
        has_product: true,
        has_knowledge: true,
        has_manager_phone: true,
      },
    });
    renderView();

    expect(await screen.findByText(/150,50/)).toBeInTheDocument();
    expect(screen.getByText("3 ventas")).toBeInTheDocument();
    expect(screen.getByText("850 / 1000")).toBeInTheDocument();
    expect(screen.getByText("Cerca del límite gratis")).toBeInTheDocument();
    expect(screen.queryByText(/pasos listos/)).not.toBeInTheDocument();
  });
});

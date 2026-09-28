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
  call_minutes_this_month: 0,
  call_minutes_per_month: 150,
  onboarding: {
    line_connected: false,
    has_product: false,
    has_service: false,
    has_hours: false,
    has_knowledge: false,
    has_manager_phone: false,
  },
};

const SELLS = { selling_enabled: true, booking_enabled: false };
const BOOKS = { selling_enabled: false, booking_enabled: true };

function answers(overview: Overview, kind = SELLS) {
  readApi.mockImplementation(async (path: string) => {
    if (path === "/dashboard/overview") return overview;
    if (path === "/dashboard/business") return { id: "b1", name: "Tienda", calendar_email: null, ...kind };
    if (path === "/dashboard/sales") return [];
    if (path.startsWith("/dashboard/agenda")) return [];
    throw new Error(path);
  });
}

function renderView() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <OverviewView />
    </QueryClientProvider>,
  );
}

describe("OverviewView", () => {
  beforeEach(() => {
    readApi.mockReset();
  });

  it("walks a new business through four steps", async () => {
    answers(EMPTY);
    renderView();

    expect(await screen.findByText("0 de 4 pasos listos")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Conecta tu WhatsApp" })).toHaveAttribute(
      "href",
      "/dashboard/settings",
    );
    expect(screen.getByRole("link", { name: "Agrega tu primer producto" })).toBeInTheDocument();
    expect(readApi).toHaveBeenCalledWith("/dashboard/overview");
  });

  it("walks a business that books through its first Service and its hours, not a product", async () => {
    answers(EMPTY, BOOKS);
    renderView();

    expect(await screen.findByText("0 de 5 pasos listos")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Agrega tu primer servicio" })).toHaveAttribute(
      "href",
      "/dashboard/services/new",
    );
    expect(screen.getByRole("link", { name: "Arma tu horario" })).toHaveAttribute(
      "href",
      "/dashboard/hours",
    );
    expect(screen.queryByText(/primer producto/)).not.toBeInTheDocument();
    expect(screen.queryByText("Pedidos por cobrar")).not.toBeInTheDocument();
  });

  it("counts the Service and hours of a business that books as done", async () => {
    answers(
      {
        ...EMPTY,
        onboarding: { ...EMPTY.onboarding, line_connected: true, has_service: true, has_hours: true },
      },
      BOOKS,
    );
    renderView();

    expect(await screen.findByText("3 de 5 pasos listos")).toBeInTheDocument();
  });

  it("shows the numbers and no checklist once every step is done", async () => {
    answers({
      ...EMPTY,
      sold_today: "150.50",
      sales_today: 3,
      orders_to_collect: 2,
      orders_to_deliver: 1,
      pending_approvals: 4,
      handed_over: 1,
      messages_this_month: 850,
      call_minutes_this_month: 150,
      onboarding: {
        line_connected: true,
        has_product: true,
        has_service: false,
        has_hours: false,
        has_knowledge: true,
        has_manager_phone: true,
      },
    });
    renderView();

    expect(await screen.findByText(/150,50/)).toBeInTheDocument();
    expect(screen.getByText("3 ventas")).toBeInTheDocument();
    expect(screen.getByText(/^850 \/ 1\.?000$/)).toBeInTheDocument();
    expect(screen.getByText("Cerca del límite gratis")).toBeInTheDocument();
    expect(screen.getByText("150 / 150")).toBeInTheDocument();
    expect(
      screen.getByText("Se acabaron: las llamadas vuelven el 1 del próximo mes"),
    ).toBeInTheDocument();
    expect(screen.queryByText(/pasos listos/)).not.toBeInTheDocument();
    expect(screen.getByText("8")).toBeInTheDocument();
    expect(screen.getByText("cosas te esperan")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Aprobaciones 4" })).toHaveAttribute(
      "href",
      "/dashboard/approvals",
    );
  });

  it("says nothing waits once there is nothing to decide", async () => {
    answers({
      ...EMPTY,
      onboarding: {
        line_connected: true,
        has_product: true,
        has_service: true,
        has_hours: true,
        has_knowledge: true,
        has_manager_phone: true,
      },
    });
    renderView();

    expect(await screen.findByText("Todo en orden. El bot se encarga.")).toBeInTheDocument();
    expect(screen.queryByText(/te espera/)).not.toBeInTheDocument();
  });

  it("lists today's Appointments of a business that books", async () => {
    answers(EMPTY, BOOKS);
    renderView();

    expect(await screen.findByText("No hay citas hoy.")).toBeInTheDocument();
  });

  it("offers a retry when the page of the day cannot be read", async () => {
    readApi.mockRejectedValue(new Error("Sin conexión."));
    renderView();

    expect(await screen.findByText("No pudimos abrir tu página de hoy.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reintentar" })).toBeInTheDocument();
  });
});

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const router = { replace: vi.fn() };
vi.mock("next/navigation", () => ({ useRouter: () => router, usePathname: () => "/dashboard" }));
vi.mock("@/hooks/useRequireAuth", () => ({ useRequireAuth: vi.fn() }));
vi.mock("@/lib/supabase", () => ({ signOut: vi.fn() }));
const readApi = vi.fn();
vi.mock("@/lib/operations", () => ({ readApi: (path: string) => readApi(path) }));

import { OwnerShell } from "./OwnerShell";

function renderShell(business: { selling_enabled: boolean; booking_enabled: boolean }) {
  readApi.mockResolvedValue({ id: "b1", name: "Tienda", calendar_email: null, ...business });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <OwnerShell>contenido</OwnerShell>
    </QueryClientProvider>,
  );
}

describe("OwnerShell", () => {
  beforeEach(() => {
    readApi.mockReset();
  });

  it("hides Products and Orders from a Business that only books", async () => {
    renderShell({ selling_enabled: false, booking_enabled: true });

    // The links behind a switch wait for the Business, so let it arrive first.
    await act(async () => {});
    expect((await screen.findAllByRole("link", { name: /Servicios/ })).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: "Ventas" }).length).toBeGreaterThan(0);
    expect(screen.queryByRole("link", { name: /Productos/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Inventario/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Pedidos" })).not.toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /Horarios/ }).length).toBeGreaterThan(0);
    expect(readApi).toHaveBeenCalledWith("/dashboard/business");
  });

  it("offers Products and Orders to a Business that sells", async () => {
    renderShell({ selling_enabled: true, booking_enabled: false });

    expect(await screen.findByRole("link", { name: /Productos/ })).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Pedidos" }).length).toBeGreaterThan(0);
    expect(screen.queryByRole("link", { name: /Servicios/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Horarios/ })).not.toBeInTheDocument();
  });

  it("keeps every screen in the menu when the Business cannot be read", async () => {
    readApi.mockRejectedValue(new Error("No pudimos conectar con Doppel"));
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <OwnerShell>contenido</OwnerShell>
      </QueryClientProvider>,
    );

    expect(await screen.findByRole("link", { name: /Productos/ })).toBeInTheDocument();
  });
});

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn() }) }));
vi.mock("@/lib/supabase", () => ({ signOut: vi.fn(), getAccessToken: vi.fn() }));
const readApi = vi.fn();
vi.mock("@/lib/operations", () => ({ readApi: (path: string) => readApi(path) }));

import { ActivityView } from "./ActivityView";

const row = (id: string, operation: string, kind: string, created_at: string) => ({
  id,
  operation,
  actor: { kind },
  status: "executed",
  rejection_code: null,
  created_at,
});

describe("ActivityView", () => {
  beforeEach(() => readApi.mockReset());

  it("shows the log in Owner words, filters by who acted and loads the page before the last row", async () => {
    readApi
      .mockResolvedValueOnce([
        row("1", "place_order", "public_agent", "2026-09-16T10:00:00Z"),
        row("2", "change_price", "owner", "2026-09-16T09:00:00Z"),
      ])
      .mockResolvedValueOnce([row("3", "expire_order", "system", "2026-09-16T08:00:00Z")]);
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <QueryClientProvider client={client}>
        <ActivityView />
      </QueryClientProvider>,
    );

    expect(await screen.findByText("Pedido creado")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Tú" }));
    expect(screen.queryByText("Pedido creado")).not.toBeInTheDocument();
    expect(screen.getByText("Precio cambiado")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Todo" }));
    fireEvent.click(screen.getByRole("button", { name: "Cargar más" }));
    expect(await screen.findByText("Pedido vencido")).toBeInTheDocument();
    await waitFor(() =>
      expect(readApi).toHaveBeenLastCalledWith(
        "/dashboard/operations?before=2026-09-16T09%3A00%3A00Z",
      ),
    );
  });
});

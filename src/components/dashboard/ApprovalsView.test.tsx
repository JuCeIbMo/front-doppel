import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn() }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/lib/supabase", () => ({ signOut: vi.fn(), getAccessToken: vi.fn() }));
const readApi = vi.fn();
const answerApproval = vi.fn();
vi.mock("@/lib/operations", () => ({
  readApi: (path: string) => readApi(path),
  answerApproval: (id: string, choice: string) => answerApproval(id, choice),
}));

import { ApprovalsView } from "./ApprovalsView";

describe("ApprovalsView", () => {
  beforeEach(() => {
    readApi.mockReset();
    answerApproval.mockReset();
  });

  it("shows a pending Approval in Owner words and declines it", async () => {
    readApi.mockResolvedValue([
      {
        id: "a1",
        operation: "void_sale",
        payload: { sale_code: "SALE01" },
        requested_by: { kind: "public_agent" },
        reason: "A person needs to approve this",
        created_at: "2026-09-16T10:00:00Z",
        expires_at: "2026-09-17T10:00:00Z",
      },
    ]);
    answerApproval.mockResolvedValue({ status: "executed", result: { approval_id: "a1" } });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <QueryClientProvider client={client}>
        <ApprovalsView />
      </QueryClientProvider>,
    );

    expect(await screen.findByText("Venta anulada")).toBeInTheDocument();
    expect(screen.getByText(/El bot, hablando con un cliente/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Rechazar" }));
    await waitFor(() => expect(answerApproval).toHaveBeenCalledWith("a1", "decline"));
  });
});

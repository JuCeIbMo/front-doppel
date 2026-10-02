import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn() }) }));
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }));
vi.mock("sonner", () => ({ toast }));
vi.mock("@/lib/supabase", () => ({ signOut: vi.fn(), getAccessToken: vi.fn() }));
const readApi = vi.fn();
const runOperation = vi.fn();
const answerApproval = vi.fn();
vi.mock("@/lib/operations", () => ({
  readApi: (path: string) => readApi(path),
  runOperation: (name: string, payload: unknown) => runOperation(name, payload),
  answerApproval: (id: string, choice: string) => answerApproval(id, choice),
}));

function business(selling: boolean, booking: boolean) {
  return { id: "b1", name: "Tienda", selling_enabled: selling, booking_enabled: booking, calendar_email: null };
}

function renderView(props: { initialStatus?: string } = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <OrdersView {...props} />
    </QueryClientProvider>,
  );
}

const CORTE = {
  appointment_code: "APT001",
  starts_at: "2026-10-08T10:00:00-04:00",
  ends_at: "2026-10-08T10:30:00-04:00",
  status: "booked",
  service_code: "SRV001",
  service: "Corte",
  professional_code: "PRO001",
  professional: "rosa@gmail.com",
  customer: "Carlos",
  whatsapp_number: "+59170123456",
  price: "50.00",
  amount_due: "20.00",
  pay_by: "2026-10-07T20:00:00-04:00",
};
const TINTE = { ...CORTE, appointment_code: "APT002", service: "Tinte", status: "paid", amount_due: "0", pay_by: null };
const BARBA = { ...CORTE, appointment_code: "APT003", service: "Barba", amount_due: "0", pay_by: null };
const PASADA = {
  ...CORTE,
  appointment_code: "APT004",
  service: "Peinado",
  status: "attended",
  starts_at: "2026-10-01T10:00:00-04:00",
  ends_at: "2026-10-01T10:30:00-04:00",
  amount_due: "0",
};

import { OrdersView } from "./OrdersView";

describe("OrdersView", () => {
  beforeEach(() => {
    readApi.mockReset();
    runOperation.mockReset();
    answerApproval.mockReset();
    Object.values(toast).forEach((fn) => fn.mockReset());
    vi.spyOn(window, "confirm").mockReturnValue(true);
  });

  it("opens a placed Order with its proof and confirms its payment", async () => {
    readApi.mockImplementation(async (path: string) => {
      if (path === "/dashboard/business") return business(true, false);
      if (path === "/dashboard/approvals") return [];
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
            customer_name: "Carlos Mamani",
            lines: [
              { name: "Barra", quantity: 2 },
              { name: "Café", quantity: 1 },
            ],
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
    renderView();

    expect(await screen.findByRole("heading", { name: "Pedidos" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Por entregar/ })).toBeInTheDocument();
    // The row says whose it is and what was ordered, and opens their chat.
    expect(await screen.findByText("Carlos Mamani")).toBeInTheDocument();
    expect(screen.getByText("2 × Barra, 1 × Café")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /abrir su conversación/ })).toHaveAttribute(
      "href",
      "/dashboard/automation?numero=+34655000001",
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

  describe("for a Business that books", () => {
    beforeEach(() => {
      vi.useFakeTimers({ toFake: ["Date"] });
      vi.setSystemTime(new Date("2026-10-06T12:00:00Z"));
    });
    afterEach(() => vi.useRealTimers());

    function answers(approvals: unknown[] = []) {
      readApi.mockImplementation(async (path: string) => {
        if (path === "/dashboard/business") return business(false, true);
        if (path === "/dashboard/approvals") return approvals;
        if (path === "/dashboard/agenda?first_day=2026-10-06&last_day=2026-11-05") return [CORTE, TINTE, BARBA];
        if (path === "/dashboard/agenda?first_day=2026-09-06&last_day=2026-10-05") return [PASADA];
        if (path.includes("/free-times?day=")) return [{ starts_at: "2026-10-09T09:30:00-04:00" }];
        throw new Error(path);
      });
    }

    it("is Citas: what owes, what is confirmed to attend, and what is closed", async () => {
      answers();
      renderView();

      expect(await screen.findByRole("heading", { name: "Citas" })).toBeInTheDocument();
      expect(readApi).not.toHaveBeenCalledWith("/dashboard/orders");
      const owing = await screen.findByRole("tab", { name: /Por cobrar/ });
      expect(owing).toHaveAttribute("aria-selected", "true");
      expect(screen.getByText("Corte")).toBeInTheDocument();
      expect(screen.queryByText(/rosa@gmail.com/)).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: "Confirmar pago" }));
      await waitFor(() =>
        expect(runOperation).toHaveBeenCalledWith("confirm_appointment_payment", { appointment_code: "APT001" }),
      );

      fireEvent.click(screen.getByRole("tab", { name: /Por atender/ }));
      const [tinte, barba] = screen.getAllByRole("article");
      expect(within(tinte).getByText("Pagada")).toBeInTheDocument();
      expect(within(barba).getByText("Confirmada")).toBeInTheDocument();

      fireEvent.click(screen.getByRole("tab", { name: /Cerrados/ }));
      expect(screen.getByText("Peinado")).toBeInTheDocument();
    });

    it("moves and cancels, and says when a refund waits for approval or was refused", async () => {
      answers();
      renderView({ initialStatus: "paid" });

      const [tinte, barba] = await screen.findAllByRole("article");
      fireEvent.click(within(barba).getByRole("button", { name: "Mover" }));
      fireEvent.change(within(barba).getByLabelText("Nuevo día"), { target: { value: "2026-10-09" } });
      fireEvent.click(await within(barba).findByRole("button", { name: "09:30" }));
      await waitFor(() =>
        expect(runOperation).toHaveBeenCalledWith("move_appointment", {
          appointment_code: "APT003",
          starts_at: "2026-10-09T09:30:00-04:00",
        }),
      );

      fireEvent.click(within(barba).getByRole("button", { name: "Cancelar" }));
      await waitFor(() =>
        expect(runOperation).toHaveBeenCalledWith("cancel_appointment", { appointment_code: "APT003" }),
      );

      runOperation.mockResolvedValueOnce({ status: "approval_created", result: { approval_id: "a1" } });
      fireEvent.click(within(tinte).getByRole("button", { name: "Reembolsar" }));
      await waitFor(() => expect(toast.info).toHaveBeenCalledWith(expect.stringMatching(/aprobación/)));

      runOperation.mockResolvedValueOnce({ status: "rejected", code: "APPOINTMENT_STARTED", message: "x" });
      fireEvent.click(within(barba).getByRole("button", { name: "Cancelar" }));
      await waitFor(() => expect(toast.error).toHaveBeenCalledWith(expect.stringMatching(/ya empezó/)));
    });

    it("puts the Approvals about its Appointments on top, to answer there", async () => {
      answers([
        {
          id: "ap1",
          operation: "refund_appointment",
          payload: { appointment_code: "APT002" },
          requested_by: { kind: "admin_agent" },
          reason: "El cliente no puede venir",
          created_at: "2026-10-06T10:00:00Z",
          expires_at: "2026-10-07T10:00:00Z",
        },
        {
          id: "ap2",
          operation: "void_sale",
          payload: { sale_code: "S1" },
          requested_by: { kind: "admin_agent" },
          reason: null,
          created_at: "2026-10-06T10:00:00Z",
          expires_at: "2026-10-07T10:00:00Z",
        },
      ]);
      answerApproval.mockResolvedValue({ status: "executed", result: {} });
      renderView();

      const asked = await screen.findByRole("region", { name: "Esperan tu sí" });
      expect(within(asked).getByText("Reembolsar la cita APT002")).toBeInTheDocument();
      expect(within(asked).queryByText(/Anular la venta/)).not.toBeInTheDocument();
      fireEvent.click(within(asked).getByRole("button", { name: "Rechazar" }));
      await waitFor(() => expect(answerApproval).toHaveBeenCalledWith("ap1", "decline"));
    });
  });
});

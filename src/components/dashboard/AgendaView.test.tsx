import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }));
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }));
vi.mock("sonner", () => ({ toast }));
vi.mock("@/lib/supabase", () => ({ signOut: vi.fn(), getAccessToken: vi.fn() }));
const readApi = vi.fn();
const runOperation = vi.fn();
vi.mock("@/lib/operations", () => ({
  readApi: (path: string) => readApi(path),
  runOperation: (name: string, payload: unknown) => runOperation(name, payload),
}));

import { AgendaView } from "./AgendaView";

const TEAM = {
  professionals: [
    { professional_code: "PRO001", name: "Rosa", hours: [], services: null, days_off: [] },
    { professional_code: "PRO002", name: "Pedro", hours: [], services: null, days_off: [] },
  ],
  business_closed: [],
};
const CORTE = {
  appointment_code: "APT001",
  starts_at: "2026-10-06T10:00:00-04:00",
  ends_at: "2026-10-06T10:30:00-04:00",
  status: "booked",
  service_code: "SRV001",
  service: "Corte",
  professional_code: "PRO002",
  professional: "Pedro",
  customer: "Carlos",
  whatsapp_number: "+59170123456",
  price: "50.00",
  amount_due: "20.00",
  pay_by: "2026-10-05T20:00:00-04:00",
};
const TINTE = {
  ...CORTE,
  appointment_code: "APT002",
  starts_at: "2026-10-06T11:00:00-04:00",
  ends_at: "2026-10-06T12:00:00-04:00",
  status: "paid",
  service: "Tinte",
  amount_due: "0",
  pay_by: null,
};

function answers(agenda: unknown[]) {
  readApi.mockImplementation(async (path: string) => {
    if (path.startsWith("/dashboard/agenda?")) return agenda;
    if (path === "/dashboard/team") return TEAM;
    if (path === "/dashboard/business") {
      return { id: "b1", name: "Barbería", selling_enabled: false, booking_enabled: true, calendar_email: "rosa@gmail.com" };
    }
    if (path.includes("/free-times?day=")) {
      return [{ starts_at: "2026-10-07T09:00:00-04:00" }, { starts_at: "2026-10-07T09:30:00-04:00" }];
    }
    throw new Error(path);
  });
}

function renderView() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <AgendaView />
    </QueryClientProvider>,
  );
}

describe("AgendaView", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-06T12:00:00Z")); // Tuesday 08:00 in La Paz
    readApi.mockReset();
    runOperation.mockReset().mockResolvedValue({ status: "executed", result: {} });
    Object.values(toast).forEach((fn) => fn.mockReset());
    vi.spyOn(window, "confirm").mockReturnValue(true);
  });

  afterEach(() => vi.useRealTimers());

  it("marks the month and lists today's Appointments by the hour, with status and payment", async () => {
    answers([CORTE, TINTE]);
    renderView();

    const today = await screen.findByRole("region", { name: "Martes, 6 de octubre" });
    expect(readApi).toHaveBeenCalledWith("/dashboard/agenda?first_day=2026-10-01&last_day=2026-10-31");
    expect(readApi).toHaveBeenCalledWith("/dashboard/agenda?first_day=2026-10-06&last_day=2026-10-12");
    expect(within(today).getByText("Hoy, martes 6 de octubre")).toBeInTheDocument();
    expect(within(today).getByText("Corte")).toBeInTheDocument();
    expect(within(today).getAllByText("con Pedro")).toHaveLength(2);
    expect(within(today).getByText(/Falta pagar/)).toBeInTheDocument();
    expect(within(today).getByText("Pagada")).toBeInTheDocument();
    expect(
      await screen.findByRole("button", { name: "Martes, 6 de octubre: 2 citas, falta pagar" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Miércoles, 7 de octubre" })).toHaveTextContent("Sin citas");
    expect(screen.getByText(/rosa@gmail.com/)).toBeInTheDocument();
    expect(screen.getByText(/lo que cambies allí no cambia tus citas/i)).toBeInTheDocument();
  });

  it("moves an Appointment to a free time of the day the Owner picks", async () => {
    answers([CORTE]);
    renderView();

    fireEvent.click(await screen.findByRole("button", { name: "Mover" }));
    fireEvent.change(screen.getByLabelText("Nuevo día"), { target: { value: "2026-10-07" } });
    fireEvent.click(await screen.findByRole("button", { name: "09:30" }));

    await waitFor(() =>
      expect(runOperation).toHaveBeenCalledWith("move_appointment", {
        appointment_code: "APT001",
        starts_at: "2026-10-07T09:30:00-04:00",
      }),
    );
    expect(readApi).toHaveBeenCalledWith("/dashboard/agenda/APT001/free-times?day=2026-10-07");
  });

  it("cancels, and says when a refund waits for approval or was refused", async () => {
    answers([CORTE, TINTE]);
    renderView();

    const [corte, tinte] = await screen.findAllByRole("article");
    fireEvent.click(within(corte).getByRole("button", { name: "Cancelar" }));
    await waitFor(() =>
      expect(runOperation).toHaveBeenCalledWith("cancel_appointment", { appointment_code: "APT001" }),
    );

    runOperation.mockResolvedValueOnce({ status: "approval_created", result: { approval_id: "a1" } });
    fireEvent.click(within(tinte).getByRole("button", { name: "Reembolsar" }));
    await waitFor(() => expect(toast.info).toHaveBeenCalledWith(expect.stringMatching(/Aprobaciones/)));

    runOperation.mockResolvedValueOnce({ status: "rejected", code: "APPOINTMENT_STARTED", message: "x" });
    fireEvent.click(within(corte).getByRole("button", { name: "Cancelar" }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(expect.stringMatching(/ya empezó/)));
  });

  it("lists from the day picked on the month, and walks to the next month", async () => {
    answers([{ ...CORTE, starts_at: "2026-10-20T10:00:00-04:00", ends_at: "2026-10-20T10:30:00-04:00" }]);
    renderView();

    fireEvent.click(await screen.findByRole("button", { name: /^Martes, 20 de octubre: 1 cita/ }));
    await waitFor(() =>
      expect(readApi).toHaveBeenCalledWith("/dashboard/agenda?first_day=2026-10-20&last_day=2026-10-26"),
    );
    const day = await screen.findByRole("region", { name: "Martes, 20 de octubre" });
    expect(await within(day).findByText("Corte")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Mes siguiente" }));
    await waitFor(() =>
      expect(readApi).toHaveBeenCalledWith("/dashboard/agenda?first_day=2026-11-01&last_day=2026-11-30"),
    );
    expect(readApi).toHaveBeenCalledWith("/dashboard/agenda?first_day=2026-11-01&last_day=2026-11-07");
    expect(screen.getByRole("heading", { name: "noviembre 2026" })).toBeInTheDocument();
  });
});

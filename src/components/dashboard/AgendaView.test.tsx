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

const BARBA = {
  ...CORTE,
  appointment_code: "APT003",
  starts_at: "2026-10-06T15:00:00-04:00",
  ends_at: "2026-10-06T15:30:00-04:00",
  service: "Barba",
  amount_due: "0",
  pay_by: null,
};
const CANCELADA = { ...BARBA, appointment_code: "APT004", service: "Peinado", status: "cancelled" };

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

function renderView(props: { initialDay?: string; highlight?: string } = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <AgendaView {...props} />
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

  it("shows only what is confirmed, with how it stands, and nothing to press", async () => {
    answers([CORTE, TINTE, BARBA, CANCELADA]);
    renderView();

    const today = await screen.findByRole("region", { name: "Martes, 6 de octubre" });
    expect(readApi).toHaveBeenCalledWith("/dashboard/agenda?first_day=2026-10-01&last_day=2026-10-31");
    expect(readApi).toHaveBeenCalledWith("/dashboard/agenda?first_day=2026-10-06&last_day=2026-10-12");
    expect(within(today).getByText("Hoy, martes 6 de octubre")).toBeInTheDocument();
    // Corte still owes its deposit and Peinado was called off: neither is on the Agenda.
    expect(within(today).queryByText("Corte")).not.toBeInTheDocument();
    expect(within(today).queryByText("Peinado")).not.toBeInTheDocument();
    expect(within(today).getByText("Tinte")).toBeInTheDocument();
    expect(within(today).getByText("Pagada")).toBeInTheDocument();
    expect(within(today).getByText("Barba")).toBeInTheDocument();
    expect(within(today).getByText("Confirmada")).toBeInTheDocument();
    expect(within(today).getByText("2 citas")).toBeInTheDocument();
    expect(within(today).queryByRole("button")).not.toBeInTheDocument();
    expect(within(today).queryByText(/con Pedro/)).not.toBeInTheDocument();
    expect(within(today).getAllByRole("link", { name: /abrir su conversación/ })[0]).toHaveAttribute(
      "href",
      "/dashboard/automation?numero=%2B59170123456",
    );
    expect(
      await screen.findByRole("button", { name: "Martes, 6 de octubre: 2 citas" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Miércoles, 7 de octubre" })).toHaveTextContent("Sin citas");
    expect(screen.getByText(/rosa@gmail.com/)).toBeInTheDocument();
  });

  it("opens on the day asked and points at the Appointment asked", async () => {
    const later = { ...TINTE, starts_at: "2026-10-20T11:00:00-04:00", ends_at: "2026-10-20T12:00:00-04:00" };
    answers([CORTE, later]);
    renderView({ initialDay: "2026-10-20", highlight: "APT002" });

    const day = await screen.findByRole("region", { name: "Martes, 20 de octubre" });
    expect(readApi).toHaveBeenCalledWith("/dashboard/agenda?first_day=2026-10-20&last_day=2026-10-26");
    expect(await within(day).findByRole("article")).toHaveAttribute("aria-current", "true");
  });

  it("lists from the day picked on the month, and walks to the next month", async () => {
    answers([{ ...BARBA, starts_at: "2026-10-20T10:00:00-04:00", ends_at: "2026-10-20T10:30:00-04:00" }]);
    renderView();

    fireEvent.click(await screen.findByRole("button", { name: /^Martes, 20 de octubre: 1 cita/ }));
    await waitFor(() =>
      expect(readApi).toHaveBeenCalledWith("/dashboard/agenda?first_day=2026-10-20&last_day=2026-10-26"),
    );
    const day = await screen.findByRole("region", { name: "Martes, 20 de octubre" });
    expect(await within(day).findByText("Barba")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Mes siguiente" }));
    await waitFor(() =>
      expect(readApi).toHaveBeenCalledWith("/dashboard/agenda?first_day=2026-11-01&last_day=2026-11-30"),
    );
    expect(readApi).toHaveBeenCalledWith("/dashboard/agenda?first_day=2026-11-01&last_day=2026-11-07");
    expect(screen.getByRole("heading", { name: "noviembre 2026" })).toBeInTheDocument();
  });
});

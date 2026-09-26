import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/lib/supabase", () => ({ signOut: vi.fn(), getAccessToken: vi.fn() }));
const readApi = vi.fn();
const runOperation = vi.fn();
vi.mock("@/lib/operations", () => ({
  readApi: (path: string) => readApi(path),
  runOperation: (name: string, payload: unknown) => runOperation(name, payload),
}));

import { HoursView } from "./HoursView";

const ROSA = {
  professional_code: "PRO001",
  name: "Rosa",
  hours: [{ day: "monday", starts_at: "09:00", ends_at: "13:00" }],
  services: null,
  days_off: [],
};
const PEDRO = {
  professional_code: "PRO002",
  name: "Pedro",
  hours: [],
  services: [{ code: "SRV001", name: "Corte" }],
  days_off: ["2026-10-06", "2026-10-07"],
};
const SERVICES = [
  { code: "SRV001", name: "Corte", duration_minutes: 30, price: "50.00", payment_ahead: "none", deposit: null, archived: false },
  { code: "SRV002", name: "Barba", duration_minutes: 20, price: "30.00", payment_ahead: "none", deposit: null, archived: false },
];

function answers(team: unknown) {
  readApi.mockImplementation(async (path: string) =>
    path === "/dashboard/team" ? team : SERVICES,
  );
}

function renderView() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <HoursView />
    </QueryClientProvider>,
  );
}

describe("HoursView", () => {
  beforeEach(() => {
    readApi.mockReset();
    runOperation
      .mockReset()
      .mockResolvedValue({ status: "executed", result: { still_to_happen: [] } });
    vi.spyOn(window, "confirm").mockReturnValue(true);
  });

  it("shows a Business of one only its own week, with no one to pick", async () => {
    answers({ professionals: [ROSA], business_closed: [] });
    renderView();

    expect(await screen.findByText("Tu semana")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Rosa" })).not.toBeInTheDocument();
    expect(screen.queryByText(/Qué hace/)).not.toBeInTheDocument();
    expect(screen.queryByText(/ya no trabaja aquí/)).not.toBeInTheDocument();
  });

  it("saves the week with a break, in the order the API reads it", async () => {
    answers({ professionals: [ROSA], business_closed: [] });
    renderView();

    fireEvent.click(await screen.findByLabelText("Viernes"));
    fireEvent.click(screen.getByRole("button", { name: "Agregar tramo al viernes" }));
    fireEvent.click(screen.getByRole("button", { name: "Agregar tramo al lunes" }));
    const [, second] = screen.getAllByLabelText("Lunes, desde");
    fireEvent.change(second, { target: { value: "15:00" } });
    fireEvent.change(screen.getAllByLabelText("Lunes, hasta")[1], { target: { value: "19:00" } });
    // The Friday's second block starts and ends at 18:00 until it is filled in.
    fireEvent.click(screen.getByRole("button", { name: "Quitar tramo del viernes" }));
    fireEvent.click(screen.getByRole("button", { name: "Guardar horario" }));

    await waitFor(() =>
      expect(runOperation).toHaveBeenCalledWith("set_working_hours", {
        professional_code: "PRO001",
        hours: [
          { day: "monday", starts_at: "09:00", ends_at: "13:00" },
          { day: "monday", starts_at: "15:00", ends_at: "19:00" },
          { day: "friday", starts_at: "09:00", ends_at: "18:00" },
        ],
      }),
    );
  });

  it("refuses hours that cross before saving them", async () => {
    answers({ professionals: [ROSA], business_closed: [] });
    renderView();

    fireEvent.change(await screen.findByLabelText("Lunes, hasta"), { target: { value: "08:00" } });

    expect(screen.getByText("El lunes termina antes de empezar (09:00–08:00).")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Guardar horario" })).toBeDisabled();
  });

  it("lets a team pick whose week, restrict their Services and retire them", async () => {
    answers({ professionals: [ROSA, PEDRO], business_closed: [] });
    renderView();

    fireEvent.click(await screen.findByRole("button", { name: "Pedro" }));
    expect(screen.getByText("La semana de Pedro")).toBeInTheDocument();
    expect(screen.getByText("Del martes, 6 de octubre al miércoles, 7 de octubre")).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Barba"));
    fireEvent.click(screen.getByRole("button", { name: "Guardar servicios" }));
    await waitFor(() =>
      expect(runOperation).toHaveBeenCalledWith("set_professional_services", {
        professional_code: "PRO002",
        service_codes: ["SRV001", "SRV002"],
      }),
    );

    fireEvent.click(screen.getByRole("button", { name: "Pedro ya no trabaja aquí" }));
    await waitFor(() =>
      expect(runOperation).toHaveBeenCalledWith("retire_professional", {
        professional_code: "PRO002",
      }),
    );
  });

  it("closes the Business for a day and lists the Appointments booked on it", async () => {
    answers({ professionals: [ROSA], business_closed: [] });
    runOperation.mockResolvedValue({
      status: "executed",
      result: {
        still_to_happen: [
          {
            appointment_code: "CITA01",
            starts_at: "2026-10-12T10:00:00-04:00",
            service: "Corte",
            professional: "Rosa",
            customer: "Don Carlos",
            whatsapp_number: "59170123456",
          },
        ],
      },
    });
    renderView();

    const closed = (await screen.findByText("Días que cierra el negocio")).closest("div")!;
    fireEvent.change(within(closed).getByLabelText("Desde"), { target: { value: "2026-10-12" } });
    fireEvent.click(within(closed).getByRole("button", { name: "Agregar" }));

    const alert = await screen.findByRole("alert");
    expect(runOperation).toHaveBeenCalledWith("add_days_off", { first_day: "2026-10-12" });
    expect(within(alert).getByText("Queda 1 cita agendada en esos días")).toBeInTheDocument();
    expect(within(alert).getByText(/Corte con Rosa · Don Carlos \(CITA01\)/)).toBeInTheDocument();
  });
});

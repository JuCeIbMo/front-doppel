import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const readApi = vi.fn();
vi.mock("@/lib/operations", () => ({
  readApi: (path: string) => readApi(path),
  runOperation: vi.fn(),
}));

import { ContactAppointments } from "./ContactAppointments";

function answers(booking: boolean) {
  readApi.mockImplementation(async (path: string) => {
    if (path === "/dashboard/business") {
      return { id: "b1", name: "Barbería", selling_enabled: !booking, booking_enabled: booking, calendar_email: null };
    }
    if (path === "/dashboard/pipeline/c1/appointments") {
      return [
        {
          appointment_code: "APT002",
          starts_at: "2026-10-08T10:00:00-04:00",
          status: "booked",
          service: "Corte",
          professional: "Pedro",
          price: "50.00",
          amount_due: "0",
        },
        {
          appointment_code: "APT001",
          starts_at: "2026-09-20T10:00:00-04:00",
          status: "no_show",
          service: "Tinte",
          professional: "Rosa",
          price: "80.00",
          amount_due: "0",
        },
      ];
    }
    throw new Error(path);
  });
}

function renderCard() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <ContactAppointments conversationId="c1" />
    </QueryClientProvider>,
  );
}

describe("ContactAppointments", () => {
  beforeEach(() => {
    readApi.mockReset();
  });

  it("lists the Contact's Appointments, past ones with how they ended", async () => {
    answers(true);
    renderCard();

    expect(await screen.findByText("Corte")).toBeInTheDocument();
    expect(screen.getByText(/jueves, 8 de octubre · 10:00/)).toBeInTheDocument();
    expect(screen.getByText("No vino")).toBeInTheDocument();
  });

  it("stays away from a Business that does not book", async () => {
    answers(false);
    renderCard();

    await vi.waitFor(() => expect(readApi).toHaveBeenCalledWith("/dashboard/business"));
    expect(screen.queryByText("Citas")).not.toBeInTheDocument();
    expect(readApi).not.toHaveBeenCalledWith("/dashboard/pipeline/c1/appointments");
  });
});

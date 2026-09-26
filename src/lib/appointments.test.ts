import { describe, expect, it, vi } from "vitest";

const runOperation = vi.fn();
vi.mock("@/lib/operations", () => ({
  readApi: vi.fn(),
  runOperation: (name: string, payload: unknown) => runOperation(name, payload),
}));

import {
  agendaActions,
  bookingAction,
  businessDay,
  byProfessional,
  clockTime,
  paymentSays,
  shiftDays,
  weekFrom,
  type AgendaAppointment,
  dayRanges,
  draftOf,
  draftProblems,
  hoursProblem,
  newServicePayload,
  serviceChanges,
  type Service,
} from "./appointments";

const CORTE: Service = {
  code: "SRV001",
  name: "Corte",
  duration_minutes: 30,
  price: "50.00",
  payment_ahead: "none",
  deposit: null,
  archived: false,
};

describe("a Service as the Owner types it", () => {
  it("adds a Service with a deposit, and no deposit without one", () => {
    const draft = { name: " Tinte ", minutes: "60", price: "80", paymentAhead: "deposit", deposit: "20" } as const;

    expect(newServicePayload(draft)).toEqual({
      name: "Tinte",
      duration_minutes: 60,
      price: "80.00",
      payment_ahead: "deposit",
      deposit: "20.00",
    });
    expect(newServicePayload({ ...draft, paymentAhead: "full" })).toEqual({
      name: "Tinte",
      duration_minutes: 60,
      price: "80.00",
      payment_ahead: "full",
    });
  });

  it("refuses a deposit above the price and minutes that are not a length", () => {
    const draft = { name: "Tinte", minutes: "0", price: "80", paymentAhead: "deposit", deposit: "90" } as const;

    expect(draftProblems(draft)).toEqual({
      minutes: "Escribe los minutos, como 30.",
      deposit: "La seña no puede ser más que el precio. Pide el precio completo.",
    });
    expect(newServicePayload(draft)).toBeNull();
  });

  it("changes only what changed, and what is paid ahead whole", () => {
    expect(serviceChanges(CORTE, draftOf(CORTE))).toEqual({});
    expect(serviceChanges(CORTE, { ...draftOf(CORTE), price: "55" })).toEqual({ price: "55.00" });
    expect(
      serviceChanges(CORTE, { ...draftOf(CORTE), paymentAhead: "deposit", deposit: "10" }),
    ).toEqual({ payment_ahead: "deposit", deposit: "10.00" });
    expect(
      serviceChanges(
        { ...CORTE, payment_ahead: "deposit", deposit: "10.00" },
        { ...draftOf(CORTE), paymentAhead: "none" },
      ),
    ).toEqual({ payment_ahead: "none" });
  });
});

describe("weekly hours", () => {
  it("accepts a day with a break and refuses blocks that cross or end before they start", () => {
    const morning = { day: "monday", starts_at: "09:00", ends_at: "13:00" } as const;

    expect(hoursProblem([morning, { day: "monday", starts_at: "15:00", ends_at: "19:00" }])).toBeNull();
    expect(hoursProblem([morning, { day: "monday", starts_at: "12:00", ends_at: "19:00" }])).toBe(
      "Dos horarios del lunes se cruzan.",
    );
    expect(hoursProblem([{ day: "friday", starts_at: "18:00", ends_at: "09:00" }])).toBe(
      "El viernes termina antes de empezar (18:00–09:00).",
    );
  });
});

describe("days off", () => {
  it("groups consecutive days, across the end of a month", () => {
    expect(dayRanges(["2026-10-31", "2026-10-06", "2026-11-01", "2026-10-07"])).toEqual([
      { first: "2026-10-06", last: "2026-10-07" },
      { first: "2026-10-31", last: "2026-11-01" },
    ]);
  });
});

describe("the agenda", () => {
  const BOOKED: AgendaAppointment = {
    appointment_code: "APT001",
    starts_at: "2026-10-06T10:00:00-04:00",
    ends_at: "2026-10-06T11:00:00-04:00",
    status: "booked",
    service_code: "SRV001",
    service: "Corte",
    professional_code: "PRO001",
    professional: "Rosa",
    customer: "Carlos",
    whatsapp_number: "+59170123456",
    price: "50.00",
    amount_due: "20.00",
    pay_by: "2026-10-05T20:00:00-04:00",
  };
  const BEFORE = new Date("2026-10-06T13:00:00Z");
  const AFTER = new Date("2026-10-06T15:00:00Z");
  const names = (a: AgendaAppointment, now: Date) => agendaActions(a, now).map((x) => x.operation);

  it("reads its times in the Business's clock, whatever the browser's", () => {
    expect(clockTime(BOOKED.starts_at)).toBe("10:00");
    expect(businessDay(new Date("2026-10-06T02:00:00Z"))).toBe("2026-10-05");
    expect(weekFrom("2026-09-28")).toEqual([
      "2026-09-28",
      "2026-09-29",
      "2026-09-30",
      "2026-10-01",
      "2026-10-02",
      "2026-10-03",
      "2026-10-04",
    ]);
    expect(shiftDays("2026-10-01", -7)).toBe("2026-09-24");
  });

  it("says what is paid ahead", () => {
    const money = (amount: number) => `Bs ${amount}`;
    expect(paymentSays(BOOKED, money)).toMatch(/^Falta pagar Bs 20 hasta el lunes/);
    expect(paymentSays({ ...BOOKED, status: "paid", amount_due: "0" }, money)).toBe("Pagado");
    expect(paymentSays({ ...BOOKED, amount_due: "0", pay_by: null }, money)).toBe(
      "Sin pago por adelantado",
    );
  });

  it("offers a change before it starts and a no-show once it has", () => {
    expect(names(BOOKED, BEFORE)).toEqual(["confirm_appointment_payment", "move", "cancel_appointment"]);
    expect(names({ ...BOOKED, status: "paid", amount_due: "0" }, BEFORE)).toEqual([
      "move",
      "refund_appointment",
    ]);
    expect(names({ ...BOOKED, status: "paid", amount_due: "0" }, AFTER)).toEqual([
      "refund_appointment",
      "mark_no_show",
    ]);
    expect(names({ ...BOOKED, status: "attended", amount_due: "0" }, AFTER)).toEqual(["mark_no_show"]);
    expect(names({ ...BOOKED, status: "no_show", amount_due: "0" }, AFTER)).toEqual([]);
  });

  it("lays a day out by Professional, the team first and anyone else after", () => {
    const pedro = { ...BOOKED, appointment_code: "APT002", professional_code: "PRO002", professional: "Pedro" };
    const team = [
      { professional_code: "PRO001", name: "Rosa" },
      { professional_code: "PRO003", name: "Ana" },
    ];

    expect(
      byProfessional([pedro, BOOKED], team).map((column) => [
        column.name,
        column.appointments.map((a) => a.appointment_code),
      ]),
    ).toEqual([
      ["Rosa", ["APT001"]],
      ["Ana", []],
      ["Pedro", ["APT002"]],
    ]);
  });

  it("says a refusal in Spanish", async () => {
    runOperation.mockResolvedValueOnce({ status: "rejected", code: "TIME_TAKEN", message: "x" });
    await expect(bookingAction("move_appointment", {})).rejects.toThrow(/acaba de ocupar/);
    runOperation.mockResolvedValueOnce({ status: "approval_created", result: { approval_id: "a" } });
    await expect(bookingAction("mark_no_show", {})).resolves.toBe("approval_created");
  });
});

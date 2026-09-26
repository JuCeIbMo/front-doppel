import { describe, expect, it } from "vitest";
import {
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

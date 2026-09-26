import { beforeEach, describe, expect, it, vi } from "vitest";

const runOperation = vi.fn();
vi.mock("@/lib/operations", () => ({
  runOperation: (name: string) => runOperation(name),
  readApi: vi.fn(),
}));

import { chooseKind, turnSwitch } from "./business";

const executed = { status: "executed", result: {} };

describe("chooseKind", () => {
  beforeEach(() => runOperation.mockReset().mockResolvedValue(executed));

  it("turns booking on and then selling off for a Business that books", async () => {
    await chooseKind("booking");

    expect(runOperation.mock.calls).toEqual([["enable_booking"], ["disable_selling"]]);
  });

  it("turns selling on and then booking off for a Business that sells", async () => {
    await chooseKind("selling");

    expect(runOperation.mock.calls).toEqual([["enable_selling"], ["disable_booking"]]);
  });

  it("stops with the reason in Spanish when the other one cannot be turned off", async () => {
    runOperation.mockResolvedValueOnce(executed).mockResolvedValueOnce({
      status: "rejected",
      code: "APPOINTMENTS_AHEAD",
      message: "1 Appointment is still to come.",
      details: { future_appointments: 1 },
    });

    await expect(chooseKind("selling")).rejects.toThrow(
      "Tienes 1 cita por venir. Cancélala antes de dejar de agendar.",
    );
  });
});

describe("turnSwitch", () => {
  beforeEach(() => runOperation.mockReset());

  it("answers nothing when the switch changed", async () => {
    runOperation.mockResolvedValue(executed);

    expect(await turnSwitch("booking", true)).toBeNull();
    expect(runOperation).toHaveBeenCalledWith("enable_booking");
  });

  it("says how many Orders are still open when selling cannot be turned off", async () => {
    runOperation.mockResolvedValue({
      status: "rejected",
      code: "ORDERS_STILL_OPEN",
      message: "2 Orders are still open.",
      details: { open_orders: 2 },
    });

    expect(await turnSwitch("selling", false)).toBe(
      "Tienes 2 pedidos abiertos. Entrégalos, cancélalos o devuélvelos antes de dejar de vender.",
    );
    expect(runOperation).toHaveBeenCalledWith("disable_selling");
  });

  it("says how many Appointments are still to come when booking cannot be turned off", async () => {
    runOperation.mockResolvedValue({
      status: "rejected",
      code: "APPOINTMENTS_AHEAD",
      message: "3 Appointments are still to come.",
      details: { future_appointments: 3 },
    });

    expect(await turnSwitch("booking", false)).toBe(
      "Tienes 3 citas por venir. Cancélalas antes de dejar de agendar.",
    );
  });
});

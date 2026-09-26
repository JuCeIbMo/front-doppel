import { useQuery } from "@tanstack/react-query";
import { readApi, runOperation } from "@/lib/operations";

/** What `GET /dashboard/business` answers. */
export interface Business {
  id: string;
  name: string;
  selling_enabled: boolean;
  booking_enabled: boolean;
  calendar_email: string | null;
}

/** Selling Products and booking Appointments: two switches a Business turns on apart. */
export type BusinessSwitch = "selling" | "booking";

/** What each switch has the assistant do, in the Owner's words. */
export const SWITCH_SAYS: Record<BusinessSwitch, string> = {
  selling: "Tu asistente muestra tu catálogo, toma pedidos y cobra.",
  booking: "Tu asistente ofrece horarios libres y agenda a tus clientes.",
};

/** The signed-in Owner's Business, shared by every screen that asks. */
export function useBusiness() {
  return useQuery({
    queryKey: ["business"],
    queryFn: () => readApi<Business>("/dashboard/business"),
  });
}

export function isOn(business: Business | undefined, kind: BusinessSwitch): boolean {
  return kind === "selling" ? business?.selling_enabled === true : business?.booking_enabled === true;
}

function count(details: Record<string, unknown> | undefined, key: string): number {
  const value = details?.[key];
  return typeof value === "number" ? value : 0;
}

const REFUSALS: Record<string, (details?: Record<string, unknown>) => string> = {
  ORDERS_STILL_OPEN: (details) => {
    const open = count(details, "open_orders");
    return open === 1
      ? "Tienes 1 pedido abierto. Entrégalo, cancélalo o devuélvelo antes de dejar de vender."
      : `Tienes ${open} pedidos abiertos. Entrégalos, cancélalos o devuélvelos antes de dejar de vender.`;
  },
  APPOINTMENTS_AHEAD: (details) => {
    const ahead = count(details, "future_appointments");
    return ahead === 1
      ? "Tienes 1 cita por venir. Cancélala antes de dejar de agendar."
      : `Tienes ${ahead} citas por venir. Cancélalas antes de dejar de agendar.`;
  },
};

/**
 * Turns selling or booking on or off. Answers null once done, or why it was refused
 * in words the Owner can act on: turning one off is refused while it has open things.
 */
export async function turnSwitch(kind: BusinessSwitch, on: boolean): Promise<string | null> {
  const answer = await runOperation(`${on ? "enable" : "disable"}_${kind}`);
  if (answer.status === "executed") return null;
  if (answer.status === "approval_created") {
    return "Quedó pendiente de aprobación. Revísala en Aprobaciones.";
  }
  return REFUSALS[answer.code]?.(answer.details) ?? answer.message;
}

/** Onboarding asks for one kind: that one on first, then the other off. */
export async function chooseKind(kind: BusinessSwitch): Promise<void> {
  const other: BusinessSwitch = kind === "selling" ? "booking" : "selling";
  for (const [switched, on] of [
    [kind, true],
    [other, false],
  ] as const) {
    const refused = await turnSwitch(switched, on);
    if (refused) throw new Error(refused);
  }
}

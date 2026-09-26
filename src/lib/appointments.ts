import { useQuery } from "@tanstack/react-query";
import { readApi, runOperation } from "@/lib/operations";
import { priceInput } from "@/lib/products";

export type PaymentAhead = "none" | "deposit" | "full";

/** One row of `GET /dashboard/services`. */
export interface Service {
  code: string;
  name: string;
  duration_minutes: number;
  price: string;
  payment_ahead: PaymentAhead;
  /** What a Service that asks for a deposit asks ahead; null otherwise. */
  deposit: string | null;
  archived: boolean;
}

export type Weekday =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

/** One stretch of a weekday, as `set_working_hours` takes it. */
export interface WorkingBlock {
  day: Weekday;
  starts_at: string;
  ends_at: string;
}

export interface TeamMember {
  professional_code: string;
  name: string;
  hours: WorkingBlock[];
  /** The Services they perform; null when they perform every one, later ones too. */
  services: { code: string; name: string }[] | null;
  /** Their days off from today on, as YYYY-MM-DD. */
  days_off: string[];
}

/** What `GET /dashboard/team` answers. The first Professional is the Owner. */
export interface Team {
  professionals: TeamMember[];
  business_closed: string[];
}

/** An Appointment still to happen on days just taken away, for the Owner to move or cancel. */
export interface AppointmentToRearrange {
  appointment_code: string;
  starts_at: string;
  service: string;
  professional: string;
  customer: string | null;
  whatsapp_number: string;
}

/** The refusals an Owner can meet on these screens, in words they can act on. */
const REFUSALS: Record<string, string> = {
  SWITCHED_OFF: "Agendar citas está apagado. Préndelo en Ajustes.",
  INVALID_HOURS: "Revisa el horario: hay un tramo que termina antes de empezar o dos que se cruzan.",
  INVALID_DAYS: "Revisa las fechas: el último día va después del primero, y como mucho un año.",
  INVALID_PAYMENT_AHEAD: "Revisa el pago por adelantado: la seña no puede ser más que el precio.",
  NO_SERVICES: "Elige al menos un servicio, o retíralo si ya no atiende.",
  LAST_PROFESSIONAL: "Tu negocio necesita al menos una persona que atienda.",
  SERVICE_NOT_FOUND: "Ese servicio ya no está en oferta. Recarga la página.",
  PROFESSIONAL_NOT_FOUND: "Esa persona ya no está en tu equipo. Recarga la página.",
  SERVICE_ALREADY_ARCHIVED: "Ese servicio ya estaba archivado.",
  SERVICE_NOT_ARCHIVED: "Ese servicio ya estaba en oferta.",
};

/**
 * Runs one booking Operation as the signed-in Owner. Answers the result, or throws an
 * Error the screen can show as is.
 */
export async function runBookingOperation<T>(
  name: string,
  payload: Record<string, unknown>,
): Promise<T> {
  const answer = await runOperation<T>(name, payload);
  if (answer.status === "executed") return answer.result;
  if (answer.status === "approval_created") {
    throw new Error("Quedó pendiente de aprobación. Revísala en Aprobaciones.");
  }
  throw new Error(REFUSALS[answer.code] ?? answer.message);
}

export const SERVICES_KEY = ["services"];
export const TEAM_KEY = ["team"];

export function useServices() {
  return useQuery({
    queryKey: SERVICES_KEY,
    queryFn: () => readApi<Service[]>("/dashboard/services"),
  });
}

export function useTeam() {
  return useQuery({ queryKey: TEAM_KEY, queryFn: () => readApi<Team>("/dashboard/team") });
}

export const WEEKDAYS: { day: Weekday; label: string }[] = [
  { day: "monday", label: "Lunes" },
  { day: "tuesday", label: "Martes" },
  { day: "wednesday", label: "Miércoles" },
  { day: "thursday", label: "Jueves" },
  { day: "friday", label: "Viernes" },
  { day: "saturday", label: "Sábado" },
  { day: "sunday", label: "Domingo" },
];

export const PAYMENT_AHEAD_SAYS: Record<PaymentAhead, string> = {
  none: "Nada por adelantado",
  deposit: "Una seña",
  full: "El precio completo",
};

/** A length in minutes the API accepts, or null: a whole number from 1 to a day. */
export function minutesInput(value: string): number | null {
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const minutes = Number(trimmed);
  return minutes > 0 && minutes <= 1440 ? minutes : null;
}

/** What the Service form holds, as the Owner typed it. */
export interface ServiceDraft {
  name: string;
  minutes: string;
  price: string;
  paymentAhead: PaymentAhead;
  deposit: string;
}

export function draftOf(service?: Service): ServiceDraft {
  return {
    name: service?.name ?? "",
    minutes: service ? String(service.duration_minutes) : "",
    price: service ? Number(service.price).toFixed(2) : "",
    paymentAhead: service?.payment_ahead ?? "none",
    deposit: service?.deposit ? Number(service.deposit).toFixed(2) : "",
  };
}

/** What is wrong with the draft, field by field, in the Owner's words. */
export function draftProblems(draft: ServiceDraft): Partial<Record<keyof ServiceDraft, string>> {
  const problems: Partial<Record<keyof ServiceDraft, string>> = {};
  if (draft.minutes && minutesInput(draft.minutes) === null) {
    problems.minutes = "Escribe los minutos, como 30.";
  }
  const price = priceInput(draft.price);
  if (draft.price && price === null) problems.price = "Escribe un precio, como 50.";
  if (draft.paymentAhead === "deposit") {
    const deposit = priceInput(draft.deposit);
    if (deposit === null || Number(deposit) <= 0) {
      problems.deposit = "Escribe cuánto es la seña, como 20.";
    } else if (deposit !== null && price !== null && Number(deposit) > Number(price)) {
      problems.deposit = "La seña no puede ser más que el precio. Pide el precio completo.";
    }
  }
  return problems;
}

/** The `add_service` payload, or null while the draft is incomplete or wrong. */
export function newServicePayload(draft: ServiceDraft): Record<string, unknown> | null {
  const minutes = minutesInput(draft.minutes);
  const price = priceInput(draft.price);
  const deposit = priceInput(draft.deposit);
  if (!draft.name.trim() || minutes === null || price === null) return null;
  if (Object.keys(draftProblems(draft)).length > 0) return null;
  if (draft.paymentAhead === "deposit" && deposit === null) return null;
  return {
    name: draft.name.trim(),
    duration_minutes: minutes,
    price,
    payment_ahead: draft.paymentAhead,
    ...(draft.paymentAhead === "deposit" ? { deposit } : {}),
  };
}

/**
 * The `change_service` payload with only what changed, `{}` when nothing did, or null
 * while the draft is incomplete or wrong. What is paid ahead goes whole when it changes.
 */
export function serviceChanges(
  service: Service,
  draft: ServiceDraft,
): Record<string, unknown> | null {
  const wanted = newServicePayload(draft);
  if (wanted === null) return null;
  const was = newServicePayload(draftOf(service));
  const changes: Record<string, unknown> = {};
  for (const key of ["name", "duration_minutes", "price"] as const) {
    if (wanted[key] !== was?.[key]) changes[key] = wanted[key];
  }
  if (wanted.payment_ahead !== was?.payment_ahead || wanted.deposit !== was?.deposit) {
    changes.payment_ahead = wanted.payment_ahead;
    if (wanted.deposit !== undefined) changes.deposit = wanted.deposit;
  }
  return changes;
}

/** Why these hours cannot be saved, in the Owner's words, or null when they can. */
export function hoursProblem(blocks: WorkingBlock[]): string | null {
  for (const { day, label } of WEEKDAYS) {
    const ofDay = blocks
      .filter((block) => block.day === day)
      .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
    for (const block of ofDay) {
      if (!block.starts_at || !block.ends_at) return `Completa las horas del ${label.toLowerCase()}.`;
      if (block.ends_at <= block.starts_at) {
        return `El ${label.toLowerCase()} termina antes de empezar (${block.starts_at}–${block.ends_at}).`;
      }
    }
    for (let index = 1; index < ofDay.length; index++) {
      if (ofDay[index].starts_at < ofDay[index - 1].ends_at) {
        return `Dos horarios del ${label.toLowerCase()} se cruzan.`;
      }
    }
  }
  return null;
}

const DAY = new Intl.DateTimeFormat("es-BO", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: "UTC",
});

/** A YYYY-MM-DD day as the Owner reads it, "martes, 6 de octubre". */
export function formatDay(day: string): string {
  return DAY.format(new Date(`${day}T00:00:00Z`));
}

/** Consecutive days grouped, so a week off reads as one line and is removed at once. */
export function dayRanges(days: string[]): { first: string; last: string }[] {
  const ranges: { first: string; last: string }[] = [];
  for (const day of [...days].sort()) {
    const current = ranges.at(-1);
    const next = current && new Date(`${current.last}T00:00:00Z`);
    next?.setUTCDate(next.getUTCDate() + 1);
    if (current && next?.toISOString().slice(0, 10) === day) current.last = day;
    else ranges.push({ first: day, last: day });
  }
  return ranges;
}

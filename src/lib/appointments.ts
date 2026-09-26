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
  APPOINTMENT_NOT_FOUND: "Esa cita ya no está. Recarga la página.",
  APPOINTMENT_ENDED: "Esa cita ya terminó o se canceló. Recarga la página.",
  APPOINTMENT_STARTED: "Esa cita ya empezó: ya no se mueve ni se cancela.",
  APPOINTMENT_NOT_STARTED: "Esa cita todavía no empezó. Si no va a venir, cancélala.",
  APPOINTMENT_PAID: "Esa cita está pagada: para cancelarla, reembólsala.",
  APPOINTMENT_NOT_PAID: "Solo se reembolsa una cita pagada.",
  NOTHING_TO_PAY: "Esa cita no espera ningún pago.",
  TIME_NOT_FREE: "Ese horario ya no está libre. Elige otro.",
  TIME_TAKEN: "Alguien acaba de ocupar ese horario. Elige otro.",
  TOO_SOON: "Ese horario ya pasó. Elige uno que todavía no llegó.",
  TOO_FAR_AHEAD: "Las citas se agendan hasta 30 días adelante. Elige un día antes.",
  SERVICE_NOT_PERFORMED:
    "Esa persona ya no hace este servicio, así que la cita no se mueve con ella. Cancélala y agenda otra.",
  INVALID_EMAIL: "Ese no es un email. Escríbelo como rosa@gmail.com.",
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

/**
 * Runs one booking Operation the Owner may have to approve first. Answers whether it was
 * done or left waiting in Aprobaciones, or throws an Error the screen can show as is.
 */
export async function bookingAction(
  name: string,
  payload: Record<string, unknown>,
): Promise<"executed" | "approval_created"> {
  const answer = await runOperation(name, payload);
  if (answer.status === "rejected") throw new Error(REFUSALS[answer.code] ?? answer.message);
  return answer.status;
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

export type AppointmentStatus =
  | "booked"
  | "paid"
  | "attended"
  | "no_show"
  | "cancelled"
  | "expired"
  | "refunded";

/** One row of `GET /dashboard/agenda`. Moments come in the Business's clock (-04:00). */
export interface AgendaAppointment {
  appointment_code: string;
  starts_at: string;
  ends_at: string;
  status: AppointmentStatus;
  service_code: string;
  service: string;
  professional_code: string;
  professional: string;
  /** Their name, or their WhatsApp number when nobody gave one. */
  customer: string;
  whatsapp_number: string;
  price: string;
  /** Still to be paid ahead; 0 once paid or when nothing is asked ahead. */
  amount_due: string;
  /** Until when it waits for that payment before it expires. */
  pay_by: string | null;
}

/** One row of `GET /dashboard/pipeline/{id}/appointments`: the Contact's, latest first. */
export interface ContactAppointment {
  appointment_code: string;
  starts_at: string;
  status: AppointmentStatus;
  service: string;
  professional: string;
  price: string;
  amount_due: string;
}

export const APPOINTMENT_STATUS: Record<
  AppointmentStatus,
  { label: string; variant: "success" | "warning" | "danger" | "neutral" }
> = {
  booked: { label: "Agendada", variant: "warning" },
  paid: { label: "Pagada", variant: "success" },
  attended: { label: "Atendida", variant: "success" },
  no_show: { label: "No vino", variant: "danger" },
  cancelled: { label: "Cancelada", variant: "neutral" },
  expired: { label: "Vencida sin pago", variant: "neutral" },
  refunded: { label: "Reembolsada", variant: "neutral" },
};

/** The Business's clock: every day and time on these screens is read in it. */
export const BUSINESS_TIME_ZONE = "America/La_Paz";

const BUSINESS_DAY = new Intl.DateTimeFormat("en-CA", { timeZone: BUSINESS_TIME_ZONE });

/** The day it is for the Business, as YYYY-MM-DD. */
export function businessDay(now: Date): string {
  return BUSINESS_DAY.format(now);
}

/** "10:00" from a moment the API gave in the Business's clock. */
export function clockTime(moment: string): string {
  return moment.slice(11, 16);
}

/** "martes, 6 de octubre · 10:00" from a moment in the Business's clock. */
export function dayAndTime(moment: string): string {
  return `${formatDay(moment.slice(0, 10))} · ${clockTime(moment)}`;
}

export function shiftDays(day: string, days: number): string {
  const moved = new Date(`${day}T00:00:00Z`);
  moved.setUTCDate(moved.getUTCDate() + days);
  return moved.toISOString().slice(0, 10);
}

/** Seven days from this one. */
export function weekFrom(first: string): string[] {
  return Array.from({ length: 7 }, (_, index) => shiftDays(first, index));
}

/** What is paid ahead, in the Owner's words. */
export function paymentSays(
  appointment: Pick<AgendaAppointment, "status" | "amount_due" | "pay_by">,
  format: (amount: number) => string,
): string {
  if (appointment.status === "paid") return "Pagado";
  const due = Number(appointment.amount_due);
  if (appointment.status === "booked" && due > 0) {
    return appointment.pay_by
      ? `Falta pagar ${format(due)} hasta el ${dayAndTime(appointment.pay_by)}`
      : `Falta pagar ${format(due)}`;
  }
  return "Sin pago por adelantado";
}

export type AgendaActionName =
  | "confirm_appointment_payment"
  | "move"
  | "cancel_appointment"
  | "refund_appointment"
  | "mark_no_show";

export interface AgendaAction {
  operation: AgendaActionName;
  label: string;
  /** Asked before doing it; moving asks for the new time instead. */
  confirm?: string;
}

/** What the Owner can do with an Appointment now: change it until it starts, then say
 * whether the Contact came. A paid one is refunded rather than cancelled. */
export function agendaActions(appointment: AgendaAppointment, now: Date): AgendaAction[] {
  const started = new Date(appointment.starts_at).getTime() <= now.getTime();
  const actions: AgendaAction[] = [];
  const { status } = appointment;
  if (status === "booked" && Number(appointment.amount_due) > 0) {
    actions.push({
      operation: "confirm_appointment_payment",
      label: "Confirmar pago",
      confirm: "¿Confirmas que te llegó el pago de esta cita?",
    });
  }
  if (!started && (status === "booked" || status === "paid")) {
    actions.push({ operation: "move", label: "Mover" });
  }
  if (!started && status === "booked") {
    actions.push({
      operation: "cancel_appointment",
      label: "Cancelar",
      confirm: "¿Cancelar esta cita? Su horario queda libre y le avisamos al cliente.",
    });
  }
  if (status === "paid") {
    actions.push({
      operation: "refund_appointment",
      label: "Reembolsar",
      confirm: "¿Reembolsar esta cita? Se cancela, su horario queda libre y le avisamos al cliente.",
    });
  }
  if (started && (status === "booked" || status === "paid" || status === "attended")) {
    actions.push({
      operation: "mark_no_show",
      label: "No vino",
      confirm:
        status === "attended"
          ? "¿El cliente no vino? Se anula la venta que hizo esta cita."
          : "¿El cliente no vino a esta cita?",
    });
  }
  return actions;
}

export interface AgendaColumn {
  professional_code: string;
  name: string;
  appointments: AgendaAppointment[];
}

/** A day by Professional: everyone on the team, then anyone retired who still had one. */
export function byProfessional(
  appointments: AgendaAppointment[],
  team: { professional_code: string; name: string }[],
): AgendaColumn[] {
  const columns: AgendaColumn[] = team.map((member) => ({
    professional_code: member.professional_code,
    name: member.name,
    appointments: [],
  }));
  for (const appointment of appointments) {
    let column = columns.find((c) => c.professional_code === appointment.professional_code);
    if (!column) {
      column = {
        professional_code: appointment.professional_code,
        name: appointment.professional,
        appointments: [],
      };
      columns.push(column);
    }
    column.appointments.push(appointment);
  }
  return columns;
}

export const AGENDA_KEY = ["agenda"];
export const TIMES_TO_MOVE_KEY = ["times-to-move"];
export const CONTACT_APPOINTMENTS_KEY = ["contact-appointments"];

/** How far ahead an Appointment can be set, as the backend's BOOKING_HORIZON. */
export const BOOKING_HORIZON_DAYS = 30;

export function useAgenda(firstDay: string, lastDay: string) {
  return useQuery({
    queryKey: [...AGENDA_KEY, firstDay, lastDay],
    queryFn: () =>
      readApi<AgendaAppointment[]>(`/dashboard/agenda?first_day=${firstDay}&last_day=${lastDay}`),
  });
}

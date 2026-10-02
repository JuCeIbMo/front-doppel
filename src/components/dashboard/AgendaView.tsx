"use client";

import { formatPhone } from "@/lib/phone";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  AGENDA_KEY,
  APPOINTMENT_STATUS,
  BOOKING_HORIZON_DAYS,
  CONTACT_APPOINTMENTS_KEY,
  TIMES_TO_MOVE_KEY,
  agendaActions,
  bookingAction,
  businessDay,
  clockTime,
  paymentSays,
  shiftDays,
  useAgenda,
  weekFrom,
  type AgendaAction,
  type AgendaAppointment,
} from "@/lib/appointments";
import { useBusiness } from "@/lib/business";
import { readApi } from "@/lib/operations";
import { useCurrency } from "@/hooks/useCurrency";
import type { Schema } from "@/lib/api-types";

const MONTH = new Intl.DateTimeFormat("es-BO", { month: "long", year: "numeric", timeZone: "UTC" });
const WEEKDAY_LETTERS = ["L", "M", "M", "J", "V", "S", "D"];

/** "octubre de 2026" for the month of a YYYY-MM-DD day. */
function monthName(day: string): string {
  return MONTH.format(new Date(`${day.slice(0, 7)}-01T12:00:00Z`)).replace(" de ", " ");
}

/** The first day of the month `months` away from this day's. */
function monthStart(day: string, months = 0): string {
  const date = new Date(`${day.slice(0, 7)}-01T12:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + months);
  return date.toISOString().slice(0, 10);
}

/** The last day of this day's month. */
function monthEnd(day: string): string {
  return shiftDays(monthStart(day, 1), -1);
}

/** The weeks the month's sheet shows, Monday first, padded with the neighbours' days. */
function monthSheet(day: string): string[] {
  const first = monthStart(day);
  const offset = (new Date(`${first}T12:00:00Z`).getUTCDay() + 6) % 7;
  const start = shiftDays(first, -offset);
  const last = monthEnd(day);
  const days: string[] = [];
  for (let each = start; each <= last || days.length % 7 !== 0; each = shiftDays(each, 1)) {
    days.push(each);
  }
  return days;
}

/** A day as the notebook writes it: "Lunes, 28 de septiembre". */
function writtenDay(day: string): string {
  const text = new Intl.DateTimeFormat("es-BO", {
    timeZone: "UTC",
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(`${day}T12:00:00Z`));
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** "Hoy, martes 6 de octubre", "Mañana, …" or the written day. */
function listDay(day: string, today: string): string {
  const written = writtenDay(day);
  if (day === today) return `Hoy, ${written.replace(",", "").toLowerCase()}`;
  if (day === shiftDays(today, 1)) return `Mañana, ${written.replace(",", "").toLowerCase()}`;
  return written;
}

/** Still waiting for money ahead. */
function owes(appointment: AgendaAppointment): boolean {
  return appointment.status === "booked" && Number(appointment.amount_due) > 0;
}

const CANCELLED: AgendaAppointment["status"][] = ["cancelled", "expired", "refunded"];

/** The strip beside an Appointment, colored by how it stands. */
function stripColor(appointment: AgendaAppointment): string {
  if (CANCELLED.includes(appointment.status)) return "border-paper-rule";
  if (appointment.status === "no_show") return "border-waiting";
  if (appointment.status === "paid" || appointment.status === "attended") return "border-settled";
  return owes(appointment) ? "border-money" : "border-steps";
}

/**
 * The month on one sheet, each day marked with its Appointments, and below it the
 * Appointments of the chosen day and the six after it, one list by the hour.
 */
export function AgendaView() {
  const today = businessDay(new Date());
  const [month, setMonth] = useState(monthStart(today));
  const [day, setDay] = useState(today);
  const sheet = monthSheet(month);
  const ofMonth = useAgenda(month, monthEnd(month));
  const listed = weekFrom(day);
  const agenda = useAgenda(day, listed[6]);

  const marks = new Map<string, { count: number; owing: boolean }>();
  for (const appointment of ofMonth.data ?? []) {
    if (CANCELLED.includes(appointment.status)) continue;
    const key = appointment.starts_at.slice(0, 10);
    const mark = marks.get(key) ?? { count: 0, owing: false };
    marks.set(key, { count: mark.count + 1, owing: mark.owing || owes(appointment) });
  }

  const moveMonth = (months: number) => {
    const first = monthStart(month, months);
    setMonth(first);
    setDay(first === monthStart(today) ? today : first);
  };
  const goToday = () => {
    setMonth(monthStart(today));
    setDay(today);
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1>Agenda</h1>
        <p className="mt-0.5 text-sm text-text-secondary">
          Toca un día para ver sus citas y las que siguen. Muévelas, cancélalas o marca quién no vino.
        </p>
      </div>

      <GoogleNote />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[22rem_minmax(0,1fr)] lg:items-start">
        <section aria-label="Calendario" className="lg:sticky lg:top-4">
          <div className="flex items-center gap-1.5">
            <h2 className="flex-1 text-xl capitalize">{monthName(month)}</h2>
            <button
              type="button"
              onClick={goToday}
              className="min-h-9 border-2 border-ink px-3 text-sm font-bold hover:bg-ink hover:text-paper"
            >
              Hoy
            </button>
            <button
              type="button"
              aria-label="Mes anterior"
              onClick={() => moveMonth(-1)}
              className="flex h-9 w-9 items-center justify-center border-2 border-ink hover:bg-ink hover:text-paper"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              aria-label="Mes siguiente"
              onClick={() => moveMonth(1)}
              className="flex h-9 w-9 items-center justify-center border-2 border-ink hover:bg-ink hover:text-paper"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          <div className="mt-3 grid grid-cols-7 gap-0.5">
            {WEEKDAY_LETTERS.map((letter, index) => (
              <span
                key={index}
                aria-hidden
                className="py-1 text-center text-xs font-extrabold text-ink-muted"
              >
                {letter}
              </span>
            ))}
            {sheet.map((each) => {
              const inMonth = each.slice(0, 7) === month.slice(0, 7);
              const mark = inMonth ? marks.get(each) : undefined;
              const chosen = each === day;
              const count = mark?.count ?? 0;
              return (
                <button
                  key={each}
                  type="button"
                  onClick={() => {
                    setDay(each);
                    if (!inMonth) setMonth(monthStart(each));
                  }}
                  aria-pressed={chosen}
                  aria-label={`${writtenDay(each)}: ${
                    count === 0 ? "sin citas" : count === 1 ? "1 cita" : `${count} citas`
                  }${mark?.owing ? ", falta pagar" : ""}`}
                  className={`flex h-12 flex-col items-center pt-1 text-sm font-semibold transition-colors hover:bg-ink/[0.06] ${
                    inMonth ? "" : "text-ink-muted/50"
                  }`}
                >
                  <span
                    className={`flex h-7 w-7 items-center justify-center tabular-nums ${
                      chosen ? "bg-ink text-paper" : ""
                    } ${each === today ? "outline-2 outline-offset-2 outline-waiting" : ""}`}
                  >
                    {Number(each.slice(8))}
                  </span>
                  {count > 0 && (
                    <span aria-hidden className="mt-1 flex gap-0.5">
                      {Array.from({ length: Math.min(count, 4) }, (_, index) => (
                        <i
                          key={index}
                          className={`h-1.5 w-1.5 ${index === 0 && mark?.owing ? "bg-money" : "bg-steps"}`}
                        />
                      ))}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <p className="mt-2 flex gap-4 text-xs text-ink-muted">
            <span className="flex items-center gap-1.5">
              <i aria-hidden className="h-2 w-2 bg-steps" />
              cita
            </span>
            <span className="flex items-center gap-1.5">
              <i aria-hidden className="h-2 w-2 bg-money" />
              falta pagar
            </span>
          </p>
        </section>

        <section aria-label="Citas" className="min-w-0 max-w-3xl">
          {agenda.isLoading ? (
            <div className="h-32 animate-pulse bg-bg-elevated" />
          ) : agenda.error ? (
            <p className="text-sm text-danger">No se pudo cargar la agenda. Recarga la página.</p>
          ) : (
            listed.map((each) => (
              <DayList
                key={each}
                day={each}
                today={today}
                appointments={(agenda.data ?? []).filter((a) => a.starts_at.startsWith(each))}
              />
            ))
          )}
        </section>
      </div>
    </div>
  );
}

/** One day of the list: its title, what it adds up to, and its Appointments by the hour. */
function DayList({
  day,
  today,
  appointments,
}: {
  day: string;
  today: string;
  appointments: AgendaAppointment[];
}) {
  const { format } = useCurrency();
  const holding = appointments.filter((a) => !CANCELLED.includes(a.status));
  const owing = holding.filter(owes);
  const now = new Date().getTime();
  const nextIndex =
    day === today ? appointments.findIndex((a) => new Date(a.starts_at).getTime() > now) : -1;

  return (
    <section aria-label={writtenDay(day)} className="mb-6">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 border-b-2 border-ink pb-1.5">
        <h2 className="font-hand text-xl font-bold text-steps">{listDay(day, today)}</h2>
        <p className="text-xs font-bold text-ink-muted">
          {holding.length === 0
            ? "Sin citas"
            : holding.length === 1
              ? "1 cita"
              : `${holding.length} citas`}
          {owing.length > 0 &&
            ` · falta pagar ${format(owing.reduce((sum, a) => sum + Number(a.amount_due), 0))}`}
        </p>
      </div>
      {appointments.map((appointment, index) => (
        <div key={appointment.appointment_code}>
          {index === nextIndex && <NowLine />}
          <AppointmentRow appointment={appointment} />
        </div>
      ))}
      {day === today && appointments.length > 0 && nextIndex === -1 && <NowLine />}
    </section>
  );
}

/** Where the day stands right now. */
function NowLine() {
  return (
    <div aria-hidden className="flex items-center gap-2">
      <span className="w-14 text-right text-[11px] font-black text-waiting">ahora</span>
      <span className="h-0.5 flex-1 bg-waiting" />
    </div>
  );
}

/** The calendar Doppel shares in Google is a copy to look at, not a second place to edit. */
function GoogleNote() {
  const { data: business } = useBusiness();
  return (
    <p className="max-w-2xl text-sm text-text-secondary">
      {business?.calendar_email
        ? `Tus citas también aparecen en el Google Calendar de ${business.calendar_email}. `
        : "Tus citas también pueden aparecer en tu Google Calendar. "}
      Es solo para mirar: lo que cambies allí no cambia tus citas. Cambia el email en{" "}
      <Link href="/dashboard/settings" className="font-bold underline underline-offset-4">
        Cuenta
      </Link>
      .
    </p>
  );
}

function AppointmentRow({ appointment }: { appointment: AgendaAppointment }) {
  const queryClient = useQueryClient();
  const { format } = useCurrency();
  const [moving, setMoving] = useState(false);
  const status = APPOINTMENT_STATUS[appointment.status];
  const action = useMutation({
    mutationFn: ({ operation, payload }: { operation: string; payload: Record<string, unknown> }) =>
      bookingAction(operation, { appointment_code: appointment.appointment_code, ...payload }),
    onSuccess: async (done) => {
      setMoving(false);
      await queryClient.invalidateQueries({ queryKey: AGENDA_KEY });
      await queryClient.invalidateQueries({ queryKey: TIMES_TO_MOVE_KEY });
      await queryClient.invalidateQueries({ queryKey: CONTACT_APPOINTMENTS_KEY });
      if (done === "approval_created") {
        toast.info("Quedó pendiente de aprobación. Revísala en Aprobaciones.");
      } else {
        toast.success("Listo.");
      }
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "No se pudo completar la acción."),
  });

  const run = (option: AgendaAction) => {
    if (option.operation === "move") {
      setMoving(!moving);
      return;
    }
    if (option.confirm && !confirm(option.confirm)) return;
    action.mutate({ operation: option.operation, payload: {} });
  };

  const cancelled = CANCELLED.includes(appointment.status);
  const options = agendaActions(appointment, new Date());
  return (
    <article className="flex gap-3 border-b border-paper-rule py-3">
      <p className="w-14 shrink-0 text-right">
        <span className="block font-display text-xl font-black leading-none [font-stretch:80%] tabular-nums">
          {clockTime(appointment.starts_at)}
        </span>
        <span className="text-xs text-ink-muted tabular-nums">a {clockTime(appointment.ends_at)}</span>
      </p>
      <div className={`min-w-0 flex-1 border-l-[5px] pl-3 ${stripColor(appointment)} ${cancelled ? "opacity-60" : ""}`}>
        <p className={`text-base font-extrabold ${cancelled ? "line-through" : ""}`}>{appointment.service}</p>
        <p className="text-sm">
          {appointment.customer}
          {appointment.customer !== appointment.whatsapp_number && (
            <span className="text-ink-muted"> · {formatPhone(appointment.whatsapp_number)}</span>
          )}
        </p>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <span className="bg-ink/[0.07] px-2 py-0.5 text-xs font-bold">con {appointment.professional}</span>
          <Badge variant={status.variant}>{status.label}</Badge>
          <span className="ml-auto text-sm font-bold tabular-nums">{format(Number(appointment.price))}</span>
        </div>
        {owes(appointment) && (
          <p className="mt-1 text-xs text-ink-muted">{paymentSays(appointment, format)}</p>
        )}
        {options.length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-2">
            {options.map((option) => (
              <Button
                key={option.operation}
                size="sm"
                variant={option.operation === "confirm_appointment_payment" ? "primary" : "secondary"}
                disabled={action.isPending}
                onClick={() => run(option)}
              >
                {option.label}
              </Button>
            ))}
          </div>
        )}
        {moving && (
          <MoveTo
            appointment={appointment}
            disabled={action.isPending}
            onPick={(startsAt) =>
              action.mutate({ operation: "move_appointment", payload: { starts_at: startsAt } })
            }
          />
        )}
      </div>
    </article>
  );
}

/** The free times of a day this Appointment can move to, with its Professional and length. */
function MoveTo({
  appointment,
  disabled,
  onPick,
}: {
  appointment: AgendaAppointment;
  disabled: boolean;
  onPick: (startsAt: string) => void;
}) {
  const [day, setDay] = useState(appointment.starts_at.slice(0, 10));
  const times = useQuery({
    queryKey: [...TIMES_TO_MOVE_KEY, appointment.appointment_code, day],
    queryFn: () =>
      readApi<Schema<"FreeTime">[]>(
        `/dashboard/agenda/${appointment.appointment_code}/free-times?day=${day}`,
      ),
    enabled: Boolean(day),
  });

  return (
    <div className="mt-3 border-t border-border pt-3">
      <label className="block text-xs text-text-secondary">
        Nuevo día
        <input
          type="date"
          value={day}
          min={businessDay(new Date())}
          max={shiftDays(businessDay(new Date()), BOOKING_HORIZON_DAYS)}
          onChange={(event) => setDay(event.target.value)}
          className="mt-1 block border border-border bg-bg-elevated px-3 py-1.5 text-sm text-text-primary"
        />
      </label>
      {times.isLoading ? (
        <div className="mt-2 h-8 animate-pulse bg-bg-elevated" />
      ) : times.error ? (
        <p className="mt-2 text-sm text-danger">No se pudieron leer los horarios libres.</p>
      ) : (times.data ?? []).length === 0 ? (
        <p className="mt-2 text-sm text-text-secondary">
          {appointment.professional} no tiene horarios libres ese día.
        </p>
      ) : (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {(times.data ?? []).map((free) => (
            <Button
              key={free.starts_at}
              size="sm"
              variant="secondary"
              disabled={disabled}
              onClick={() => onPick(free.starts_at)}
            >
              {clockTime(free.starts_at)}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}

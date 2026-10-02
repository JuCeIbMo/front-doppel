"use client";

import { formatPhone } from "@/lib/phone";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, MessageCircle } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import {
  appointmentStatus,
  businessDay,
  clockTime,
  onAgenda,
  shiftDays,
  useAgenda,
  weekFrom,
  type AgendaAppointment,
} from "@/lib/appointments";
import { useBusiness } from "@/lib/business";
import { useCurrency } from "@/hooks/useCurrency";
import { stripColor } from "@/components/dashboard/AppointmentTask";

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

/**
 * The month on one sheet, each day marked with its Appointments, and below it the
 * Appointments of the chosen day and the six after it, one list by the hour. Only what is
 * really going to happen: one still owing its payment, or called off, is not here but in
 * Pedidos y citas, where the Owner works on it. Nothing to press: it is the list to attend.
 */
export function AgendaView({
  initialDay,
  highlight,
}: {
  /** The day to open on, YYYY-MM-DD; today when missing. */
  initialDay?: string;
  /** The code of an Appointment to point at, coming from elsewhere. */
  highlight?: string;
} = {}) {
  const today = businessDay(new Date());
  const opening = initialDay && /^\d{4}-\d{2}-\d{2}$/.test(initialDay) ? initialDay : today;
  const [month, setMonth] = useState(monthStart(opening));
  const [day, setDay] = useState(opening);
  const sheet = monthSheet(month);
  const ofMonth = useAgenda(month, monthEnd(month));
  const listed = weekFrom(day);
  const agenda = useAgenda(day, listed[6]);

  const marks = new Map<string, number>();
  for (const appointment of (ofMonth.data ?? []).filter(onAgenda)) {
    const key = appointment.starts_at.slice(0, 10);
    marks.set(key, (marks.get(key) ?? 0) + 1);
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
          Las citas confirmadas, para atender. Las que esperan pago, y mover o cancelar una, están en{" "}
          <Link href="/dashboard/orders" className="font-bold underline underline-offset-4">
            Pedidos y citas
          </Link>
          .
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
              const count = inMonth ? (marks.get(each) ?? 0) : 0;
              const chosen = each === day;
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
                  }`}
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
                        <i key={index} className="h-1.5 w-1.5 bg-steps" />
                      ))}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

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
                highlight={highlight}
                appointments={(agenda.data ?? []).filter(
                  (a) => onAgenda(a) && a.starts_at.startsWith(each),
                )}
              />
            ))
          )}
        </section>
      </div>
    </div>
  );
}

/** One day of the list: its title, how many, and its Appointments by the hour. */
function DayList({
  day,
  today,
  highlight,
  appointments,
}: {
  day: string;
  today: string;
  highlight?: string;
  appointments: AgendaAppointment[];
}) {
  const now = new Date().getTime();
  const nextIndex =
    day === today ? appointments.findIndex((a) => new Date(a.starts_at).getTime() > now) : -1;

  return (
    <section aria-label={writtenDay(day)} className="mb-6">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 border-b-2 border-ink pb-1.5">
        <h2 className="font-hand text-xl font-bold text-steps">{listDay(day, today)}</h2>
        <p className="text-xs font-bold text-ink-muted">
          {appointments.length === 0
            ? "Sin citas"
            : appointments.length === 1
              ? "1 cita"
              : `${appointments.length} citas`}
        </p>
      </div>
      {appointments.map((appointment, index) => (
        <div key={appointment.appointment_code}>
          {index === nextIndex && <NowLine />}
          <AgendaRow
            appointment={appointment}
            highlighted={appointment.appointment_code === highlight}
          />
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

/** One Appointment to attend: when, what, who (a tap away from their chat) and how it stands. */
function AgendaRow({
  appointment,
  highlighted = false,
}: {
  appointment: AgendaAppointment;
  highlighted?: boolean;
}) {
  const { format } = useCurrency();
  const row = useRef<HTMLElement>(null);
  useEffect(() => {
    if (highlighted) row.current?.scrollIntoView?.({ block: "center" });
  }, [highlighted]);
  const status = appointmentStatus(appointment);

  return (
    <article
      ref={row}
      aria-current={highlighted || undefined}
      className={`flex gap-3 border-b border-paper-rule py-3 ${highlighted ? "bg-steps/[0.08] outline-2 outline-steps" : ""}`}
    >
      <p className="w-14 shrink-0 text-right">
        <span className="block font-display text-xl font-black leading-none [font-stretch:80%] tabular-nums">
          {clockTime(appointment.starts_at)}
        </span>
        <span className="text-xs text-ink-muted tabular-nums">a {clockTime(appointment.ends_at)}</span>
      </p>
      <div className={`min-w-0 flex-1 border-l-[5px] pl-3 ${stripColor(appointment)}`}>
        <p className="text-base font-extrabold">{appointment.service}</p>
        <p className="flex flex-wrap items-center gap-x-2 text-sm">
          {appointment.customer !== appointment.whatsapp_number && (
            <span className="font-semibold">{appointment.customer}</span>
          )}
          <Link
            href={`/dashboard/automation?numero=${encodeURIComponent(appointment.whatsapp_number)}`}
            className="inline-flex min-h-8 items-center gap-1 font-bold text-steps underline underline-offset-4"
          >
            <MessageCircle size={14} aria-hidden />
            {formatPhone(appointment.whatsapp_number)}
            <span className="sr-only">: abrir su conversación</span>
          </Link>
        </p>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <Badge variant={status.variant}>{status.label}</Badge>
          <span className="ml-auto text-sm font-bold tabular-nums">{format(Number(appointment.price))}</span>
        </div>
      </div>
    </article>
  );
}

"use client";

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
  byProfessional,
  clockTime,
  formatDay,
  paymentSays,
  shiftDays,
  useAgenda,
  useTeam,
  weekFrom,
  type AgendaAction,
  type AgendaAppointment,
} from "@/lib/appointments";
import { useBusiness } from "@/lib/business";
import { readApi } from "@/lib/operations";
import { useCurrency } from "@/hooks/useCurrency";

const WEEKDAY = new Intl.DateTimeFormat("es-BO", { weekday: "short", timeZone: "UTC" });

/** "jue 8" for a YYYY-MM-DD day. */
function shortDay(day: string): string {
  return `${WEEKDAY.format(new Date(`${day}T00:00:00Z`)).replace(/\./g, "")} ${Number(day.slice(8))}`;
}

/** The Appointments of a week, one day at a time, by Professional. */
export function AgendaView() {
  const today = businessDay(new Date());
  const [firstDay, setFirstDay] = useState(today);
  const [day, setDay] = useState(today);
  const days = weekFrom(firstDay);
  const agenda = useAgenda(firstDay, days[6]);
  const team = useTeam();


  const appointments = agenda.data ?? [];
  const ofDay = appointments.filter((appointment) => appointment.starts_at.startsWith(day));
  const columns = byProfessional(ofDay, team.data?.professionals ?? []);

  const moveWeek = (days: number) => {
    const first = shiftDays(firstDay, days);
    setFirstDay(first);
    setDay(first);
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Agenda</h1>
        <p className="mt-0.5 text-sm text-text-secondary">
          Las citas de cada día, por persona. Muévelas, cancélalas o marca quién no vino.
        </p>
      </div>

      <GoogleNote />

      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label="Semana anterior"
          onClick={() => moveWeek(-7)}
          className="rounded-lg p-2 text-text-secondary hover:bg-bg-elevated hover:text-text-primary"
        >
          <ChevronLeft size={16} />
        </button>
        <div className="flex flex-1 gap-1.5 overflow-x-auto">
          {days.map((each) => {
            const count = appointments.filter((a) => a.starts_at.startsWith(each)).length;
            return (
              <button
                key={each}
                type="button"
                onClick={() => setDay(each)}
                className={`min-w-16 flex-1 rounded-lg px-2 py-2 text-center text-sm transition-colors ${
                  each === day
                    ? "bg-accent-dim text-text-primary"
                    : "text-text-secondary hover:bg-bg-elevated hover:text-text-primary"
                }`}
              >
                <span className="block capitalize">{shortDay(each)}</span>
                <span className="block text-xs text-text-muted">
                  {count === 0 ? "—" : count === 1 ? "1 cita" : `${count} citas`}
                </span>
              </button>
            );
          })}
        </div>
        <button
          type="button"
          aria-label="Semana siguiente"
          onClick={() => moveWeek(7)}
          className="rounded-lg p-2 text-text-secondary hover:bg-bg-elevated hover:text-text-primary"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      <p className="text-sm font-medium capitalize">{formatDay(day)}</p>

      {agenda.isLoading || team.isLoading ? (
        <div className="h-32 animate-pulse rounded-2xl bg-bg-elevated" />
      ) : agenda.error || team.error ? (
        <p className="text-sm text-danger">No se pudo cargar la agenda. Recarga la página.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {columns.map((column) => (
            <section
              key={column.professional_code}
              aria-label={column.name}
              className="flex flex-col gap-3"
            >
              <h2 className="text-sm font-semibold">{column.name}</h2>
              {column.appointments.length === 0 ? (
                <p className="rounded-2xl border border-border px-4 py-3 text-sm text-text-muted">
                  Sin citas
                </p>
              ) : (
                column.appointments.map((appointment) => (
                  <AppointmentCard key={appointment.appointment_code} appointment={appointment} />
                ))
              )}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

/** The calendar Doppel shares in Google is a copy to look at, not a second place to edit. */
function GoogleNote() {
  const { data: business } = useBusiness();
  return (
    <p className="rounded-2xl border border-border bg-bg-elevated/40 px-4 py-3 text-sm text-text-secondary">
      {business?.calendar_email
        ? `Tus citas también aparecen en el Google Calendar de ${business.calendar_email}. `
        : "Tus citas también pueden aparecer en tu Google Calendar. "}
      Es solo para mirar: lo que cambies allí no cambia tus citas. Cambia el email en{" "}
      <Link href="/dashboard/settings" className="text-accent hover:underline">
        Ajustes
      </Link>
      .
    </p>
  );
}

function AppointmentCard({ appointment }: { appointment: AgendaAppointment }) {
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

  return (
    <article className="rounded-2xl border border-border bg-bg-secondary p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium">
            {clockTime(appointment.starts_at)}–{clockTime(appointment.ends_at)} · {appointment.service}
          </p>
          <p className="mt-0.5 text-sm text-text-secondary">
            {appointment.customer}
            {appointment.customer !== appointment.whatsapp_number &&
              ` · ${appointment.whatsapp_number}`}
          </p>
        </div>
        <Badge variant={status.variant}>{status.label}</Badge>
      </div>
      <p className="mt-2 text-xs text-text-muted">
        {format(Number(appointment.price))} · {paymentSays(appointment, format)}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {agendaActions(appointment, new Date()).map((option) => (
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
      {moving && (
        <MoveTo
          appointment={appointment}
          disabled={action.isPending}
          onPick={(startsAt) =>
            action.mutate({ operation: "move_appointment", payload: { starts_at: startsAt } })
          }
        />
      )}
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
      readApi<{ starts_at: string }[]>(
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
          className="mt-1 block rounded-lg border border-border bg-bg-elevated px-3 py-1.5 text-sm text-text-primary"
        />
      </label>
      {times.isLoading ? (
        <div className="mt-2 h-8 animate-pulse rounded-lg bg-bg-elevated" />
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

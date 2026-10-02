"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { MessageCircle } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  AGENDA_KEY,
  BOOKING_HORIZON_DAYS,
  CONTACT_APPOINTMENTS_KEY,
  TIMES_TO_MOVE_KEY,
  agendaActions,
  appointmentStatus,
  awaitingPayment,
  bookingAction,
  businessDay,
  clockTime,
  paymentSays,
  shiftDays,
  type AgendaAction,
  type AgendaAppointment,
} from "@/lib/appointments";
import { readApi } from "@/lib/operations";
import { formatPhone } from "@/lib/phone";
import { useCurrency } from "@/hooks/useCurrency";
import type { Schema } from "@/lib/api-types";

const SHORT_DAY = new Intl.DateTimeFormat("es-BO", {
  timeZone: "UTC",
  weekday: "short",
  day: "numeric",
  month: "short",
});

/** "mar 6 oct" for a moment in the Business's clock. */
function shortDay(moment: string): string {
  return SHORT_DAY.format(new Date(`${moment.slice(0, 10)}T12:00:00Z`)).replace(/\./g, "").replace(",", "");
}

const CANCELLED: AgendaAppointment["status"][] = ["cancelled", "expired", "refunded"];

/** The strip beside an Appointment, colored by how it stands. */
export function stripColor(appointment: AgendaAppointment): string {
  if (CANCELLED.includes(appointment.status)) return "border-paper-rule";
  if (appointment.status === "no_show") return "border-waiting";
  if (appointment.status === "paid" || appointment.status === "attended") return "border-settled";
  return awaitingPayment(appointment) ? "border-money" : "border-steps";
}

/**
 * An Appointment to work on: what it is, who booked it, how it stands, and what the Owner
 * can do with it now (confirm the payment, move it, cancel it, say they did not come).
 */
export function AppointmentTask({
  appointment,
  highlighted = false,
}: {
  appointment: AgendaAppointment;
  highlighted?: boolean;
}) {
  const queryClient = useQueryClient();
  const row = useRef<HTMLElement>(null);
  useEffect(() => {
    if (highlighted) row.current?.scrollIntoView?.({ block: "center" });
  }, [highlighted]);
  const { format } = useCurrency();
  const [moving, setMoving] = useState(false);
  const status = appointmentStatus(appointment);
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
    <article
      ref={row}
      aria-current={highlighted || undefined}
      className={`flex gap-3 border-b border-paper-rule py-3 ${highlighted ? "bg-steps/[0.08] outline-2 outline-steps" : ""}`}
    >
      <p className="w-16 shrink-0 text-right">
        <span className="block text-xs font-bold capitalize text-ink-muted">{shortDay(appointment.starts_at)}</span>
        <span className="block font-display text-xl font-black leading-none [font-stretch:80%] tabular-nums">
          {clockTime(appointment.starts_at)}
        </span>
      </p>
      <div className={`min-w-0 flex-1 border-l-[5px] pl-3 ${stripColor(appointment)} ${cancelled ? "opacity-60" : ""}`}>
        <p className={`text-base font-extrabold ${cancelled ? "line-through" : ""}`}>{appointment.service}</p>
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
        {awaitingPayment(appointment) && (
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
          No hay horarios libres ese día.
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

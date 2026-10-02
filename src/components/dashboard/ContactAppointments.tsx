"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import {
  CONTACT_APPOINTMENTS_KEY,
  appointmentStatus,
  awaitingPayment,
  dayAndTime,
  onAgenda,
  type ContactAppointment,
} from "@/lib/appointments";
import { isOn, useBusiness } from "@/lib/business";
import { readApi } from "@/lib/operations";

/** Where an Appointment is: on the Agenda once it is confirmed, else in Citas, where it is worked on. */
function whereToSee(appointment: ContactAppointment): { href: string; label: string } {
  const code = encodeURIComponent(appointment.appointment_code);
  if (onAgenda(appointment)) {
    return { href: `/dashboard/agenda?dia=${appointment.starts_at.slice(0, 10)}&cita=${code}`, label: "verla en la agenda" };
  }
  const pile = awaitingPayment(appointment) ? "placed" : "done";
  return { href: `/dashboard/orders?estado=${pile}&cita=${code}`, label: "verla en citas" };
}

/** The Appointments of the Contact a Conversation is with, beside it while booking is on. */
export function ContactAppointments({ conversationId }: { conversationId: string }) {
  const { data: business } = useBusiness();
  const booking = isOn(business, "booking");
  const appointments = useQuery({
    queryKey: [...CONTACT_APPOINTMENTS_KEY, conversationId],
    queryFn: () =>
      readApi<ContactAppointment[]>(`/dashboard/pipeline/${conversationId}/appointments`),
    enabled: booking,
  });
  const list = appointments.data ?? [];
  // Without booking, or with no Appointments, the thread has nothing to add here.
  if (!booking || appointments.isLoading || (list.length === 0 && !appointments.error)) return null;

  return (
    <details className="border-t border-paper-rule pt-2">
      <summary className="flex min-h-11 cursor-pointer items-center justify-between gap-3 text-sm font-bold">
        <span>Citas de este cliente ({list.length})</span>
        <Link href="/dashboard/agenda" className="font-bold underline underline-offset-4">
          Ver agenda
        </Link>
      </summary>
      {appointments.error ? (
        <p className="text-sm text-danger">No se pudieron cargar sus citas.</p>
      ) : (
        <ul className="flex flex-col">
          {list.map((appointment) => {
            const status = appointmentStatus(appointment);
            const where = whereToSee(appointment);
            return (
              <li key={appointment.appointment_code} className="border-b border-paper-rule">
                <Link
                  href={where.href}
                  className="flex items-start justify-between gap-3 py-2 hover:bg-ink/[0.04]"
                >
                  <div>
                    <p className="text-[15px] font-semibold">{appointment.service}</p>
                    <p className="text-sm text-ink-muted">
                      <span className="capitalize">{dayAndTime(appointment.starts_at)}</span> ·{" "}
                      <span className="underline underline-offset-4">{where.label}</span>
                    </p>
                  </div>
                  <Badge variant={status.variant}>{status.label}</Badge>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </details>
  );
}

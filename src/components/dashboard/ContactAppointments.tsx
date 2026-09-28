"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import {
  APPOINTMENT_STATUS,
  CONTACT_APPOINTMENTS_KEY,
  dayAndTime,
  type ContactAppointment,
} from "@/lib/appointments";
import { isOn, useBusiness } from "@/lib/business";
import { readApi } from "@/lib/operations";

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
            const status = APPOINTMENT_STATUS[appointment.status];
            return (
              <li
                key={appointment.appointment_code}
                className="flex items-start justify-between gap-3 border-b border-paper-rule py-2"
              >
                <div>
                  <p className="text-[15px] font-semibold">{appointment.service}</p>
                  <p className="text-sm text-ink-muted">
                    <span className="capitalize">{dayAndTime(appointment.starts_at)}</span> · con{" "}
                    {appointment.professional}
                  </p>
                </div>
                <Badge variant={status.variant}>{status.label}</Badge>
              </li>
            );
          })}
        </ul>
      )}
    </details>
  );
}

"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Card, CardHeader } from "@/components/ui/Card";
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
  if (!booking) return null;

  return (
    <Card>
      <CardHeader
        title="Citas"
        action={
          <Link href="/dashboard/agenda" className="text-xs text-accent hover:underline">
            Ver agenda
          </Link>
        }
      />
      {appointments.isLoading ? (
        <div className="h-12 animate-pulse rounded-lg bg-bg-elevated" />
      ) : appointments.error ? (
        <p className="text-sm text-danger">No se pudieron cargar sus citas.</p>
      ) : (appointments.data ?? []).length === 0 ? (
        <p className="text-sm text-text-secondary">Todavía no tiene citas.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {(appointments.data ?? []).map((appointment) => {
            const status = APPOINTMENT_STATUS[appointment.status];
            return (
              <li key={appointment.appointment_code} className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">{appointment.service}</p>
                  <p className="text-xs text-text-secondary">
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
    </Card>
  );
}

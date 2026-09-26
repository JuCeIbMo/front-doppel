"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ApiError } from "@/lib/api-client";
import { formatDateTime } from "@/lib/dates";
import {
  TEAM_KEY,
  WEEKDAYS,
  dayRanges,
  formatDay,
  hoursProblem,
  runBookingOperation,
  useServices,
  useTeam,
  type AppointmentToRearrange,
  type Service,
  type TeamMember,
  type Weekday,
  type WorkingBlock,
} from "@/lib/appointments";
import { signOut } from "@/lib/supabase";

/**
 * When the Business takes Appointments. A Business of one sees only its own week; a team
 * picks whose week, and each one's Services and days off.
 */
export function HoursView() {
  const router = useRouter();
  const team = useTeam();
  const services = useServices();
  const [chosen, setChosen] = useState<string | null>(null);
  // Appointments left on days just taken away: they stay until the Owner deals with them.
  const [rearrange, setRearrange] = useState<AppointmentToRearrange[]>([]);

  if (team.error instanceof ApiError && team.error.status === 401) {
    void signOut();
    router.replace("/connect");
    return null;
  }

  const professionals = team.data?.professionals ?? [];
  const member =
    professionals.find((candidate) => candidate.professional_code === chosen) ?? professionals[0];
  const alone = professionals.length === 1;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Horarios</h1>
        <p className="mt-0.5 text-sm text-text-secondary">
          El bot solo ofrece horarios dentro de estas horas, fuera de los días libres y de las
          citas ya agendadas.
        </p>
      </div>

      {rearrange.length > 0 && (
        <StillToHappen appointments={rearrange} onDismiss={() => setRearrange([])} />
      )}

      {team.isLoading ? (
        <div className="h-96 animate-pulse rounded-xl bg-bg-elevated" />
      ) : team.error || !member ? (
        <Card>
          <p className="text-sm text-danger">
            {team.error instanceof Error
              ? team.error.message
              : "Prende «Agendar citas» en Ajustes para armar tus horarios."}
          </p>
        </Card>
      ) : (
        <>
          {!alone && (
            <div className="flex flex-wrap gap-2">
              {professionals.map((candidate) => (
                <button
                  key={candidate.professional_code}
                  type="button"
                  onClick={() => setChosen(candidate.professional_code)}
                  className={`rounded-full px-3 py-1.5 text-sm ${
                    candidate.professional_code === member.professional_code
                      ? "bg-accent/15 text-accent"
                      : "bg-white/5 text-text-secondary"
                  }`}
                >
                  {candidate.name}
                </button>
              ))}
            </div>
          )}

          <WeekEditor key={`week-${member.professional_code}`} member={member} alone={alone} />
          {!alone && (
            <ServicesPicker
              key={`services-${member.professional_code}`}
              member={member}
              services={(services.data ?? []).filter((service) => !service.archived)}
            />
          )}
          <DaysOff
            title={alone ? "Tus días libres" : `Días libres de ${member.name}`}
            hint="Un día libre saca a esta persona de la agenda."
            professionalCode={member.professional_code}
            days={member.days_off}
            onStillToHappen={setRearrange}
          />
          <DaysOff
            title="Días que cierra el negocio"
            hint="Un feriado o unas vacaciones: nadie atiende ese día."
            professionalCode={null}
            days={team.data?.business_closed ?? []}
            onStillToHappen={setRearrange}
          />
          <TeamCard member={member} alone={alone} onAdded={setChosen} onStillToHappen={setRearrange} />
        </>
      )}
    </div>
  );
}

function useTeamChange<T>(
  name: string,
  done: string,
  onDone?: (result: T) => void,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) => runBookingOperation<T>(name, payload),
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: TEAM_KEY });
      toast.success(done);
      onDone?.(result);
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "No se pudo guardar."),
  });
}

/** Blocks by weekday and then by start, as the API reads them back. */
function inWeekOrder(blocks: WorkingBlock[]): WorkingBlock[] {
  const order = WEEKDAYS.map(({ day }) => day);
  return [...blocks].sort(
    (a, b) => order.indexOf(a.day) - order.indexOf(b.day) || a.starts_at.localeCompare(b.starts_at),
  );
}

const DEFAULT_BLOCK = { starts_at: "09:00", ends_at: "18:00" };

function WeekEditor({ member, alone }: { member: TeamMember; alone: boolean }) {
  const [blocks, setBlocks] = useState<WorkingBlock[]>(member.hours);
  const week = inWeekOrder(blocks);
  const save = useTeamChange("set_working_hours", "Horario guardado.");
  const problem = hoursProblem(week);
  const changed = JSON.stringify(week) !== JSON.stringify(inWeekOrder(member.hours));

  const ofDay = (day: Weekday) => blocks.filter((block) => block.day === day);
  const replaceDay = (day: Weekday, next: WorkingBlock[]) =>
    setBlocks((was) => [...was.filter((block) => block.day !== day), ...next]);

  return (
    <Card>
      <h2 className="font-semibold">{alone ? "Tu semana" : `La semana de ${member.name}`}</h2>
      <p className="mt-0.5 text-sm text-text-secondary">
        Un día sin horario no se atiende. Para una pausa al mediodía, agrega un segundo tramo.
      </p>
      <ul className="mt-4 flex flex-col gap-3">
        {WEEKDAYS.map(({ day, label }) => {
          const dayBlocks = ofDay(day);
          return (
            <li key={day} className="flex flex-wrap items-center gap-3">
              <label className="flex w-32 items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={dayBlocks.length > 0}
                  onChange={(event) =>
                    replaceDay(day, event.target.checked ? [{ day, ...DEFAULT_BLOCK }] : [])
                  }
                />
                {label}
              </label>
              {dayBlocks.map((block, index) => (
                <span key={index} className="flex items-center gap-1.5 text-sm">
                  <input
                    type="time"
                    aria-label={`${label}, desde`}
                    value={block.starts_at}
                    onChange={(event) =>
                      replaceDay(
                        day,
                        dayBlocks.map((b, i) => (i === index ? { ...b, starts_at: event.target.value } : b)),
                      )
                    }
                    className="rounded-lg border border-border bg-bg-elevated px-2 py-1"
                  />
                  –
                  <input
                    type="time"
                    aria-label={`${label}, hasta`}
                    value={block.ends_at}
                    onChange={(event) =>
                      replaceDay(
                        day,
                        dayBlocks.map((b, i) => (i === index ? { ...b, ends_at: event.target.value } : b)),
                      )
                    }
                    className="rounded-lg border border-border bg-bg-elevated px-2 py-1"
                  />
                  {index > 0 && (
                    <button
                      type="button"
                      aria-label={`Quitar tramo del ${label.toLowerCase()}`}
                      onClick={() => replaceDay(day, dayBlocks.filter((_, i) => i !== index))}
                      className="text-text-secondary hover:text-text-primary"
                    >
                      <X size={14} />
                    </button>
                  )}
                </span>
              ))}
              {dayBlocks.length > 0 && (
                <button
                  type="button"
                  aria-label={`Agregar tramo al ${label.toLowerCase()}`}
                  onClick={() => {
                    const last = dayBlocks[dayBlocks.length - 1];
                    replaceDay(day, [
                      ...dayBlocks,
                      { day, starts_at: last.ends_at, ends_at: last.ends_at },
                    ]);
                  }}
                  className="text-xs text-text-secondary hover:text-accent"
                >
                  + tramo
                </button>
              )}
            </li>
          );
        })}
      </ul>
      {problem && changed && <p className="mt-3 text-xs text-danger">{problem}</p>}
      <div className="mt-4 flex justify-end">
        <Button
          size="sm"
          disabled={!changed || problem !== null || save.isPending}
          onClick={() => save.mutate({ hours: week, professional_code: member.professional_code })}
        >
          {save.isPending ? "Guardando..." : "Guardar horario"}
        </Button>
      </div>
    </Card>
  );
}

function ServicesPicker({ member, services }: { member: TeamMember; services: Service[] }) {
  const [every, setEvery] = useState(member.services === null);
  const [picked, setPicked] = useState<string[]>(
    member.services?.map((service) => service.code) ?? [],
  );
  const save = useTeamChange("set_professional_services", "Servicios guardados.");
  const wanted = every ? null : [...picked].sort();
  const was = member.services?.map((service) => service.code).sort() ?? null;
  const changed = JSON.stringify(wanted) !== JSON.stringify(was);

  return (
    <Card>
      <h2 className="font-semibold">Qué hace {member.name}</h2>
      <div className="mt-3 flex flex-col gap-2 text-sm">
        <label className="flex items-center gap-2">
          <input type="radio" checked={every} onChange={() => setEvery(true)} />
          Todos los servicios, también los que agregues después
        </label>
        <label className="flex items-center gap-2">
          <input type="radio" checked={!every} onChange={() => setEvery(false)} />
          Solo algunos
        </label>
        {!every && (
          <ul className="ml-6 flex flex-col gap-1.5">
            {services.map((service) => (
              <li key={service.code}>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={picked.includes(service.code)}
                    onChange={(event) =>
                      setPicked((was) =>
                        event.target.checked
                          ? [...was, service.code]
                          : was.filter((code) => code !== service.code),
                      )
                    }
                  />
                  {service.name}
                </label>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="mt-4 flex justify-end">
        <Button
          size="sm"
          disabled={!changed || (wanted !== null && wanted.length === 0) || save.isPending}
          onClick={() =>
            save.mutate({ professional_code: member.professional_code, service_codes: wanted })
          }
        >
          Guardar servicios
        </Button>
      </div>
    </Card>
  );
}

function DaysOff({
  title,
  hint,
  professionalCode,
  days,
  onStillToHappen,
}: {
  title: string;
  hint: string;
  professionalCode: string | null;
  days: string[];
  onStillToHappen: (appointments: AppointmentToRearrange[]) => void;
}) {
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const add = useTeamChange<{ still_to_happen: AppointmentToRearrange[] }>(
    "add_days_off",
    "Días agregados.",
    (result) => {
      onStillToHappen(result.still_to_happen);
      setFirst("");
      setLast("");
    },
  );
  const remove = useTeamChange("remove_days_off", "Días devueltos a la agenda.");
  const whose = professionalCode ? { professional_code: professionalCode } : {};
  const backwards = first !== "" && last !== "" && last < first;

  return (
    <Card>
      <h2 className="font-semibold">{title}</h2>
      <p className="mt-0.5 text-sm text-text-secondary">{hint}</p>
      {days.length > 0 && (
        <ul className="mt-3 flex flex-col gap-2">
          {dayRanges(days).map((range) => (
            <li key={range.first} className="flex items-center justify-between gap-3 text-sm">
              <span>
                {range.first === range.last
                  ? formatDay(range.first)
                  : `Del ${formatDay(range.first)} al ${formatDay(range.last)}`}
              </span>
              <Button
                variant="ghost"
                size="sm"
                disabled={remove.isPending}
                onClick={() =>
                  remove.mutate({ first_day: range.first, last_day: range.last, ...whose })
                }
              >
                Quitar
              </Button>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-4 flex flex-wrap items-end gap-3">
        <Input
          label="Desde"
          id={`first-${professionalCode ?? "business"}`}
          type="date"
          value={first}
          onChange={(event) => setFirst(event.target.value)}
        />
        <Input
          label="Hasta (opcional)"
          id={`last-${professionalCode ?? "business"}`}
          type="date"
          value={last}
          onChange={(event) => setLast(event.target.value)}
          error={backwards ? "Termina antes de empezar." : undefined}
        />
        <Button
          size="sm"
          variant="secondary"
          disabled={!first || backwards || add.isPending}
          onClick={() =>
            add.mutate({ first_day: first, ...(last ? { last_day: last } : {}), ...whose })
          }
        >
          Agregar
        </Button>
      </div>
    </Card>
  );
}

function TeamCard({
  member,
  alone,
  onAdded,
  onStillToHappen,
}: {
  member: TeamMember;
  alone: boolean;
  onAdded: (professionalCode: string) => void;
  onStillToHappen: (appointments: AppointmentToRearrange[]) => void;
}) {
  const [name, setName] = useState("");
  const add = useTeamChange<{ professional_code: string }>(
    "add_professional",
    "Agregado al equipo. Ahora dile su horario.",
    (result) => {
      setName("");
      onAdded(result.professional_code);
    },
  );
  const retire = useTeamChange<{ still_to_happen: AppointmentToRearrange[] }>(
    "retire_professional",
    `${member.name} ya no toma citas.`,
    (result) => onStillToHappen(result.still_to_happen),
  );

  return (
    <Card>
      <h2 className="font-semibold">Equipo</h2>
      <p className="mt-0.5 text-sm text-text-secondary">
        {alone
          ? "Si atiende alguien más, agrégalo y el bot repartirá las citas entre ustedes."
          : "Cada persona tiene su semana; el bot ofrece el horario de quien esté libre."}
      </p>
      <form
        className="mt-4 flex flex-wrap items-end gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          if (name.trim()) add.mutate({ name: name.trim() });
        }}
      >
        <Input
          label="Nombre"
          id="new-professional"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Pedro"
        />
        <Button type="submit" size="sm" variant="secondary" disabled={!name.trim() || add.isPending}>
          <Plus size={14} className="mr-1" />
          Agregar
        </Button>
      </form>
      {!alone && (
        <Button
          variant="ghost"
          size="sm"
          className="mt-4"
          disabled={retire.isPending}
          onClick={() => {
            if (confirm(`¿${member.name} ya no trabaja aquí? Dejará de tomar citas nuevas.`)) {
              retire.mutate({ professional_code: member.professional_code });
            }
          }}
        >
          {member.name} ya no trabaja aquí
        </Button>
      )}
    </Card>
  );
}

function StillToHappen({
  appointments,
  onDismiss,
}: {
  appointments: AppointmentToRearrange[];
  onDismiss: () => void;
}) {
  return (
    <div role="alert" className="rounded-2xl border border-warning/40 bg-warning/5 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold">
            {appointments.length === 1
              ? "Queda 1 cita agendada en esos días"
              : `Quedan ${appointments.length} citas agendadas en esos días`}
          </p>
          <p className="mt-0.5 text-sm text-text-secondary">
            Siguen en pie hasta que las muevas o canceles; pídeselo a tu asistente por WhatsApp.
          </p>
        </div>
        <button
          type="button"
          aria-label="Cerrar aviso"
          onClick={onDismiss}
          className="text-text-secondary hover:text-text-primary"
        >
          <X size={16} />
        </button>
      </div>
      <ul className="mt-3 flex flex-col gap-1.5 text-sm">
        {appointments.map((appointment) => (
          <li key={appointment.appointment_code}>
            {formatDateTime(appointment.starts_at)} · {appointment.service} con{" "}
            {appointment.professional} · {appointment.customer ?? appointment.whatsapp_number} (
            {appointment.appointment_code})
          </li>
        ))}
      </ul>
    </div>
  );
}

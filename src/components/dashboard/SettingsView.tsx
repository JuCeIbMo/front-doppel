"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import { toast } from "sonner";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { WhatsAppDisconnectedNotice } from "@/components/dashboard/WhatsAppDisconnectedNotice";
import { readApi, runOperationOrThrow } from "@/lib/operations";
import {
  SWITCH_SAYS,
  isOn,
  turnSwitch,
  useBusiness,
  type Business,
  type BusinessSwitch,
} from "@/lib/business";
import { runBookingOperation } from "@/lib/appointments";
import { startRehearsal, type Rehearsal } from "@/lib/rehearsal";

type CallsState = "off" | "turning_on" | "on" | "turning_off" | "refused";
type CallsRefusedReason = "messaging_limit" | "payment_method" | "quality" | "other";

interface WhatsappLine {
  phone_number_id: string;
  display_phone_number: string;
  public_agent_enabled: boolean;
  calls_state: CallsState;
  calls_refused_reason: CallsRefusedReason | null;
  voice_instructions: string | null;
}

/** The backend's limit on the voice instructions. */
const VOICE_INSTRUCTIONS_MAX_CHARS = 1000;

/** While WhatsApp is applying the Owner's choice, the state is re-read until it settles. */
const CALLS_SETTLING_POLL_MS = 3000;

function callsSettling(line: WhatsappLine | null | undefined): boolean {
  return line?.calls_state === "turning_on" || line?.calls_state === "turning_off";
}

/** Every setting of the Business on one screen. */
export function SettingsView() {
  const business = useBusiness();
  const line = useQuery({
    queryKey: ["whatsapp-line"],
    queryFn: () => readApi<WhatsappLine | null>("/dashboard/whatsapp-line"),
    refetchInterval: (query) => (callsSettling(query.state.data) ? CALLS_SETTLING_POLL_MS : false),
  });
  const phones = useQuery({
    queryKey: ["manager-phones"],
    queryFn: () => readApi<Array<{ phone: string }>>("/dashboard/manager-phones"),
  });

  const failed = [business.error, line.error, phones.error].find(Boolean);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Ajustes</h1>
        <p className="mt-0.5 text-sm text-text-secondary">
          El nombre de tu negocio, tu WhatsApp y quiénes pueden hablar con tu asistente.
        </p>
      </div>

      {failed && (
        <p className="text-sm text-danger">
          {failed instanceof Error ? failed.message : "No se pudo cargar."}
        </p>
      )}

      {business.data && <BusinessName key={business.data.name} current={business.data.name} />}

      {business.data && <WhatItDoes business={business.data} />}

      {business.data?.booking_enabled && (
        <CalendarEmail
          key={business.data.calendar_email ?? ""}
          current={business.data.calendar_email}
        />
      )}

      {line.isLoading ? (
        <div className="h-32 animate-pulse rounded-xl bg-bg-elevated" />
      ) : line.data ? (
        <>
          <ConnectedLine line={line.data} />
          <Calls line={line.data} />
          <CallVoice current={line.data.voice_instructions} />
        </>
      ) : (
        !line.error && <WhatsAppDisconnectedNotice />
      )}

      {phones.data && (
        <ManagerPhones
          key={phones.data.map((entry) => entry.phone).join(",")}
          current={phones.data.map((entry) => entry.phone)}
        />
      )}
    </div>
  );
}

function BusinessName({ current }: { current: string }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(current);
  const save = useMutation({
    mutationFn: () => runOperationOrThrow<{ name: string }>("name_business", { name: name.trim() }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["business"] });
      toast.success("Nombre guardado.");
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "No se pudo guardar el nombre."),
  });

  return (
    <Card>
      <CardHeader title="Negocio" />
      <form
        className="flex flex-col gap-3 sm:flex-row sm:items-end"
        onSubmit={(event) => {
          event.preventDefault();
          save.mutate();
        }}
      >
        <div className="flex-1">
          <Input
            label="Nombre"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={200}
          />
        </div>
        <Button
          type="submit"
          size="sm"
          disabled={save.isPending || !name.trim() || name.trim() === current}
        >
          {save.isPending ? "Guardando..." : "Guardar"}
        </Button>
      </form>
    </Card>
  );
}

/** Who sees the Appointments in Google. Google only shows them: Doppel is where they change. */
function CalendarEmail({ current }: { current: string | null }) {
  const queryClient = useQueryClient();
  const [email, setEmail] = useState(current ?? "");
  const save = useMutation({
    mutationFn: () => runBookingOperation("set_calendar_email", { email: email.trim() }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["business"] });
      toast.success("Listo. Google le enviará una invitación a ese email.");
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "No se pudo guardar el email."),
  });

  return (
    <Card>
      <CardHeader title="Tu Google Calendar" />
      <p className="mb-3 text-sm text-text-secondary">
        Doppel pone tus citas en un calendario de Google compartido con este email. Es solo para
        mirar: lo que cambies o borres en Google no cambia tus citas. Muévelas o cancélalas en la
        Agenda o con tu asistente. Si cambias el email, el anterior deja de verlo.
      </p>
      <form
        className="flex flex-col gap-3 sm:flex-row sm:items-end"
        onSubmit={(event) => {
          event.preventDefault();
          save.mutate();
        }}
      >
        <div className="flex-1">
          <Input
            label="Email de Google"
            type="email"
            value={email}
            placeholder="tu@gmail.com"
            onChange={(event) => setEmail(event.target.value)}
            maxLength={254}
          />
        </div>
        <Button
          type="submit"
          size="sm"
          disabled={save.isPending || !email.trim() || email.trim() === current}
        >
          {save.isPending ? "Guardando..." : "Guardar"}
        </Button>
      </form>
    </Card>
  );
}

/** A switch that says its own name, for turning one setting on or off. */
function Toggle({
  label,
  on,
  disabled,
  onClick,
}: {
  label: string;
  on: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${
        on ? "bg-accent" : "bg-border"
      }`}
    >
      <span
        className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
          on ? "translate-x-5" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

const KINDS: { kind: BusinessSwitch; label: string }[] = [
  { kind: "selling", label: "Vender productos" },
  { kind: "booking", label: "Agendar citas" },
];

/** Selling and booking, each turned on or off apart; turning one off may be refused. */
function WhatItDoes({ business }: { business: Business }) {
  const queryClient = useQueryClient();
  const [refused, setRefused] = useState<string | null>(null);
  const turn = useMutation({
    mutationFn: ({ kind, on }: { kind: BusinessSwitch; on: boolean }) => turnSwitch(kind, on),
    onMutate: () => setRefused(null),
    onSuccess: async (reason) => {
      setRefused(reason);
      await queryClient.invalidateQueries({ queryKey: ["business"] });
      await queryClient.invalidateQueries({ queryKey: ["overview"] });
    },
    onError: (error) =>
      setRefused(error instanceof Error ? error.message : "No se pudo cambiar. Intenta de nuevo."),
  });

  return (
    <Card>
      <CardHeader title="Qué hace tu negocio" />
      <ul className="flex flex-col gap-4">
        {KINDS.map(({ kind, label }) => (
          <li key={kind} className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-text-primary">{label}</p>
              <p className="text-sm text-text-secondary">{SWITCH_SAYS[kind]}</p>
            </div>
            <Toggle
              label={label}
              on={isOn(business, kind)}
              disabled={turn.isPending}
              onClick={() => turn.mutate({ kind, on: !isOn(business, kind) })}
            />
          </li>
        ))}
      </ul>
      {refused && <p className="mt-4 text-sm text-danger">{refused}</p>}
      {business.booking_enabled && <Reminders />}
    </Card>
  );
}

/** What `GET /dashboard/reminders` answers. */
interface ReminderState {
  template_name: string;
  status: string;
  rejected_reason: string | null;
  sending: boolean;
  cost_note: string;
}

const REMINDERS_SAY: Record<string, string> = {
  APPROVED: "Tus clientes reciben un recordatorio el día antes de su cita.",
  PENDING:
    "Meta está revisando el mensaje del recordatorio. Hasta que lo apruebe, no se envían recordatorios.",
  REJECTED: "Meta rechazó el mensaje del recordatorio, así que no se envían recordatorios.",
  PAUSED:
    "Meta pausó el mensaje del recordatorio por quejas de clientes; mientras siga pausado no se envían recordatorios.",
  DISABLED: "Meta desactivó el mensaje del recordatorio, así que no se envían recordatorios.",
  MISSING:
    "Meta todavía no tiene el mensaje del recordatorio. Doppel se lo envía a revisar cuando haya un recordatorio por enviar; hasta que lo apruebe, no se envían recordatorios.",
  NO_LINE: "Conecta tu WhatsApp para que tus clientes reciban recordatorios.",
};

/** Whether the reminder the day before goes out: only Meta knows if it approved it. */
function Reminders() {
  const reminders = useQuery({
    queryKey: ["reminders"],
    queryFn: () => readApi<ReminderState>("/dashboard/reminders"),
  });
  const state = reminders.data;

  return (
    <div className="mt-5 border-t border-border pt-4">
      <p className="text-sm font-medium text-text-primary">Recordatorio del día antes</p>
      {reminders.isLoading ? (
        <div className="mt-2 h-10 animate-pulse rounded-lg bg-bg-elevated" />
      ) : !state ? (
        <p className="mt-1 text-sm text-danger">
          No pudimos preguntarle a Meta por el recordatorio. Vuelve a intentarlo en un rato.
        </p>
      ) : (
        <>
          <p className={`mt-1 text-sm ${state.sending ? "text-text-secondary" : "text-danger"}`}>
            {REMINDERS_SAY[state.status] ??
              `Meta tiene el mensaje del recordatorio como ${state.status}, así que no se envían recordatorios.`}
          </p>
          {state.rejected_reason && (
            <p className="mt-1 text-sm text-text-secondary">Motivo de Meta: {state.rejected_reason}</p>
          )}
          <p className="mt-2 text-xs text-text-muted">{state.cost_note}</p>
        </>
      )}
    </div>
  );
}

function ConnectedLine({ line }: { line: WhatsappLine }) {
  const queryClient = useQueryClient();
  const disconnect = useMutation({
    mutationFn: () => runOperationOrThrow("disconnect_whatsapp_line"),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["whatsapp-line"] });
      toast.success("WhatsApp desconectado.");
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "No se pudo desconectar."),
  });

  return (
    <Card>
      <CardHeader title="WhatsApp" />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-lg font-medium">{line.display_phone_number}</p>
          <p className="text-sm text-text-secondary">
            {line.public_agent_enabled ? "El bot está respondiendo." : "El bot está apagado."}
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          disabled={disconnect.isPending}
          onClick={() => {
            if (
              confirm(
                "¿Desconectar tu WhatsApp? Dejarás de recibir y enviar mensajes desde Doppel hasta que lo conectes de nuevo.",
              )
            ) {
              disconnect.mutate();
            }
          }}
        >
          {disconnect.isPending ? "Desconectando..." : "Desconectar"}
        </Button>
      </div>
    </Card>
  );
}

const CALLS_SAY: Record<CallsState, string> = {
  off: "Las llamadas están apagadas: tus clientes no ven el botón de llamar en WhatsApp.",
  turning_on: "Activando las llamadas en WhatsApp…",
  on: "Tu asistente contesta las llamadas de tus clientes, a cualquier hora.",
  turning_off: "Apagando las llamadas en WhatsApp…",
  refused: "WhatsApp no permitió activar las llamadas en tu número.",
};

const WHY_CALLS_WERE_REFUSED: Record<CallsRefusedReason, string> = {
  messaging_limit:
    "Tu número todavía puede escribir a menos de 2.000 personas por día, y WhatsApp solo permite llamadas desde ese límite. El límite sube solo a medida que conversas con más clientes sin reclamos. Cuando llegues, vuelve a intentarlo.",
  payment_method:
    "Tu cuenta de WhatsApp Business no tiene un método de pago. Las llamadas de tus clientes son gratis, pero WhatsApp lo exige igual: agrega una tarjeta en el Administrador de WhatsApp de Meta (business.facebook.com) y vuelve a intentarlo.",
  quality:
    "WhatsApp restringió las llamadas de tu número por reclamos o bloqueos de clientes. Suele durar unos días: revisa la calidad de tu número en el Administrador de WhatsApp de Meta y vuelve a intentarlo más tarde.",
  other:
    "WhatsApp no dio un motivo que conozcamos. Vuelve a intentarlo en un rato; si sigue fallando, escríbenos.",
};

function Calls({ line }: { line: WhatsappLine }) {
  const queryClient = useQueryClient();
  const on = line.calls_state === "on" || line.calls_state === "turning_on";
  const refused = line.calls_state === "refused";
  const switchCalls = useMutation({
    mutationFn: (enable: boolean) => runOperationOrThrow(enable ? "enable_calls" : "disable_calls"),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["whatsapp-line"] });
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "No se pudo cambiar las llamadas."),
  });

  return (
    <Card>
      <CardHeader title="Llamadas" />
      <div className="flex items-start justify-between gap-4">
        <p className={refused ? "text-sm text-danger" : "text-sm text-text-secondary"}>
          {CALLS_SAY[line.calls_state]}
        </p>
        <Toggle
          label="Llamadas"
          on={on}
          disabled={switchCalls.isPending}
          onClick={() => switchCalls.mutate(!on)}
        />
      </div>
      {refused && (
        <div className="mt-4 flex flex-col gap-3">
          <p className="text-sm text-text-secondary">
            {WHY_CALLS_WERE_REFUSED[line.calls_refused_reason ?? "other"]}
          </p>
          <div>
            <Button
              variant="secondary"
              size="sm"
              disabled={switchCalls.isPending}
              onClick={() => switchCalls.mutate(true)}
            >
              Intentar de nuevo
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

function CallVoice({ current }: { current: string | null }) {
  const queryClient = useQueryClient();
  const [instructions, setInstructions] = useState(current ?? "");
  const [rehearsal, setRehearsal] = useState<Rehearsal | null>(null);
  const [starting, setStarting] = useState(false);
  const live = useRef<Rehearsal | null>(null);
  live.current = rehearsal;
  // Leaving Ajustes hangs up: an open rehearsal would keep spending the month's minutes.
  useEffect(() => () => live.current?.stop(), []);
  const save = useMutation({
    mutationFn: () => runOperationOrThrow("set_voice_instructions", { instructions }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["whatsapp-line"] });
      toast.success("Instrucciones guardadas.");
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "No se pudieron guardar."),
  });

  const rehearse = async () => {
    setStarting(true);
    try {
      setRehearsal(
        await startRehearsal((failed) => {
          setRehearsal(null);
          if (failed) {
            toast.error(
              "No se pudo conectar el audio de la llamada de prueba. Prueba desde otra red (por ejemplo, Wi-Fi en vez de datos móviles).",
            );
          }
        }),
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo iniciar la llamada de prueba.");
    } finally {
      setStarting(false);
    }
  };

  return (
    <Card>
      <CardHeader title="Voz del asistente en llamadas" />
      <p className="mb-3 text-sm text-text-secondary">
        Cómo quieres que suene tu asistente al teléfono: tono, acento, ritmo, palabras que
        use. Solo se aplica a las llamadas; siempre se presenta como asistente virtual.
      </p>
      <label htmlFor="voice-instructions" className="sr-only">
        Instrucciones de voz
      </label>
      <textarea
        id="voice-instructions"
        value={instructions}
        onChange={(event) => setInstructions(event.target.value)}
        maxLength={VOICE_INSTRUCTIONS_MAX_CHARS}
        rows={3}
        placeholder="Habla despacio, con acento boliviano, trata de usted."
        className="w-full rounded-lg border border-border bg-bg-elevated px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent/40 focus:border-accent/40 transition-colors resize-none"
      />
      <div className="mt-3 flex flex-wrap items-center justify-end gap-3">
        <span className="mr-auto text-xs text-text-muted">
          {instructions.length}/{VOICE_INSTRUCTIONS_MAX_CHARS}
        </span>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => save.mutate()}
          disabled={instructions === (current ?? "") || save.isPending}
        >
          {save.isPending ? "Guardando..." : "Guardar instrucciones"}
        </Button>
        {rehearsal ? (
          <Button size="sm" variant="secondary" onClick={() => rehearsal.stop()}>
            Colgar
          </Button>
        ) : (
          <Button size="sm" onClick={() => void rehearse()} disabled={starting}>
            {starting ? "Conectando..." : "Probar llamada"}
          </Button>
        )}
      </div>
      <p className="mt-3 text-xs text-text-muted">
        {rehearsal
          ? "Habla: tu asistente te escucha como a un cliente. Lee tu catálogo real, pero no crea pedidos ni envía mensajes."
          : "La llamada de prueba usa tus instrucciones guardadas y cuenta en los minutos de llamadas del mes."}
      </p>
    </Card>
  );
}

function ManagerPhones({ current }: { current: string[] }) {
  const queryClient = useQueryClient();
  const [phones, setPhones] = useState(current);
  const [draft, setDraft] = useState("");
  const changed = phones.join(",") !== current.join(",");

  const save = useMutation({
    mutationFn: () => runOperationOrThrow<{ phones: string[] }>("set_manager_phones", { phones }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["manager-phones"] });
      toast.success("Teléfonos guardados.");
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "No se pudieron guardar."),
  });

  const add = () => {
    const cleaned = draft.trim();
    if (cleaned && !phones.includes(cleaned)) setPhones([...phones, cleaned]);
    setDraft("");
  };

  return (
    <Card>
      <CardHeader title="Teléfonos de encargados" />
      <p className="mb-4 text-sm text-text-secondary">
        Quienes escriban desde estos números hablan con tu asistente y pueden manejar el
        negocio. Cualquier otro número es atendido como cliente.
      </p>
      <ul className="mb-4 flex flex-col gap-2">
        {phones.length === 0 ? (
          <li className="text-sm text-text-secondary">Todavía no hay teléfonos. Agrega el tuyo.</li>
        ) : (
          phones.map((phone) => (
            <li
              key={phone}
              className="flex items-center justify-between rounded-lg border border-border bg-bg-elevated px-4 py-2.5 text-sm"
            >
              {/^\d+$/.test(phone) ? `+${phone}` : phone}
              <button
                type="button"
                aria-label={`Quitar ${phone}`}
                onClick={() => setPhones(phones.filter((candidate) => candidate !== phone))}
                className="text-text-secondary hover:text-danger"
              >
                <X size={16} />
              </button>
            </li>
          ))
        )}
      </ul>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <Input
            label="Nuevo teléfono"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                add();
              }
            }}
            placeholder="+591 70000000"
          />
        </div>
        <Button variant="secondary" size="sm" onClick={add} disabled={!draft.trim()}>
          Agregar
        </Button>
        <Button
          size="sm"
          onClick={() => save.mutate()}
          disabled={!changed || phones.length === 0 || save.isPending}
        >
          {save.isPending ? "Guardando..." : "Guardar"}
        </Button>
      </div>
    </Card>
  );
}

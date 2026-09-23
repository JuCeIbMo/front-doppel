"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { toast } from "sonner";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { WhatsAppDisconnectedNotice } from "@/components/dashboard/WhatsAppDisconnectedNotice";
import { ApiError } from "@/lib/api-client";
import { readApi, runOperationOrThrow } from "@/lib/operations";
import { signOut } from "@/lib/supabase";

type CallsState = "off" | "turning_on" | "on" | "turning_off" | "refused";
type CallsRefusedReason = "messaging_limit" | "payment_method" | "quality" | "other";

interface WhatsappLine {
  phone_number_id: string;
  display_phone_number: string;
  public_agent_enabled: boolean;
  calls_state: CallsState;
  calls_refused_reason: CallsRefusedReason | null;
}

/** While WhatsApp is applying the Owner's choice, the state is re-read until it settles. */
const CALLS_SETTLING_POLL_MS = 3000;

function callsSettling(line: WhatsappLine | null | undefined): boolean {
  return line?.calls_state === "turning_on" || line?.calls_state === "turning_off";
}

/** Every setting of the Business on one screen. */
export function SettingsView() {
  const router = useRouter();
  const business = useQuery({
    queryKey: ["business"],
    queryFn: () => readApi<{ name: string }>("/dashboard/business"),
  });
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
  if (failed instanceof ApiError && failed.status === 401) {
    void signOut();
    router.replace("/connect");
    return null;
  }

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

      {line.isLoading ? (
        <div className="h-32 animate-pulse rounded-xl bg-bg-elevated" />
      ) : line.data ? (
        <>
          <ConnectedLine line={line.data} />
          <Calls line={line.data} />
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
        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-label="Llamadas"
          disabled={switchCalls.isPending}
          onClick={() => switchCalls.mutate(!on)}
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

"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  PAYMENT_AHEAD_SAYS,
  SERVICES_KEY,
  draftOf,
  draftProblems,
  newServicePayload,
  runBookingOperation,
  serviceChanges,
  useServices,
  type PaymentAhead,
  type Service,
  type ServiceDraft,
} from "@/lib/appointments";

/** A new Service when `serviceCode` is absent; that Service otherwise. */
export function ServiceEditorView({ serviceCode }: { serviceCode?: string }) {
  const query = useServices();

  if (!serviceCode) {
    return <ServiceForm />;
  }
  if (query.isLoading) {
    return <div className="h-96 animate-pulse rounded-xl bg-bg-elevated" />;
  }
  const service = query.data?.find((candidate) => candidate.code === serviceCode);
  if (!service) {
    return (
      <Card>
        <p className="text-sm text-text-secondary">
          {query.error instanceof Error ? query.error.message : "Ese servicio no existe."}
        </p>
        <Button variant="ghost" size="sm" href="/dashboard/services" className="mt-4">
          Volver a servicios
        </Button>
      </Card>
    );
  }
  return <ServiceForm key={service.code} service={service} />;
}

function ServiceForm({ service }: { service?: Service }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<ServiceDraft>(draftOf(service));
  const set = (change: Partial<ServiceDraft>) => setDraft((was) => ({ ...was, ...change }));

  const problems = draftProblems(draft);
  const changes = service ? serviceChanges(service, draft) : newServicePayload(draft);
  const ready = changes !== null && Object.keys(changes).length > 0;

  const save = useMutation({
    mutationFn: async () => {
      if (!changes) return;
      if (service) {
        await runBookingOperation("change_service", { service_code: service.code, ...changes });
      } else {
        await runBookingOperation("add_service", changes);
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: SERVICES_KEY });
      toast.success(service ? "Cambios guardados." : "Servicio creado.");
      router.push("/dashboard/services");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "No se pudo guardar."),
  });

  const archive = useMutation({
    mutationFn: () =>
      runBookingOperation(service?.archived ? "restore_service" : "archive_service", {
        service_code: service?.code,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: SERVICES_KEY });
      toast.success(service?.archived ? "Servicio de vuelta en oferta." : "Servicio archivado.");
      router.push("/dashboard/services");
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "No se pudo cambiar el servicio."),
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">{service ? service.name : "Nuevo servicio"}</h1>
        <p className="mt-0.5 text-sm text-text-secondary">
          {service?.archived
            ? "Archivado: el bot no lo ofrece. Restáuralo para volver a agendarlo."
            : "El bot ofrece horarios libres de este largo y cobra lo que pidas por adelantado. Las citas ya agendadas guardan su precio y duración."}
        </p>
      </div>

      <Card>
        <form
          className="flex max-w-xl flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (ready) save.mutate();
          }}
        >
          <fieldset disabled={service?.archived} className="flex flex-col gap-4">
          <Input label="Nombre" value={draft.name} onChange={(event) => set({ name: event.target.value })} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Minutos"
              inputMode="numeric"
              value={draft.minutes}
              onChange={(event) => set({ minutes: event.target.value })}
              placeholder="30"
              error={problems.minutes}
            />
            <Input
              label="Precio"
              inputMode="decimal"
              value={draft.price}
              onChange={(event) => set({ price: event.target.value })}
              placeholder="50.00"
              error={problems.price}
            />
          </div>

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1.5 text-xs font-medium uppercase tracking-wide text-text-muted">
              Pago por adelantado
            </legend>
            {(Object.keys(PAYMENT_AHEAD_SAYS) as PaymentAhead[]).map((kind) => (
              <label key={kind} className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="payment-ahead"
                  checked={draft.paymentAhead === kind}
                  onChange={() => set({ paymentAhead: kind })}
                />
                {PAYMENT_AHEAD_SAYS[kind]}
              </label>
            ))}
          </fieldset>
          {draft.paymentAhead === "deposit" && (
            <Input
              label="Seña"
              inputMode="decimal"
              value={draft.deposit}
              onChange={(event) => set({ deposit: event.target.value })}
              placeholder="20.00"
              error={problems.deposit}
            />
          )}
          {draft.paymentAhead !== "none" && (
            <p className="text-xs text-text-secondary">
              La cita queda apartada hasta que confirmes el pago; si no llega a tiempo, se libera
              sola.
            </p>
          )}

          </fieldset>

          <div className="mt-2 flex flex-wrap justify-between gap-3">
            {service ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={archive.isPending || save.isPending}
                onClick={() => {
                  if (
                    service.archived ||
                    confirm(
                      "¿Archivar este servicio? El bot dejará de ofrecerlo; las citas ya agendadas se mantienen.",
                    )
                  ) {
                    archive.mutate();
                  }
                }}
              >
                {service.archived ? "Restaurar" : "Archivar"}
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-3">
              <Button variant="ghost" size="sm" href="/dashboard/services">
                Cancelar
              </Button>
              <Button type="submit" size="sm" disabled={!ready || service?.archived || save.isPending}>
                {save.isPending ? "Guardando..." : service ? "Guardar cambios" : "Crear servicio"}
              </Button>
            </div>
          </div>
        </form>
      </Card>
    </div>
  );
}

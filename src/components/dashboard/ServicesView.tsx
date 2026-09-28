"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useServices, type Service } from "@/lib/appointments";
import { useCurrency } from "@/hooks/useCurrency";

/** The Services the bot books, and the archived ones the Owner can bring back. */
export function ServicesView() {
  const [showArchived, setShowArchived] = useState(false);
  const query = useServices();


  const services = (query.data ?? []).filter((service) => service.archived === showArchived);
  const archivedCount = (query.data ?? []).filter((service) => service.archived).length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1>Servicios</h1>
          <p className="mt-0.5 text-sm text-text-secondary">
            Lo que el bot agenda por WhatsApp. Un servicio archivado deja de ofrecerse; las citas
            ya agendadas se mantienen.
          </p>
        </div>
        <Button size="sm" href="/dashboard/services/new">
          <Plus size={16} className="mr-1.5" />
          Nuevo servicio
        </Button>
      </div>

      <div className="flex gap-2">
        {[
          { archived: false, label: "En oferta" },
          { archived: true, label: `Archivados (${archivedCount})` },
        ].map((tab) => (
          <button
            key={tab.label}
            type="button"
            onClick={() => setShowArchived(tab.archived)}
            className={`inline-flex min-h-11 items-center border-2 px-4 text-sm font-bold transition-colors ${
              showArchived === tab.archived
                ? "border-ink bg-ink text-paper"
                : "border-ink/30 text-ink hover:border-ink"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {query.isLoading ? (
        <div className="h-40 animate-pulse bg-bg-elevated" />
      ) : query.error ? (
        <Card>
          <p className="text-sm text-danger">
            {query.error instanceof Error ? query.error.message : "No se pudo cargar."}
          </p>
        </Card>
      ) : services.length === 0 ? (
        <Card>
          <p className="text-sm text-text-secondary">
            {showArchived
              ? "No tienes servicios archivados."
              : "Todavía no hay servicios. Crea el primero o escríbele a tu asistente: «corte, 30 minutos, 50 Bs»."}
          </p>
        </Card>
      ) : (
        <ul className="divide-y divide-border overflow-hidden border border-border bg-bg-secondary">
          {services.map((service) => (
            <ServiceRow key={service.code} service={service} />
          ))}
        </ul>
      )}
    </div>
  );
}

function ServiceRow({ service }: { service: Service }) {
  const { format } = useCurrency();
  return (
    <li>
      <Link
        href={`/dashboard/services/${service.code}`}
        className="flex items-center justify-between gap-4 p-4 transition-colors hover:bg-bg-elevated"
      >
        <div>
          <p className="font-medium">{service.name}</p>
          <p className="text-xs text-text-secondary">
            {service.duration_minutes} min
            {service.payment_ahead === "deposit" &&
              service.deposit &&
              ` · seña de ${format(Number(service.deposit))}`}
            {service.payment_ahead === "full" && " · se paga por adelantado"}
          </p>
        </div>
        <p className="text-lg font-semibold">{format(Number(service.price))}</p>
      </Link>
    </li>
  );
}

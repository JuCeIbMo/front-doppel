"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { StatCard } from "@/components/ui/StatCard";
import { OnboardingChecklist, type OnboardingStep } from "@/components/dashboard/OnboardingChecklist";
import { readApi } from "@/lib/operations";
import { isOn, useBusiness, type Business } from "@/lib/business";
import { useCurrency } from "@/hooks/useCurrency";

/** What `GET /dashboard/overview` answers. */
export interface Overview {
  sold_today: string;
  sales_today: number;
  orders_to_collect: number;
  orders_to_deliver: number;
  pending_approvals: number;
  handed_over: number;
  messages_this_month: number;
  free_messages_per_month: number;
  call_minutes_this_month: number;
  call_minutes_per_month: number;
  onboarding: {
    line_connected: boolean;
    has_product: boolean;
    has_service: boolean;
    has_hours: boolean;
    has_knowledge: boolean;
    has_manager_phone: boolean;
  };
}

/** The first steps of a new Business, following what it has on. */
function firstSteps(
  onboarding: Overview["onboarding"],
  business: Business | undefined,
): OnboardingStep[] {
  return [
    {
      label: "Conecta tu WhatsApp",
      done: onboarding.line_connected,
      href: "/dashboard/settings",
    },
    ...(isOn(business, "selling")
      ? [
          {
            label: "Agrega tu primer producto",
            done: onboarding.has_product,
            href: "/dashboard/products/new",
          },
        ]
      : []),
    ...(isOn(business, "booking")
      ? [
          {
            label: "Agrega tu primer servicio",
            done: onboarding.has_service,
            href: "/dashboard/services/new",
          },
          {
            label: "Arma tu horario",
            done: onboarding.has_hours,
            href: "/dashboard/hours",
          },
        ]
      : []),
    {
      label: "Cuéntale al bot sobre tu negocio",
      done: onboarding.has_knowledge,
      href: "/dashboard/knowledge",
    },
    {
      label: "Agrega tu teléfono de encargado",
      done: onboarding.has_manager_phone,
      href: "/dashboard/settings",
    },
  ];
}

export function OverviewView() {
  const { format } = useCurrency();
  const query = useQuery({
    queryKey: ["overview"],
    queryFn: () => readApi<Overview>("/dashboard/overview"),
    refetchInterval: 30000,
  });
  const { data: business, isError: businessUnknown } = useBusiness();


  const overview = query.data;
  // Without the Business, the steps that follow a switch are left out, not the checklist.
  const steps =
    overview && (business || businessUnknown) ? firstSteps(overview.onboarding, business) : [];
  const messagesShare = overview
    ? overview.messages_this_month / overview.free_messages_per_month
    : 0;
  const callMinutesShare = overview
    ? overview.call_minutes_this_month / overview.call_minutes_per_month
    : 0;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Inicio</h1>
        <p className="mt-0.5 text-sm text-text-secondary">Cómo va tu negocio hoy.</p>
      </div>

      {query.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5, 6].map((index) => (
            <div key={index} className="h-28 animate-pulse rounded-xl bg-bg-elevated" />
          ))}
        </div>
      ) : !overview ? (
        <p className="text-sm text-danger">
          {query.error instanceof Error ? query.error.message : "No se pudo cargar."}
        </p>
      ) : (
        <>
          {steps.some((step) => !step.done) && <OnboardingChecklist steps={steps} />}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Link href="/dashboard/sales">
              <StatCard
                label="Vendido hoy"
                value={format(Number(overview.sold_today))}
                delta={`${overview.sales_today} ${overview.sales_today === 1 ? "venta" : "ventas"}`}
                deltaPositive
              />
            </Link>
            {isOn(business, "selling") && (
              <>
                <Link href="/dashboard/orders">
                  <StatCard label="Pedidos por cobrar" value={String(overview.orders_to_collect)} />
                </Link>
                <Link href="/dashboard/orders">
                  <StatCard
                    label="Pedidos por entregar"
                    value={String(overview.orders_to_deliver)}
                  />
                </Link>
              </>
            )}
            <Link href="/dashboard/approvals">
              <StatCard
                label="Aprobaciones pendientes"
                value={String(overview.pending_approvals)}
                delta={overview.pending_approvals > 0 ? "Te están esperando" : undefined}
              />
            </Link>
            <Link href="/dashboard/automation">
              <StatCard
                label="Clientes que te pasó el bot"
                value={String(overview.handed_over)}
                delta={overview.handed_over > 0 ? "Respóndeles en la bandeja" : undefined}
              />
            </Link>
            <StatCard
              label="Mensajes de WhatsApp este mes"
              value={`${overview.messages_this_month} / ${overview.free_messages_per_month}`}
              delta={
                messagesShare >= 1
                  ? "Pasaste los gratis: Meta cobra los siguientes"
                  : messagesShare >= 0.8
                    ? "Cerca del límite gratis"
                    : "Aproximado, según nuestros registros"
              }
              deltaPositive={messagesShare < 0.8}
            />
            <StatCard
              label="Minutos de llamadas este mes"
              value={`${overview.call_minutes_this_month} / ${overview.call_minutes_per_month}`}
              delta={
                callMinutesShare >= 1
                  ? "Se acabaron: las llamadas vuelven el 1 del próximo mes"
                  : callMinutesShare >= 0.8
                    ? "Quedan pocos minutos"
                    : undefined
              }
              deltaPositive={false}
            />
          </div>
        </>
      )}
    </div>
  );
}

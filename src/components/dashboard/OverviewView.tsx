"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { OnboardingChecklist, type OnboardingStep } from "@/components/dashboard/OnboardingChecklist";
import { readApi } from "@/lib/operations";
import { isOn, useBusiness, type Business } from "@/lib/business";
import {
  BUSINESS_TIME_ZONE,
  businessDay,
  clockTime,
  onAgenda,
  useAgenda,
  type AgendaAppointment,
} from "@/lib/appointments";
import { PAYMENT, type SaleSummary } from "@/components/dashboard/SalesView";
import { useCurrency } from "@/hooks/useCurrency";
import type { Schema } from "@/lib/api-types";

/** What `GET /dashboard/overview` answers. */
export type Overview = Schema<"Overview">;

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

/** Something waiting on the Owner, and where it is done. */
interface Waiting {
  label: string;
  count: number;
  href: string;
}

function waitingOn(overview: Overview, business: Business | undefined): Waiting[] {
  const selling = isOn(business, "selling");
  return [
    { label: "Aprobaciones", count: overview.pending_approvals, href: "/dashboard/approvals" },
    {
      label: "Clientes que te pasó el bot",
      count: overview.handed_over,
      href: "/dashboard/automation",
    },
    ...(selling
      ? [
          {
            label: "Pedidos por cobrar",
            count: overview.orders_to_collect,
            href: "/dashboard/orders?estado=placed",
          },
          {
            label: "Pedidos por entregar",
            count: overview.orders_to_deliver,
            href: "/dashboard/orders?estado=paid",
          },
        ]
      : []),
  ].filter((item) => item.count > 0);
}

/** How many chats the bot answered today, and whether the number is made up. */
interface BotChats {
  count: number;
  sample: boolean;
}

/**
 * The chats the bot answered today. The API does not count them yet: until it does,
 * development shows a made-up number, marked as such, and production says "Pronto".
 */
function botChatsToday(overview: Overview): BotChats | null {
  const counted = (overview as Overview & { bot_chats_today?: number }).bot_chats_today;
  if (typeof counted === "number") return { count: counted, sample: false };
  return process.env.NODE_ENV === "development" ? { count: 12, sample: true } : null;
}

/** A made-up number shown in development, so nobody takes it for a real one. */
function SampleMark({ chats }: { chats: BotChats | null }) {
  if (!chats?.sample) return null;
  return (
    <span className="ml-1.5 inline-block border border-current px-1 align-middle font-body text-[10px] font-bold uppercase tracking-wide">
      ejemplo
    </span>
  );
}

const WRITTEN_DAY = new Intl.DateTimeFormat("es-BO", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: BUSINESS_TIME_ZONE,
});

/** "Sábado 27 de septiembre", as the page of the day is headed. */
function writtenDay(now: Date): string {
  const text = WRITTEN_DAY.format(now).replace(",", "");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

const CLOCK = new Intl.DateTimeFormat("es-BO", {
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: BUSINESS_TIME_ZONE,
});

const NUMBER = new Intl.NumberFormat("es-BO");

/** A section of the notebook, marked by its colored divider in the margin. */
function Section({
  label,
  tab,
  children,
}: {
  label: string;
  tab: string;
  children: React.ReactNode;
}) {
  return (
    <section aria-label={label} className="relative mt-8">
      <div
        aria-hidden
        className={`absolute -left-[58px] top-0 bottom-0 flex w-9 items-center justify-center ${tab}`}
      >
        <span className="rotate-180 font-display text-[13px] font-black uppercase tracking-[0.14em] [font-stretch:85%] [writing-mode:vertical-rl]">
          {label}
        </span>
      </div>
      {children}
    </section>
  );
}

function SubHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mt-6 mb-1 font-display text-xs font-extrabold uppercase tracking-[0.14em] text-ink-muted">
      {children}
    </h3>
  );
}

/** What waits on the Owner, pasted over the margin like the cover of the day. */
function WaitingPlane({
  waiting,
  lineConnected,
  botChats,
}: {
  waiting: Waiting[];
  lineConnected: boolean;
  botChats: BotChats | null;
}) {
  const total = waiting.reduce((sum, item) => sum + item.count, 0);

  if (total === 0) {
    return (
      <div className="chakana paste -ml-11 mt-5 bg-settled px-4 pt-6 pb-2 text-white">
        <Check aria-hidden size={52} strokeWidth={3} />
        <h2 className="mt-2 mb-3 font-display text-xl font-extrabold leading-tight [font-stretch:85%]">
          {lineConnected ? "Todo en orden. El bot se encarga." : "Nada te espera por ahora."}
        </h2>
        <Link
          href="/dashboard/automation"
          className="flex items-center justify-between border-t-2 border-white/30 py-3 text-[15px] font-bold"
        >
          <span>
            {botChats === null ? "Ver las conversaciones" : `${botChats.count} chats atendidos hoy`}
            <SampleMark chats={botChats} />
          </span>
          <ArrowRight aria-hidden size={18} />
        </Link>
      </div>
    );
  }

  return (
    <div className="chakana paste -ml-11 mt-5 bg-waiting px-4 pt-6 pb-2 text-white">
      <h2>
        <span className="block font-display text-[58px] font-black leading-[0.85] [font-stretch:72%]">
          {total}
        </span>
        <span className="mt-1.5 mb-3 block font-display text-xl font-extrabold [font-stretch:85%]">
          {total === 1 ? "cosa te espera" : "cosas te esperan"}
        </span>
      </h2>
      <ul>
        {waiting.map((item) => (
          <li key={item.label}>
            <Link
              href={item.href}
              className="flex items-center justify-between gap-3 border-t-2 border-white/30 py-3 text-[15px] font-bold transition-colors hover:bg-white/10"
            >
              <span>{item.label}</span>
              <span className="flex items-center gap-1.5">
                <span className="font-display text-[22px] font-black [font-stretch:80%]">
                  {item.count}
                </span>
                <ArrowRight aria-hidden size={18} />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** One plane of Hoy: a figure written by hand on its color. */
function Figure({
  label,
  value,
  note,
  tone,
  mark,
  children,
}: {
  label: string;
  value: string;
  note: string;
  tone: string;
  mark?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className={`chakana px-3 pt-4 pb-3 ${tone}`}>
      <p className="font-display text-[11px] font-extrabold uppercase tracking-[0.1em]">
        {label}
        {mark}
      </p>
      <p className="mt-2 font-hand text-[28px] font-bold leading-none max-[359px]:text-[22px]">
        {/* "Bs 12.480,00" may break after "Bs", never inside the amount. */}
        {value.replace(/\u00a0/g, " ")}
      </p>
      <p className="mt-1 text-xs font-bold">{note}</p>
      {children}
    </div>
  );
}

type DaySales = Overview["sales_by_day"][number];

const SHORT_DAY = new Intl.DateTimeFormat("es-BO", {
  timeZone: "UTC",
  weekday: "short",
  day: "numeric",
  month: "short",
});

/** "sáb 26 sept" for a YYYY-MM-DD day. */
function shortDay(day: string): string {
  return SHORT_DAY.format(new Date(`${day}T00:00:00Z`)).replace(/[.,]/g, "");
}

/**
 * The last 30 days of sales as bars, today the ink one at the end. Touching or pointing at
 * the strip, or the arrows once it has focus, says one day's total in place of the legend.
 */
function SalesBars({ days, format }: { days: DaySales[]; format: (amount: number) => string }) {
  const [chosen, setChosen] = useState<number | null>(null);
  if (days.length === 0) return null;
  const highest = Math.max(...days.map((day) => Number(day.total)), 1);
  const best = days.reduce((top, day) => (Number(day.total) > Number(top.total) ? day : top), days[0]);
  const pick = (event: React.PointerEvent<HTMLDivElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    const at = Math.floor(((event.clientX - box.left) / box.width) * days.length);
    setChosen(Math.min(days.length - 1, Math.max(0, at)));
  };
  const shown = chosen === null ? null : days[chosen];
  const said = shown ?? days[days.length - 1];
  return (
    <div className="mt-3">
      <div
        role="slider"
        tabIndex={0}
        aria-label="Ventas de los últimos 30 días"
        aria-valuemin={0}
        aria-valuemax={days.length - 1}
        aria-valuenow={chosen ?? days.length - 1}
        aria-valuetext={`${shortDay(said.day)}: ${format(Number(said.total))}`}
        onPointerDown={pick}
        onPointerMove={(event) => {
          if (event.pointerType === "mouse" || event.buttons > 0) pick(event);
        }}
        onPointerLeave={() => setChosen(null)}
        onBlur={() => setChosen(null)}
        onKeyDown={(event) => {
          const from = chosen ?? days.length - 1;
          if (event.key === "ArrowLeft") setChosen(Math.max(0, from - 1));
          else if (event.key === "ArrowRight") setChosen(Math.min(days.length - 1, from + 1));
          else return;
          event.preventDefault();
        }}
        className="flex h-12 cursor-crosshair touch-none items-end gap-px outline-none focus-visible:ring-2 focus-visible:ring-ink"
      >
        {days.map((day, index) => {
          const today = index === days.length - 1;
          const empty = Number(day.total) === 0;
          return (
            <span
              key={day.day}
              aria-hidden
              style={{ height: empty ? "2px" : `${Math.max(6, (Number(day.total) / highest) * 100)}%` }}
              className={`flex-1 ${
                chosen === index || (today && chosen === null)
                  ? "bg-ink"
                  : empty
                    ? "bg-ink/15"
                    : "bg-ink/35"
              }`}
            />
          );
        })}
      </div>
      <p className="mt-1.5 flex justify-between gap-2 text-[11px] font-bold leading-tight">
        {shown ? (
          <span>
            {shortDay(shown.day)} · {format(Number(shown.total))}
            {shown.sales > 0 && ` · ${shown.sales} ${shown.sales === 1 ? "venta" : "ventas"}`}
          </span>
        ) : Number(best.total) > 0 ? (
          <span>Mejor día: {shortDay(best.day)} · {format(Number(best.total))}</span>
        ) : (
          <span>30 días sin ventas</span>
        )}
        {!shown && <span>Hoy</span>}
      </p>
    </div>
  );
}

function Row({ children, muted }: { children: React.ReactNode; muted?: boolean }) {
  return (
    <li
      className={`flex min-h-[42px] items-center gap-3 border-b border-paper-rule py-2 text-[15px] ${
        muted ? "text-ink-muted" : ""
      }`}
    >
      {children}
    </li>
  );
}

/** Today's Appointments, the next one standing out and the ones gone by muted. */
function TodaysAppointments() {
  const today = businessDay(new Date());
  const agenda = useAgenda(today, today);
  const now = CLOCK.format(new Date());
  const appointments = (agenda.data ?? [])
    .filter((appointment: AgendaAppointment) => onAgenda(appointment))
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  const next = appointments.find(
    (appointment) =>
      appointment.status !== "attended" &&
      appointment.status !== "no_show" &&
      clockTime(appointment.ends_at) > now,
  );

  return (
    <div>
      <SubHeading>Citas de hoy</SubHeading>
      {agenda.isLoading ? (
        <div className="h-24 animate-pulse bg-paper-rule/40" />
      ) : agenda.isError ? (
        <p className="py-2 text-sm text-waiting">No se pudieron cargar las citas.</p>
      ) : appointments.length === 0 ? (
        <p className="border-b border-paper-rule py-2.5 text-[15px] text-ink-muted">
          No hay citas hoy.
        </p>
      ) : (
        <ul>
          {appointments.map((appointment) => {
            const isNext = appointment === next;
            const gone = !isNext && clockTime(appointment.ends_at) <= now;
            return (
              <Row key={appointment.appointment_code} muted={gone}>
                <span className={`w-10 text-xs tabular-nums ${isNext ? "font-extrabold" : "text-ink-muted"}`}>
                  {clockTime(appointment.starts_at)}
                </span>
                <span className={`min-w-0 flex-1 ${isNext ? "font-extrabold" : ""}`}>
                  <span className="block truncate">{appointment.customer}</span>
                  <span className="block truncate text-xs font-normal text-ink-muted">
                    {appointment.service}
                  </span>
                </span>
                {isNext && (
                  <span className="bg-ink px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-[0.06em] text-paper">
                    Próxima
                  </span>
                )}
              </Row>
            );
          })}
        </ul>
      )}
      <Link href="/dashboard/agenda" className="inline-flex items-center gap-1 py-2.5 text-sm font-extrabold text-steps">
        Ver la agenda <ArrowRight aria-hidden size={15} />
      </Link>
    </div>
  );
}

/** The last Sales of today, written as lines of the notebook. */
function TodaysSales({ salesToday }: { salesToday: number }) {
  const { format } = useCurrency();
  const today = businessDay(new Date());
  const sales = useQuery({
    queryKey: ["sales"],
    queryFn: () => readApi<SaleSummary[]>("/dashboard/sales"),
  });
  const ofToday = (sales.data ?? [])
    .filter((sale) => sale.status === "registered" && businessDay(new Date(sale.created_at)) === today)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));

  return (
    <div>
      <SubHeading>Últimas ventas</SubHeading>
      {sales.isLoading ? (
        <div className="h-24 animate-pulse bg-paper-rule/40" />
      ) : sales.isError ? (
        <p className="py-2 text-sm text-waiting">No se pudieron cargar las ventas.</p>
      ) : ofToday.length === 0 ? (
        <p className="border-b border-paper-rule py-2.5 text-[15px] text-ink-muted">
          Todavía no hay ventas hoy.
        </p>
      ) : (
        <ul>
          {ofToday.slice(0, 3).map((sale) => (
            <Row key={sale.code}>
              <span className="w-10 text-xs tabular-nums text-ink-muted">
                {CLOCK.format(new Date(sale.created_at))}
              </span>
              <Link href={`/dashboard/sales/${sale.code}`} className="min-w-0 flex-1 hover:underline">
                <span className="block truncate">{sale.customer_name ?? "Sin cliente"}</span>
                {sale.payment_method && (
                  <span className="block text-xs text-ink-muted">{PAYMENT[sale.payment_method]}</span>
                )}
              </Link>
              <span className="whitespace-nowrap font-hand text-[19px] font-bold text-steps">
                {format(Number(sale.total))}
              </span>
            </Row>
          ))}
        </ul>
      )}
      {salesToday > 0 && (
        <Link href="/dashboard/sales" className="inline-flex items-center gap-1 py-2.5 text-sm font-extrabold text-steps">
          {salesToday === 1 ? "Ver la venta" : `Ver las ${salesToday} ventas`}{" "}
          <ArrowRight aria-hidden size={15} />
        </Link>
      )}
    </div>
  );
}

/** How much of a monthly allowance is spent, as a bar drawn in the notebook. */
function Allowance({
  label,
  used,
  allowed,
  near,
  over,
}: {
  label: string;
  used: number;
  allowed: number;
  near: string;
  over: string;
}) {
  const share = allowed > 0 ? used / allowed : 0;
  const says = share >= 1 ? over : share >= 0.8 ? near : null;
  return (
    <div className="border-b border-paper-rule py-3">
      <div className="flex items-baseline justify-between gap-3 text-[15px]">
        <span>{label}</span>
        <span className="whitespace-nowrap font-hand text-[19px] font-bold text-steps">
          {NUMBER.format(used)} / {NUMBER.format(allowed)}
        </span>
      </div>
      <div
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={allowed}
        aria-valuenow={Math.min(used, allowed)}
        className="mt-1.5 h-3 border-[1.5px] border-ink bg-paper"
      >
        <div
          className={`h-full ${share >= 1 ? "bg-waiting" : "bg-money"}`}
          style={{ width: `${Math.min(share, 1) * 100}%` }}
        />
      </div>
      {says && <p className="mt-1 font-hand text-[15px] font-bold leading-tight text-waiting">{says}</p>}
    </div>
  );
}

function Skeleton() {
  return (
    <div aria-busy className="flex flex-col gap-5 pt-5">
      <span className="sr-only">Cargando Inicio…</span>
      <div className="chakana -ml-11 h-56 animate-pulse bg-paper-rule/60" />
      <div className="grid grid-cols-2 gap-2">
        <div className="chakana h-28 animate-pulse bg-paper-rule/50" />
        <div className="chakana h-28 animate-pulse bg-paper-rule/50" />
      </div>
      <div className="h-32 animate-pulse bg-paper-rule/40" />
    </div>
  );
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
  const businessKnown = Boolean(business || businessUnknown);
  // Without the Business, the steps that follow a switch are left out, not the checklist.
  const steps = overview && businessKnown ? firstSteps(overview.onboarding, business) : [];
  const botChats = overview ? botChatsToday(overview) : null;

  return (
    <div className="relative -mx-4 -my-6 min-h-full pb-8 pl-[58px] pr-3.5 pt-5 sm:-mx-6 lg:mx-0">
      <div aria-hidden className="absolute top-0 bottom-0 left-[46px] w-0.5 bg-waiting" />
      <div className="max-w-[46rem]">
        <header>
          <h1 className="font-hand text-[22px] font-bold leading-tight text-steps">
            {writtenDay(new Date())}
          </h1>
          {business && <p className="text-sm font-semibold text-ink-muted">{business.name}</p>}
        </header>

        {query.isLoading ? (
          <Skeleton />
        ) : !overview ? (
          <div role="alert" className="mt-6 border-y-2 border-waiting py-4">
            <p className="font-display text-lg font-extrabold text-waiting [font-stretch:85%]">
              No pudimos abrir tu página de hoy.
            </p>
            <p className="mt-1 text-sm text-ink-muted">
              {query.error instanceof Error ? query.error.message : "Revisa tu conexión."}
            </p>
            <button
              type="button"
              onClick={() => query.refetch()}
              className="mt-3 bg-ink px-4 py-2 text-sm font-bold text-paper hover:bg-steps"
            >
              Reintentar
            </button>
          </div>
        ) : (
          <>
            <WaitingPlane
              waiting={waitingOn(overview, business)}
              lineConnected={overview.onboarding.line_connected}
              botChats={botChats}
            />

            {steps.some((step) => !step.done) && <OnboardingChecklist steps={steps} />}

            <Section label="Hoy" tab="bg-money text-ink">
              <div className="grid grid-cols-2 gap-2">
                <Figure
                  label="Vendido hoy"
                  value={format(Number(overview.sold_today))}
                  note={
                    overview.sales_today === 0
                      ? "Sin ventas todavía"
                      : `${overview.sales_today} ${overview.sales_today === 1 ? "venta" : "ventas"}`
                  }
                  tone="bg-money text-ink"
                >
                  <SalesBars days={overview.sales_by_day ?? []} format={format} />
                </Figure>
                <Figure
                  label="El bot"
                  value={botChats === null ? "Pronto" : `${botChats.count} chats`}
                  mark={<SampleMark chats={botChats} />}
                  note={botChats === null ? "Contará los chats que atiende" : "atendidos hoy"}
                  tone="bg-settled text-white"
                />
              </div>
              <div className="lg:grid lg:grid-cols-2 lg:gap-8">
                {isOn(business, "booking") && <TodaysAppointments />}
                <TodaysSales salesToday={overview.sales_today} />
              </div>
            </Section>

            <Section label="Mes" tab="bg-month text-white">
              <Allowance
                label="Mensajes de WhatsApp"
                used={overview.messages_this_month}
                allowed={overview.free_messages_per_month}
                near="Cerca del límite gratis"
                over="Pasaste los gratis: Meta cobra los siguientes"
              />
              <Allowance
                label="Minutos de llamadas"
                used={overview.call_minutes_this_month}
                allowed={overview.call_minutes_per_month}
                near="Quedan pocos minutos"
                over="Se acabaron: las llamadas vuelven el 1 del próximo mes"
              />
            </Section>
          </>
        )}
      </div>
    </div>
  );
}

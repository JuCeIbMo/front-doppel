"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  BookOpen,
  Activity,
  Settings,
  LogOut,
  ClipboardList,
  ShieldCheck,
  MessageSquareText,
  MessagesSquare,
  Menu,
  X,
  Scissors,
  CalendarClock,
  CalendarDays,
} from "lucide-react";
import { signOut } from "@/lib/supabase";
import { readApi } from "@/lib/operations";
import type { Schema } from "@/lib/api-types";
import { isOn, useBusiness, type BusinessSwitch } from "@/lib/business";
import { useRequireAuth } from "@/hooks/useRequireAuth";

type Overview = Schema<"Overview">;

/** What waits on a screen, counted from the overview; shown next to its link. */
type Waiting = "conversations" | "approvals";

type NavLink = {
  href: string;
  label: string;
  icon: React.ElementType;
  /** Shown while the Business has any of these switches on. */
  needs?: BusinessSwitch[];
  waiting?: Waiting;
};

/** The panel's screens in the three groups of the spec: the day, the setup and the record. */
const GROUPS: { title: string; links: NavLink[] }[] = [
  {
    title: "Día a día",
    links: [
      { href: "/dashboard", label: "Inicio", icon: LayoutDashboard },
      {
        href: "/dashboard/automation",
        label: "Conversaciones",
        icon: MessagesSquare,
        waiting: "conversations",
      },
      { href: "/dashboard/orders", label: "Pedidos", icon: ClipboardList, needs: ["selling"] },
      {
        href: "/dashboard/sales",
        label: "Ventas",
        icon: ShoppingCart,
        needs: ["selling", "booking"],
      },
      { href: "/dashboard/agenda", label: "Agenda", icon: CalendarDays, needs: ["booking"] },
      {
        href: "/dashboard/approvals",
        label: "Aprobaciones",
        icon: ShieldCheck,
        waiting: "approvals",
      },
    ],
  },
  {
    title: "Configuración",
    links: [
      { href: "/dashboard/products", label: "Productos", icon: Package, needs: ["selling"] },
      { href: "/dashboard/services", label: "Servicios", icon: Scissors, needs: ["booking"] },
      { href: "/dashboard/hours", label: "Horarios", icon: CalendarClock, needs: ["booking"] },
      { href: "/dashboard/knowledge", label: "El bot", icon: BookOpen },
      { href: "/dashboard/templates", label: "Plantillas", icon: MessageSquareText },
    ],
  },
  {
    title: "Control",
    links: [
      { href: "/dashboard/activity", label: "Bitácora", icon: Activity },
      { href: "/dashboard/settings", label: "Cuenta", icon: Settings },
    ],
  },
];

const ALL_LINKS = GROUPS.flatMap((group) => group.links);

/**
 * The tabs a phone keeps at the bottom, by what the Business does: Pedidos for one that
 * sells, Agenda for one that books, both for one that does both, and then Aprobaciones
 * moves into "Más" (its count still shows on Inicio and on "Más").
 */
function barHrefs(selling: boolean, booking: boolean): string[] {
  const work = [selling && "/dashboard/orders", booking && "/dashboard/agenda"].filter(
    (href): href is string => Boolean(href),
  );
  const tail = work.length === 2 ? [] : ["/dashboard/approvals"];
  return ["/dashboard", "/dashboard/automation", ...work, ...tail];
}

const SHORT: Record<string, string> = {
  "/dashboard/automation": "Chats",
  "/dashboard/approvals": "Aprobar",
};

/**
 * The links a Business may use. Those behind a switch wait until the Business is known,
 * and all show when it cannot be read: a failed read must not take screens away.
 */
function useOffered(links: NavLink[]): NavLink[] {
  const { data: business, isError } = useBusiness();
  return links.filter(
    (link) => !link.needs || isError || link.needs.some((kind) => isOn(business, kind)),
  );
}

/** How many things wait on each screen, from the same overview Inicio polls. */
function useWaiting(): Record<Waiting, number> {
  const { data } = useQuery({
    queryKey: ["overview"],
    queryFn: () => readApi<Overview>("/dashboard/overview"),
    refetchInterval: 30000,
  });
  return {
    conversations: data?.handed_over ?? 0,
    approvals: data?.pending_approvals ?? 0,
  };
}

function isActiveLink(pathname: string, href: string) {
  return pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
}

/** A red count: something there waits on the Owner. Red means that and nothing else. */
function Count({ value, className = "" }: { value: number; className?: string }) {
  if (value <= 0) return null;
  return (
    <span
      className={`inline-flex min-w-5 items-center justify-center bg-waiting px-1 font-display text-[11px] font-black leading-5 text-paper tabular-nums ${className}`}
    >
      {value > 99 ? "99+" : value}
    </span>
  );
}

function NavItem({
  link,
  active,
  count,
  onNavigate,
}: {
  link: NavLink;
  active: boolean;
  count: number;
  onNavigate?: () => void;
}) {
  const Icon = link.icon;
  return (
    <Link
      href={link.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={`flex min-h-11 items-center gap-3 px-3 text-[15px] transition-colors ${
        active
          ? "bg-ink font-bold text-paper"
          : "text-ink hover:bg-ink/[0.07]"
      }`}
    >
      <Icon aria-hidden size={18} strokeWidth={active ? 2.25 : 1.75} />
      <span className="flex-1">{link.label}</span>
      <Count value={count} />
      {count > 0 && <span className="sr-only">pendientes</span>}
    </Link>
  );
}

/** Every screen the Business uses, under its group's name. */
function NavLinks({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  const offered = useOffered(ALL_LINKS);
  const waiting = useWaiting();
  return (
    <>
      {GROUPS.map((group) => {
        const links = group.links.filter((link) => offered.includes(link));
        if (links.length === 0) return null;
        return (
          <div key={group.title} className="mb-5">
            <p className="mb-1.5 px-3 font-display text-[11px] font-extrabold uppercase tracking-[0.16em] text-ink-muted">
              {group.title}
            </p>
            <div className="flex flex-col gap-px">
              {links.map((link) => (
                <NavItem
                  key={link.href}
                  link={link}
                  active={isActiveLink(pathname, link.href)}
                  count={link.waiting ? waiting[link.waiting] : 0}
                  onNavigate={onNavigate}
                />
              ))}
            </div>
          </div>
        );
      })}
    </>
  );
}

function MobileNav({ pathname, onLogout }: { pathname: string; onLogout: () => void }) {
  const [open, setOpen] = useState(false);
  const { data: business, isError } = useBusiness();
  const waiting = useWaiting();
  const selling = isError || isOn(business, "selling");
  const booking = isError || isOn(business, "booking");
  const hrefs = barHrefs(selling, booking);
  const barLinks = hrefs.flatMap((href) => ALL_LINKS.filter((link) => link.href === href));
  // What waits behind "Más": Aprobaciones when it left the bar.
  const hiddenWaiting = hrefs.includes("/dashboard/approvals") ? 0 : waiting.approvals;
  const inMore = !hrefs.some((href) => isActiveLink(pathname, href));
  const close = () => setOpen(false);

  return (
    <>
      <nav
        aria-label="Principal"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 flex border-t-2 border-ink bg-paper pb-[env(safe-area-inset-bottom)]"
      >
        {barLinks.map((link) => {
          const Icon = link.icon;
          const active = isActiveLink(pathname, link.href);
          const count = link.waiting ? waiting[link.waiting] : 0;
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={active ? "page" : undefined}
              className={`relative flex min-h-14 flex-1 flex-col items-center justify-center gap-1 pb-2 pt-2.5 text-[11px] transition-colors ${
                active ? "bg-ink font-bold text-paper" : "text-ink"
              }`}
            >
              <Icon aria-hidden size={20} strokeWidth={active ? 2.25 : 1.75} />
              <span>{SHORT[link.href] ?? link.label}</span>
              <Count value={count} className="absolute right-[calc(50%-22px)] top-1" />
              {count > 0 && <span className="sr-only">, {count} pendientes</span>}
            </Link>
          );
        })}
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen(true)}
          className={`relative flex min-h-14 flex-1 flex-col items-center justify-center gap-1 pb-2 pt-2.5 text-[11px] transition-colors ${
            inMore ? "bg-ink font-bold text-paper" : "text-ink"
          }`}
        >
          <Menu aria-hidden size={20} strokeWidth={1.75} />
          <span>Más</span>
          <Count value={hiddenWaiting} className="absolute right-[calc(50%-22px)] top-1" />
          {hiddenWaiting > 0 && <span className="sr-only">, {hiddenWaiting} pendientes</span>}
        </button>
      </nav>

      {open && (
        <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end">
          <button
            type="button"
            aria-label="Cerrar menú"
            onClick={close}
            className="absolute inset-0 bg-ink/50"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Menú"
            onKeyDown={(event) => {
              if (event.key === "Escape") close();
            }}
            className="chakana paste relative max-h-[85vh] overflow-y-auto border-t-2 border-ink bg-paper px-3 pb-8 pt-6"
          >
            <div className="flex items-center justify-between px-3 pb-4">
              <span className="font-display text-2xl font-black [font-stretch:78%]">Menú</span>
              <button
                type="button"
                aria-label="Cerrar"
                autoFocus
                onClick={close}
                className="flex h-11 w-11 items-center justify-center text-ink"
              >
                <X size={22} />
              </button>
            </div>
            <nav aria-label="Todas las pantallas">
              <NavLinks pathname={pathname} onNavigate={close} />
              <button
                type="button"
                onClick={onLogout}
                className="flex min-h-11 w-full items-center gap-3 border-t border-paper-rule px-3 pt-2 text-[15px] text-ink-muted hover:text-ink"
              >
                <LogOut aria-hidden size={18} strokeWidth={1.75} />
                <span>Cerrar sesión</span>
              </button>
            </nav>
          </div>
        </div>
      )}
    </>
  );
}

/** The wordmark: the product's name in the notebook's heavy hand, with its yellow mark. */
function Wordmark() {
  return (
    <Link href="/dashboard" className="flex items-center gap-2" aria-label="Doppel, ir a Inicio">
      <span aria-hidden className="h-3.5 w-3.5 bg-money" />
      <span className="font-display text-[22px] font-black leading-none tracking-tight [font-stretch:78%]">
        Doppel
      </span>
    </Link>
  );
}

export function OwnerShell({ children }: { children: React.ReactNode }) {
  useRequireAuth();
  const pathname = usePathname();
  const router = useRouter();
  const { data: business } = useBusiness();
  async function handleLogout() {
    await signOut();
    router.replace("/");
  }

  return (
    <div className="theme-paper min-h-screen bg-bg-primary text-text-primary">
      <div className="flex min-h-screen w-full flex-col lg:flex-row">
        {/* Sidebar: the notebook's cover flap, always open on a computer. */}
        <aside className="hidden lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-64 lg:flex-shrink-0 lg:flex-col border-r-2 border-ink bg-bg-elevated">
          <div className="px-6 pb-5 pt-6">
            <Wordmark />
            {business?.name && (
              <p className="mt-2 truncate text-sm font-semibold text-ink-muted">{business.name}</p>
            )}
          </div>

          <nav aria-label="Principal" className="flex-1 overflow-y-auto px-3">
            <NavLinks pathname={pathname} />
          </nav>

          <div className="border-t border-paper-rule px-3 py-3">
            <button
              type="button"
              onClick={handleLogout}
              className="flex min-h-11 w-full items-center gap-3 px-3 text-[15px] text-ink-muted transition-colors hover:bg-ink/[0.07] hover:text-ink"
            >
              <LogOut aria-hidden size={18} strokeWidth={1.75} />
              <span>Cerrar sesión</span>
            </button>
          </div>
        </aside>

        {/* Top bar: phones only */}
        <header className="lg:hidden flex items-center justify-between gap-3 border-b-2 border-ink bg-paper px-4 py-3">
          <Wordmark />
          {business?.name && (
            <span className="truncate text-sm font-semibold text-ink-muted">{business.name}</span>
          )}
        </header>

        <main className="min-w-0 flex-1 px-4 py-6 pb-24 sm:px-6 lg:px-10 lg:py-8 lg:pb-10">
          <div className="mx-auto w-full max-w-[1180px]">{children}</div>
        </main>

        <MobileNav pathname={pathname} onLogout={handleLogout} />
      </div>
    </div>
  );
}

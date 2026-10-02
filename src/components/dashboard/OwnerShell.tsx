"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
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
import { isOn, useBusiness, workTitle, type BusinessSwitch } from "@/lib/business";
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
  /** The name on the phone's bottom bar, when the full one does not fit. */
  short?: string;
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
      {
        href: "/dashboard/orders",
        label: "Pedidos",
        icon: ClipboardList,
        needs: ["selling", "booking"],
      },
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
 * The tabs a phone keeps at the bottom, by what the Business does: Pedidos (y citas) for
 * any, and Agenda too for one that books, when Aprobaciones moves into "Más" (its count
 * still shows on Inicio and on "Más", and those about Orders and Appointments on Pedidos).
 */
function barHrefs(selling: boolean, booking: boolean): string[] {
  const work = [(selling || booking) && "/dashboard/orders", booking && "/dashboard/agenda"].filter(
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
  const selling = isError || isOn(business, "selling");
  const booking = isError || isOn(business, "booking");
  return links
    .filter((link) => !link.needs || isError || link.needs.some((kind) => isOn(business, kind)))
    .map((link) =>
      link.href === "/dashboard/orders"
        ? { ...link, label: workTitle(selling, booking), short: selling ? "Pedidos" : "Citas" }
        : link,
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

/** The notebook's own ease: a quick start that settles slowly, as paper does. */
const SETTLE = [0.16, 1, 0.3, 1] as const;

/** The ink block behind the active link travels to the next one instead of jumping. */
const INK_TRAVEL = { duration: 0.32, ease: SETTLE };

type Turn = "forward" | "back";

/**
 * Which way the notebook turns between two screens: by their order in the menu, and
 * within one screen, deeper (a detail, a new item) is forward and shallower is back.
 */
function turnBetween(from: string, to: string): Turn {
  const place = (path: string) => ALL_LINKS.findIndex((link) => isActiveLink(path, link.href));
  const [a, b] = [place(from), place(to)];
  if (a !== b) return b > a ? "forward" : "back";
  return to.split("/").length >= from.split("/").length ? "forward" : "back";
}

/** Each screen comes in as the next page turned; the first one is already open. */
function PageTurn({ pathname, children }: { pathname: string; children: React.ReactNode }) {
  const [turn, setTurn] = useState<{ path: string; way?: Turn }>({
    path: pathname,
  });
  if (turn.path !== pathname) {
    setTurn({ path: pathname, way: turnBetween(turn.path, pathname) });
  }
  return (
    <div key={turn.path} data-turn={turn.way} className="turn mx-auto w-full max-w-[1180px]">
      {children}
    </div>
  );
}

/** A red count: something there waits on the Owner. Red means that and nothing else. */
function Count({ value, className = "" }: { value: number; className?: string }) {
  if (value <= 0) return null;
  return (
    <span
      key={value}
      className={`stamp inline-flex min-w-5 items-center justify-center bg-waiting px-1 font-display text-[11px] font-black leading-5 text-paper tabular-nums ${className}`}
    >
      {value > 99 ? "99+" : value}
    </span>
  );
}

function NavItem({
  link,
  active,
  count,
  marker,
  onNavigate,
}: {
  link: NavLink;
  active: boolean;
  count: number;
  /** Names the ink block of this list, so it travels only within it. */
  marker: string;
  onNavigate?: () => void;
}) {
  const Icon = link.icon;
  return (
    <Link
      href={link.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={`relative flex min-h-11 items-center gap-3 px-3 text-[15px] transition-colors duration-300 ${
        active ? "font-bold text-paper" : "text-ink hover:bg-ink/[0.07] active:bg-ink/15"
      }`}
    >
      {active && (
        <motion.span
          aria-hidden
          layoutId={marker}
          transition={INK_TRAVEL}
          className="absolute inset-0 -z-10 bg-ink"
        />
      )}
      <Icon aria-hidden size={18} strokeWidth={active ? 2.25 : 1.75} />
      <span className="flex-1">{link.label}</span>
      <Count value={count} />
      {count > 0 && <span className="sr-only">pendientes</span>}
    </Link>
  );
}

/** Every screen the Business uses, under its group's name. */
function NavLinks({
  pathname,
  marker,
  onNavigate,
}: {
  pathname: string;
  marker: string;
  onNavigate?: () => void;
}) {
  const offered = useOffered(ALL_LINKS);
  const waiting = useWaiting();
  return (
    <>
      {GROUPS.map((group) => {
        // By href: the offered Orders link is a renamed copy, not the one in the group.
        const links = offered.filter((link) => group.links.some((own) => own.href === link.href));
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
                  marker={marker}
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
  const offered = useOffered(ALL_LINKS);
  const barLinks = hrefs.flatMap((href) => offered.filter((link) => link.href === href));
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
              className={`relative flex min-h-14 flex-1 flex-col items-center justify-center gap-1 pb-2 pt-2.5 text-[11px] transition-colors duration-300 ${
                active ? "font-bold text-paper" : "text-ink active:bg-ink/10"
              }`}
            >
              {active && (
                <motion.span
                  aria-hidden
                  layoutId="bar-ink"
                  transition={INK_TRAVEL}
                  className="absolute inset-0 -z-10 bg-ink"
                />
              )}
              <Icon aria-hidden size={20} strokeWidth={active ? 2.25 : 1.75} />
              <span>{link.short ?? SHORT[link.href] ?? link.label}</span>
              <Count value={count} className="absolute right-[calc(50%-22px)] top-1" />
              {count > 0 && <span className="sr-only">, {count} pendientes</span>}
            </Link>
          );
        })}
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen(true)}
          className={`relative flex min-h-14 flex-1 flex-col items-center justify-center gap-1 pb-2 pt-2.5 text-[11px] transition-colors duration-300 ${
            inMore ? "font-bold text-paper" : "text-ink active:bg-ink/10"
          }`}
        >
          {inMore && (
            <motion.span
              aria-hidden
              layoutId="bar-ink"
              transition={INK_TRAVEL}
              className="absolute inset-0 -z-10 bg-ink"
            />
          )}
          <Menu aria-hidden size={20} strokeWidth={1.75} />
          <span>Más</span>
          <Count value={hiddenWaiting} className="absolute right-[calc(50%-22px)] top-1" />
          {hiddenWaiting > 0 && <span className="sr-only">, {hiddenWaiting} pendientes</span>}
        </button>
      </nav>

      <AnimatePresence>
        {open && (
          <div key="menu" className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end">
            <motion.button
              type="button"
              aria-label="Cerrar menú"
              onClick={close}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, transition: { duration: 0.24 } }}
              exit={{ opacity: 0, transition: { duration: 0.18 } }}
              className="absolute inset-0 bg-ink/50"
            />
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="Menú"
              onKeyDown={(event) => {
                if (event.key === "Escape") close();
              }}
              initial={{ y: "100%" }}
              animate={{ y: 0, transition: { duration: 0.34, ease: SETTLE } }}
              exit={{
                y: "100%",
                transition: { duration: 0.2, ease: [0.7, 0, 0.84, 0] },
              }}
              className="chakana relative max-h-[85vh] overflow-y-auto border-t-2 border-ink bg-paper px-3 pb-8 pt-6"
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
                <NavLinks pathname={pathname} marker="sheet-ink" onNavigate={close} />
                <button
                  type="button"
                  onClick={onLogout}
                  className="flex min-h-11 w-full items-center gap-3 border-t border-paper-rule px-3 pt-2 text-[15px] text-ink-muted hover:text-ink"
                >
                  <LogOut aria-hidden size={18} strokeWidth={1.75} />
                  <span>Cerrar sesión</span>
                </button>
              </nav>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
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
    <MotionConfig reducedMotion="user">
      <div className="theme-paper min-h-screen bg-bg-primary text-text-primary">
        <div className="flex min-h-screen w-full flex-col lg:flex-row">
          {/* Sidebar: the notebook's cover flap, always open on a computer. */}
          <aside className="hidden lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-64 lg:flex-shrink-0 lg:flex-col border-r-2 border-ink bg-bg-elevated">
            <div className="px-6 pb-5 pt-6">
              <Wordmark />
              {business?.name && (
                <p className="mt-2 truncate text-sm font-semibold text-ink-muted">
                  {business.name}
                </p>
              )}
            </div>

            <nav aria-label="Principal" className="flex-1 overflow-y-auto px-3">
              <NavLinks pathname={pathname} marker="rail-ink" />
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

          <main className="min-w-0 flex-1 overflow-x-clip px-4 py-6 pb-24 sm:px-6 lg:px-10 lg:py-8 lg:pb-10">
            <PageTurn pathname={pathname}>{children}</PageTurn>
          </main>

          <MobileNav pathname={pathname} onLogout={handleLogout} />
        </div>
      </div>
    </MotionConfig>
  );
}

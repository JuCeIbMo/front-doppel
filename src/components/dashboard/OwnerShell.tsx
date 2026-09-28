"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  Package,
  Boxes,
  ShoppingCart,
  Users,
  Wallet,
  BarChart2,
  BookOpen,
  Activity,
  Bot,
  Settings,
  LogOut,
  ClipboardList,
  ShieldCheck,
  MessageSquareText,
  Menu,
  X,
  Scissors,
  CalendarClock,
  CalendarDays,
} from "lucide-react";
import { signOut } from "@/lib/supabase";
import { isFeatureReady, type FeatureName } from "@/lib/features";
import { isOn, useBusiness, type BusinessSwitch } from "@/lib/business";
import { useRequireAuth } from "@/hooks/useRequireAuth";

type NavLink = {
  href: string;
  label: string;
  icon: React.ElementType;
  feature: null | FeatureName;
  /** Shown only while the Business has this switch on. */
  needs?: BusinessSwitch;
};

const coreLinks: NavLink[] = [
  { href: "/dashboard/automation", label: "Automatización", icon: Bot, feature: null },
  {
    href: "/dashboard/orders",
    label: "Pedidos",
    icon: ClipboardList,
    feature: null,
    needs: "selling",
  },
  { href: "/dashboard/templates", label: "Plantillas", icon: MessageSquareText, feature: null },
  { href: "/dashboard/knowledge", label: "Lo que sabe el bot", icon: BookOpen, feature: null },
  { href: "/dashboard/approvals", label: "Aprobaciones", icon: ShieldCheck, feature: null },
  { href: "/dashboard/sales", label: "Ventas", icon: ShoppingCart, feature: null },
  { href: "/dashboard", label: "Inicio", icon: LayoutDashboard, feature: "overview" },
  {
    href: "/dashboard/products",
    label: "Productos",
    icon: Package,
    feature: "products",
    needs: "selling",
  },
  {
    href: "/dashboard/inventory",
    label: "Inventario",
    icon: Boxes,
    feature: "inventory",
    needs: "selling",
  },
  {
    href: "/dashboard/agenda",
    label: "Agenda",
    icon: CalendarDays,
    feature: null,
    needs: "booking",
  },
  {
    href: "/dashboard/services",
    label: "Servicios",
    icon: Scissors,
    feature: null,
    needs: "booking",
  },
  {
    href: "/dashboard/hours",
    label: "Horarios",
    icon: CalendarClock,
    feature: null,
    needs: "booking",
  },
  { href: "/dashboard/clients", label: "Clientes", icon: Users, feature: "clients" },
  { href: "/dashboard/finance", label: "Finanzas", icon: Wallet, feature: "finance" },
];

const toolLinks: NavLink[] = [
  { href: "/dashboard/reports", label: "Reportes", icon: BarChart2, feature: "reports" },
  { href: "/dashboard/activity", label: "Bitácora", icon: Activity, feature: null },
  { href: "/dashboard/settings", label: "Ajustes", icon: Settings, feature: "settings" },
];

/** The screens already redrawn as the paper notebook; the shell turns to paper on them. */
const PAPER_SCREENS = ["/dashboard"];

/**
 * The screens a phone keeps in its bottom bar, in order and under a short name; the rest
 * are under "Más". Pedidos and Agenda share one place: the first the Business has on.
 */
const MOBILE_BAR: { href: string; short: string; slot: string }[] = [
  { href: "/dashboard", short: "Inicio", slot: "inicio" },
  { href: "/dashboard/automation", short: "Chats", slot: "chats" },
  { href: "/dashboard/orders", short: "Pedidos", slot: "work" },
  { href: "/dashboard/agenda", short: "Agenda", slot: "work" },
  { href: "/dashboard/approvals", short: "Aprobar", slot: "approvals" },
];

/**
 * The links a Business may use. Those behind a switch wait until the Business is known,
 * and all show when it cannot be read: a failed read must not take screens away.
 */
function useOffered(links: NavLink[]): NavLink[] {
  const { data: business, isError } = useBusiness();
  return links.filter((link) => !link.needs || isError || isOn(business, link.needs));
}

function isActiveLink(pathname: string, href: string) {
  return pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
}

function NavItem({
  href,
  label,
  icon: Icon,
  feature,
  active,
  onNavigate,
}: NavLink & { active: boolean; onNavigate?: () => void }) {
  const soon = feature !== null && !isFeatureReady(feature);
  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={`flex items-center gap-3 py-2.5 pl-4 pr-4 text-sm transition-colors ${
        active
          ? "bg-accent-dim font-semibold text-text-primary"
          : "text-text-secondary hover:bg-bg-elevated hover:text-text-primary"
      }`}
    >
      <Icon size={16} strokeWidth={1.75} />
      <span>{label}</span>
      {soon && (
        <span className="ml-auto bg-bg-elevated px-1.5 py-0.5 text-[10px] text-text-secondary">
          Pronto
        </span>
      )}
    </Link>
  );
}

/** Every screen, the core ones first and the tools after a separator. */
function NavLinks({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  const core = useOffered(coreLinks);
  const tools = useOffered(toolLinks);
  return (
    <>
      {core.map((link) => (
        <NavItem
          key={link.href}
          {...link}
          active={isActiveLink(pathname, link.href)}
          onNavigate={onNavigate}
        />
      ))}
      <div className="h-px bg-border mx-4 my-2" />
      {tools.map((link) => (
        <NavItem
          key={link.href}
          {...link}
          active={isActiveLink(pathname, link.href)}
          onNavigate={onNavigate}
        />
      ))}
    </>
  );
}

function MobileNav({
  pathname,
  onLogout,
}: {
  pathname: string;
  onLogout: () => void;
}) {
  const [open, setOpen] = useState(false);
  const offered = useOffered(coreLinks);
  const barLinks = MOBILE_BAR.flatMap((place) => {
    const link = offered.find((candidate) => candidate.href === place.href);
    return link ? [{ ...link, short: place.short, slot: place.slot }] : [];
  }).filter((link, index, all) => all.findIndex((other) => other.slot === link.slot) === index);
  const close = () => setOpen(false);

  return (
    <>
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-bg-secondary border-t-2 border-text-primary flex">
        {barLinks.map(({ href, short, icon: Icon }) => {
          const active = isActiveLink(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`flex-1 flex flex-col items-center justify-center gap-1 pt-2.5 pb-2 text-[11px] transition-colors ${
                active
                  ? "font-bold text-text-primary shadow-[inset_0_3px_0_currentColor]"
                  : "text-text-secondary"
              }`}
            >
              <Icon aria-hidden size={20} strokeWidth={active ? 2.25 : 1.75} />
              <span>{short}</span>
            </Link>
          );
        })}
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen(true)}
          className="flex-1 flex flex-col items-center justify-center gap-1 pt-2.5 pb-2 text-[11px] text-text-secondary transition-colors"
        >
          <Menu aria-hidden size={20} strokeWidth={1.75} />
          <span>Más</span>
        </button>
      </nav>

      {open && (
        <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end">
          <button
            type="button"
            aria-label="Cerrar menú"
            onClick={close}
            className="absolute inset-0 bg-black/60"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Menú"
            onKeyDown={(event) => {
              if (event.key === "Escape") close();
            }}
            className="relative max-h-[85vh] overflow-y-auto rounded-t-2xl border-t border-border bg-bg-secondary px-2 pb-6 pt-4"
          >
            <div className="flex items-center justify-between px-4 pb-2">
              <span className="text-sm font-semibold text-text-primary">Menú</span>
              <button
                type="button"
                aria-label="Cerrar"
                autoFocus
                onClick={close}
                className="text-text-secondary hover:text-text-primary"
              >
                <X size={18} />
              </button>
            </div>
            <nav className="flex flex-col gap-0.5">
              <NavLinks pathname={pathname} onNavigate={close} />
              <button
                type="button"
                onClick={onLogout}
                className="flex items-center gap-3 py-2.5 pl-4 pr-4 text-sm text-text-secondary hover:text-text-primary"
              >
                <LogOut size={16} strokeWidth={1.75} />
                <span>Cerrar sesión</span>
              </button>
            </nav>
          </div>
        </div>
      )}
    </>
  );
}

export function OwnerShell({ children }: { children: React.ReactNode }) {
  useRequireAuth();
  const pathname = usePathname();
  const router = useRouter();
  async function handleLogout() {
    await signOut();
    router.replace("/");
  }

  return (
    <div
      className={`min-h-screen bg-bg-primary text-text-primary ${
        PAPER_SCREENS.includes(pathname) ? "theme-paper" : ""
      }`}
    >
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col lg:flex-row">
        {/* Sidebar — desktop only */}
        <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:flex-shrink-0 border-r border-border">
          {/* Logo */}
          <div className="px-6 py-6">
            <Link href="/dashboard/automation" className="flex items-center gap-2">
              <span className="text-base font-semibold text-text-primary">Doppel</span>
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-accent" />
            </Link>
          </div>

          {/* Nav */}
          <nav className="flex-1 flex flex-col px-2 gap-0.5 overflow-y-auto">
            <NavLinks pathname={pathname} />
          </nav>

          {/* Sidebar footer — logout */}
          <div className="px-2 py-4 border-t border-border">
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center gap-3 pl-4 pr-4 py-2.5 text-sm text-text-secondary hover:text-text-primary hover:bg-bg-elevated rounded-r-lg transition-colors"
            >
              <LogOut size={16} strokeWidth={1.75} />
              <span>Cerrar sesión</span>
            </button>
          </div>
        </aside>

        {/* Mobile top bar */}
        <header className="lg:hidden flex items-center justify-between px-4 py-4 border-b border-border">
          <Link href="/dashboard/automation" className="flex items-center gap-2">
            <span className="text-base font-semibold">Doppel</span>
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-accent" />
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="text-sm text-text-secondary hover:text-text-primary transition-colors"
          >
            Salir
          </button>
        </header>

        {/* Main content */}
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 pb-24 lg:pb-6">
          {children}
        </main>

        {/* Mobile bottom nav */}
        <MobileNav pathname={pathname} onLogout={handleLogout} />
      </div>
    </div>
  );
}

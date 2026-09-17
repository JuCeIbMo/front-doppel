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
} from "lucide-react";
import { signOut } from "@/lib/supabase";
import { isFeatureReady, type FeatureName } from "@/lib/features";
import { useRequireAuth } from "@/hooks/useRequireAuth";

type NavLink = {
  href: string;
  label: string;
  icon: React.ElementType;
  feature: null | FeatureName;
};

const coreLinks: NavLink[] = [
  { href: "/dashboard/automation", label: "Automatización", icon: Bot, feature: null },
  { href: "/dashboard/orders", label: "Pedidos", icon: ClipboardList, feature: null },
  { href: "/dashboard/templates", label: "Plantillas", icon: MessageSquareText, feature: null },
  { href: "/dashboard/knowledge", label: "Lo que sabe el bot", icon: BookOpen, feature: null },
  { href: "/dashboard/approvals", label: "Aprobaciones", icon: ShieldCheck, feature: null },
  { href: "/dashboard/sales", label: "Ventas", icon: ShoppingCart, feature: null },
  { href: "/dashboard", label: "Inicio", icon: LayoutDashboard, feature: "overview" },
  { href: "/dashboard/products", label: "Productos", icon: Package, feature: "products" },
  { href: "/dashboard/inventory", label: "Inventario", icon: Boxes, feature: "inventory" },
  { href: "/dashboard/clients", label: "Clientes", icon: Users, feature: "clients" },
  { href: "/dashboard/finance", label: "Finanzas", icon: Wallet, feature: "finance" },
];

const toolLinks: NavLink[] = [
  { href: "/dashboard/reports", label: "Reportes", icon: BarChart2, feature: "reports" },
  { href: "/dashboard/activity", label: "Bitácora", icon: Activity, feature: null },
  { href: "/dashboard/settings", label: "Ajustes", icon: Settings, feature: "settings" },
];

/** The screens a phone keeps in its bottom bar; the rest are under "Más". */
const MOBILE_BAR = ["/dashboard", "/dashboard/automation", "/dashboard/orders", "/dashboard/sales"];

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
      className={`flex items-center gap-3 py-2.5 pr-4 text-sm rounded-r-lg transition-colors ${
        active
          ? "border-l-2 border-accent bg-accent-dim text-text-primary pl-[calc(1rem-2px)]"
          : "pl-4 text-text-secondary hover:bg-bg-elevated hover:text-text-primary"
      }`}
    >
      <Icon size={16} strokeWidth={1.75} />
      <span>{label}</span>
      {soon && (
        <span className="ml-auto rounded bg-bg-elevated px-1.5 py-0.5 text-[10px] text-text-secondary">
          Pronto
        </span>
      )}
    </Link>
  );
}

/** Every screen, the core ones first and the tools after a separator. */
function NavLinks({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <>
      {coreLinks.map((link) => (
        <NavItem
          key={link.href}
          {...link}
          active={isActiveLink(pathname, link.href)}
          onNavigate={onNavigate}
        />
      ))}
      <div className="h-px bg-border mx-4 my-2" />
      {toolLinks.map((link) => (
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
  const barLinks = coreLinks.filter((link) => MOBILE_BAR.includes(link.href));
  const close = () => setOpen(false);

  return (
    <>
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-bg-secondary border-t border-border flex">
        {barLinks.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            aria-label={label}
            className={`flex-1 flex flex-col items-center justify-center py-3 text-xs transition-colors ${
              isActiveLink(pathname, href) ? "text-accent" : "text-text-secondary"
            }`}
          >
            <Icon size={20} strokeWidth={1.75} />
          </Link>
        ))}
        <button
          type="button"
          aria-label="Más"
          aria-expanded={open}
          onClick={() => setOpen(true)}
          className="flex-1 flex flex-col items-center justify-center py-3 text-xs text-text-secondary transition-colors"
        >
          <Menu size={20} strokeWidth={1.75} />
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
    <div className="min-h-screen bg-bg-primary text-text-primary">
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

"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  Boxes,
  ShoppingCart,
  Users,
  Wallet,
  BarChart2,
  Activity,
  Bot,
  Settings,
  LogOut,
} from "lucide-react";
import { clearToken } from "@/lib/auth";
import { authenticatedFetch } from "@/lib/api";
import { getFeatureFlags } from "@/lib/features";
import { useRequireAuth } from "@/hooks/useRequireAuth";

type NavLink = {
  href: string;
  label: string;
  icon: React.ElementType;
  feature: null | keyof ReturnType<typeof getFeatureFlags>;
};

const coreLinks: NavLink[] = [
  { href: "/dashboard", label: "Resumen", icon: LayoutDashboard, feature: null },
  { href: "/dashboard/products", label: "Productos", icon: Package, feature: "products" },
  { href: "/dashboard/inventory", label: "Inventario", icon: Boxes, feature: "inventory" },
  { href: "/dashboard/sales", label: "Ventas", icon: ShoppingCart, feature: "sales" },
  { href: "/dashboard/clients", label: "Clientes", icon: Users, feature: "clients" },
  { href: "/dashboard/finance", label: "Finanzas", icon: Wallet, feature: "finance" },
];

const toolLinks: NavLink[] = [
  { href: "/dashboard/reports", label: "Reportes", icon: BarChart2, feature: "reports" },
  { href: "/dashboard/activity", label: "Bitácora", icon: Activity, feature: "activity" },
  { href: "/dashboard/automation", label: "Automatización", icon: Bot, feature: null },
  { href: "/dashboard/settings", label: "Settings", icon: Settings, feature: "settings" },
];

function NavItem({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: React.ElementType;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 py-2.5 pr-4 text-sm rounded-r-lg transition-colors ${
        active
          ? "border-l-2 border-accent bg-accent-dim text-text-primary pl-[calc(1rem-2px)]"
          : "pl-4 text-text-secondary hover:bg-bg-elevated hover:text-text-primary"
      }`}
    >
      <Icon size={16} strokeWidth={1.75} />
      <span>{label}</span>
    </Link>
  );
}

function MobileNav({
  links,
  pathname,
}: {
  links: NavLink[];
  pathname: string;
}) {
  const mobileLinks = links.slice(0, 5);
  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-bg-secondary border-t border-border flex">
      {mobileLinks.map(({ href, label, icon: Icon }) => {
        const active =
          pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
        return (
          <Link
            key={href}
            href={href}
            aria-label={label}
            className={`flex-1 flex flex-col items-center justify-center py-3 text-xs transition-colors ${
              active ? "text-accent" : "text-text-secondary"
            }`}
          >
            <Icon size={20} strokeWidth={1.75} />
          </Link>
        );
      })}
    </nav>
  );
}

export function OwnerShell({ children }: { children: React.ReactNode }) {
  useRequireAuth();
  const pathname = usePathname();
  const router = useRouter();
  const flags = getFeatureFlags();

  const filteredCore = coreLinks.filter((l) => (l.feature ? flags[l.feature] : true));
  const filteredTools = toolLinks.filter((l) => (l.feature ? flags[l.feature] : true));

  async function handleLogout() {
    await authenticatedFetch("/auth/logout", { method: "POST" }).catch(() => null);
    clearToken();
    router.replace("/");
  }

  function isActive(href: string) {
    return pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
  }

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col lg:flex-row">
        {/* Sidebar — desktop only */}
        <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:flex-shrink-0 border-r border-border">
          {/* Logo */}
          <div className="px-6 py-6">
            <Link href="/dashboard" className="flex items-center gap-2">
              <span className="text-base font-semibold text-text-primary">Doppel</span>
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-accent" />
            </Link>
          </div>

          {/* Core nav */}
          <nav className="flex-1 flex flex-col px-2 gap-0.5 overflow-y-auto">
            {filteredCore.map((link) => (
              <NavItem key={link.href} {...link} active={isActive(link.href)} />
            ))}

            {/* Separator */}
            <div className="h-px bg-border mx-4 my-2" />

            {/* Tool nav */}
            {filteredTools.map((link) => (
              <NavItem key={link.href} {...link} active={isActive(link.href)} />
            ))}
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
          <Link href="/dashboard" className="flex items-center gap-2">
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
        <MobileNav links={filteredCore} pathname={pathname} />
      </div>
    </div>
  );
}

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
import { MMark, MTicker, MFoot } from "@/components/ui/MeridianKit";

type NavLink = {
  href: string;
  label: string;
  icon: React.ElementType;
  glyph: string;
  feature: null | keyof ReturnType<typeof getFeatureFlags>;
};

const coreLinks: NavLink[] = [
  { href: "/dashboard",           label: "Resumen",        icon: LayoutDashboard, glyph: "◇", feature: null },
  { href: "/dashboard/products",  label: "Productos",      icon: Package,         glyph: "⊟", feature: "products" },
  { href: "/dashboard/inventory", label: "Inventario",     icon: Boxes,           glyph: "▦", feature: "inventory" },
  { href: "/dashboard/sales",     label: "Ventas",         icon: ShoppingCart,    glyph: "↗", feature: "sales" },
  { href: "/dashboard/clients",   label: "Clientes",       icon: Users,           glyph: "$", feature: "clients" },
  { href: "/dashboard/finance",   label: "Finanzas",       icon: Wallet,          glyph: "≋", feature: "finance" },
];

const toolLinks: NavLink[] = [
  { href: "/dashboard/reports",    label: "Reportes",       icon: BarChart2, glyph: "∿", feature: "reports" },
  { href: "/dashboard/activity",   label: "Bitácora",       icon: Activity,  glyph: "·", feature: "activity" },
  { href: "/dashboard/automation", label: "Automatización", icon: Bot,       glyph: "⌘", feature: null },
  { href: "/dashboard/settings",   label: "Settings",       icon: Settings,  glyph: "⚙", feature: "settings" },
];

const TICKER_ITEMS = [
  "Dashboard actualizado · Todo en orden",
  "Ventas del período registradas",
  "Inventario sincronizado",
  "Finanzas · período actual",
  "Sistema operativo · sin alertas críticas",
];

function NavItem({
  href,
  label,
  glyph,
  active,
}: {
  href: string;
  label: string;
  glyph: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 11,
        width: "100%",
        padding: "10px 12px",
        borderRadius: "var(--m-r-pill)",
        border: "1px solid " + (active ? "var(--m-line)" : "transparent"),
        background: active ? "var(--m-surface-2)" : "transparent",
        color: active ? "var(--m-ink)" : "var(--m-ink-dim)",
        fontFamily: "var(--m-sans)",
        fontSize: 13.5,
        fontWeight: active ? 600 : 500,
        cursor: "pointer",
        textDecoration: "none",
        transition: "all .18s",
        letterSpacing: "0.01em",
      }}
    >
      <span
        className="m-mono"
        style={{ width: 18, textAlign: "center", opacity: 0.8, fontSize: 13 }}
      >
        {glyph}
      </span>
      {label}
      {active && (
        <span
          style={{
            marginLeft: "auto",
            width: 5,
            height: 5,
            borderRadius: 999,
            background: "var(--m-accent)",
          }}
        />
      )}
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
    <nav
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 40,
        background: "var(--m-panel)",
        borderTop: "1px solid var(--m-line)",
        display: "flex",
      }}
      className="lg:hidden"
    >
      {mobileLinks.map(({ href, label, icon: Icon, glyph }) => {
        const active =
          pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
        return (
          <Link
            key={href}
            href={href}
            aria-label={label}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "12px 0",
              fontSize: 12,
              color: active ? "var(--m-accent)" : "var(--m-ink-faint)",
              textDecoration: "none",
              transition: "color .18s",
            }}
          >
            <Icon size={20} strokeWidth={1.75} />
          </Link>
        );
      })}
    </nav>
  );
}

function Brand() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
      <MMark size={28} />
      <div style={{ lineHeight: 1 }}>
        <div
          className="m-serif"
          style={{ fontSize: 21, fontWeight: 600, letterSpacing: "0.02em", color: "var(--m-ink)" }}
        >
          Doppel
        </div>
        <div
          className="m-eyebrow"
          style={{ fontSize: 8.5, marginTop: 3 }}
        >
          Resource Intelligence
        </div>
      </div>
    </div>
  );
}

function UserChip({ wide }: { wide?: boolean }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: wide ? "6px" : 0,
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 999,
          background: "var(--m-accent-soft)",
          border: "1px solid var(--m-line)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <span
          className="m-serif"
          style={{ fontSize: 15, color: "var(--m-accent)" }}
        >
          D
        </span>
      </div>
      {wide && (
        <div style={{ lineHeight: 1.2, minWidth: 0 }}>
          <div
            style={{
              fontSize: 12.5,
              fontWeight: 600,
              whiteSpace: "nowrap",
              color: "var(--m-ink)",
            }}
          >
            Doppel ERP
          </div>
          <div className="m-eyebrow" style={{ fontSize: 8 }}>
            Administrador
          </div>
        </div>
      )}
    </div>
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
    <div
      className="meridian-theme"
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(120% 80% at 80% -10%, var(--m-bg-grad-a), var(--m-bg-grad-b) 60%)",
        color: "var(--m-ink)",
        fontFamily: "var(--m-sans)",
        display: "flex",
        flexDirection: "row",
      }}
    >
      {/* ── Sidebar — desktop ── */}
      <aside
        className="hidden lg:flex"
        style={{
          position: "sticky",
          top: 0,
          height: "100vh",
          width: 246,
          flexShrink: 0,
          flexDirection: "column",
          padding: "26px 18px",
          borderRight: "1px solid var(--m-line)",
          background: "var(--m-panel)",
        }}
      >
        <div style={{ padding: "0 8px 22px" }}>
          <Brand />
        </div>
        <div
          style={{ height: 1, background: "var(--m-line)", width: "100%" }}
        />

        {/* Core nav */}
        <nav
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 3,
            marginTop: 18,
          }}
        >
          {filteredCore.map((link) => (
            <NavItem
              key={link.href}
              href={link.href}
              label={link.label}
              glyph={link.glyph}
              active={isActive(link.href)}
            />
          ))}

          <div
            style={{
              height: 1,
              background: "var(--m-line)",
              margin: "8px 0",
            }}
          />

          {filteredTools.map((link) => (
            <NavItem
              key={link.href}
              href={link.href}
              label={link.label}
              glyph={link.glyph}
              active={isActive(link.href)}
            />
          ))}
        </nav>

        {/* Sidebar footer */}
        <div
          style={{
            marginTop: "auto",
            borderTop: "1px solid var(--m-line)",
            paddingTop: 16,
          }}
        >
          <UserChip wide />
          <button
            type="button"
            onClick={handleLogout}
            style={{
              display: "flex",
              width: "100%",
              alignItems: "center",
              gap: 10,
              padding: "10px 12px",
              marginTop: 8,
              borderRadius: "var(--m-r-pill)",
              border: "none",
              background: "transparent",
              color: "var(--m-ink-faint)",
              fontFamily: "var(--m-sans)",
              fontSize: 13,
              cursor: "pointer",
              transition: "color .18s",
            }}
          >
            <LogOut size={14} strokeWidth={1.75} />
            <span>Cerrar sesión</span>
          </button>
        </div>
      </aside>

      {/* ── Mobile top bar ── */}
      <header
        className="lg:hidden"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 40,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 16px",
          height: 56,
          background:
            "color-mix(in srgb, var(--m-bg) 86%, transparent)",
          backdropFilter: "blur(14px)",
          borderBottom: "1px solid var(--m-line)",
        }}
      >
        <Brand />
        <button
          type="button"
          onClick={handleLogout}
          style={{
            fontSize: 12,
            color: "var(--m-ink-faint)",
            background: "none",
            border: "none",
            cursor: "pointer",
            fontFamily: "var(--m-mono)",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          Salir
        </button>
      </header>

      {/* ── Main column ── */}
      <div
        style={{
          flex: 1,
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <MTicker items={TICKER_ITEMS} />

        <main
          style={{
            flex: 1,
            padding: "var(--m-gut, 28px)",
            paddingBottom: "calc(var(--m-gut, 28px) + 80px)",
          }}
          className="lg:pb-[var(--m-gut)]"
        >
          {/* top spacer for mobile header */}
          <div className="lg:hidden" style={{ height: 56 }} />
          {children}
        </main>

        <MFoot />
      </div>

      {/* Mobile bottom nav */}
      <MobileNav links={filteredCore} pathname={pathname} />
    </div>
  );
}

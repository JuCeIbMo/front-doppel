"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clearToken } from "@/lib/auth";
import { authenticatedFetch } from "@/lib/api";
import { getFeatureFlags } from "@/lib/features";

const allLinks = [
  { href: "/dashboard", label: "Resumen", feature: null },
  { href: "/dashboard/products", label: "Productos", feature: "products" as const },
  { href: "/dashboard/inventory", label: "Inventario", feature: "inventory" as const },
  { href: "/dashboard/sales", label: "Ventas", feature: "sales" as const },
  { href: "/dashboard/clients", label: "Clientes", feature: "clients" as const },
  { href: "/dashboard/finance", label: "Finanzas", feature: "finance" as const },
  { href: "/dashboard/settings", label: "Settings", feature: "settings" as const },
  { href: "/dashboard/reports", label: "Reportes", feature: "reports" as const },
  { href: "/dashboard/activity", label: "Bitácora", feature: "activity" as const },
  { href: "/dashboard/automation", label: "Automatización", feature: null },
];

const cashierLink = { href: "/cashier", label: "Modo caja" };

export function OwnerShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const flags = getFeatureFlags();

  const links = allLinks.filter((link) => (link.feature ? flags[link.feature] : true));
  const showCashier = flags.cashier;

  async function handleLogout() {
    await authenticatedFetch("/auth/logout", { method: "POST" }).catch(() => null);
    clearToken();
    router.replace("/");
  }

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col lg:flex-row">
        <aside className="border-b border-white/10 lg:w-72 lg:border-b-0 lg:border-r">
          <div className="flex items-center justify-between px-6 py-6 lg:block">
            <div>
              <p className="text-xl font-bold">Doppel ERP</p>
              <p className="mt-1 text-sm text-text-secondary">
                Operación y automatización desde un solo panel.
              </p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="text-sm text-text-secondary transition-colors hover:text-text-primary"
            >
              Cerrar sesión
            </button>
          </div>

          <nav className="flex gap-2 overflow-x-auto px-4 pb-4 lg:flex-col lg:px-4">
            {links.map((link) => {
              const active =
                pathname === link.href ||
                (link.href !== "/dashboard" && pathname.startsWith(link.href));

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded-2xl px-4 py-3 text-sm transition-colors ${
                    active
                      ? "bg-accent/15 text-accent"
                      : "text-text-secondary hover:bg-white/5 hover:text-text-primary"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
            {showCashier && (
              <Link
                href={cashierLink.href}
                className="rounded-2xl px-4 py-3 text-sm font-medium text-accent transition-colors hover:bg-accent/10"
              >
                {cashierLink.label}
              </Link>
            )}
          </nav>
        </aside>

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}

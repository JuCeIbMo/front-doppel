"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/dashboard", label: "Resumen" },
  { href: "/dashboard/business", label: "Negocio y productos" },
  { href: "/dashboard/admin-phones", label: "Numeros admin" },
];

export function DashboardNav() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-wrap items-center gap-2">
      {links.map((link) => {
        const active = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
              active
                ? "bg-accent/15 text-accent"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}

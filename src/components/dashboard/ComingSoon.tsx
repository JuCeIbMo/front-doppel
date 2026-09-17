import Link from "next/link";
import { isFeatureReady, type FeatureName } from "@/lib/features";

const AVAILABLE = [
  { href: "/dashboard/automation", label: "Automatización" },
  { href: "/dashboard/orders", label: "Pedidos" },
  { href: "/dashboard/approvals", label: "Aprobaciones" },
  { href: "/dashboard/sales", label: "Ventas" },
  { href: "/dashboard/products", label: "Productos" },
  { href: "/dashboard/settings", label: "Ajustes" },
];

/**
 * Renders the screen only when its feature works against the API; otherwise says it is
 * coming and points to what already works. The screen's code stays wired here, so
 * nothing unfinished is dead code.
 */
export function ComingSoonGate({
  feature,
  title,
  children,
}: {
  feature: FeatureName;
  title: string;
  children: React.ReactNode;
}) {
  if (isFeatureReady(feature)) return <>{children}</>;
  return (
    <section className="mx-auto max-w-xl py-16 text-center">
      <span className="inline-flex items-center rounded-md bg-warning/10 px-2 py-0.5 text-xs font-medium text-warning">
        Próximamente
      </span>
      <h1 className="mt-4 text-2xl font-semibold text-text-primary">{title}</h1>
      <p className="mt-3 text-text-secondary">
        Esta sección está en construcción. Mientras tanto puedes usar:
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        {AVAILABLE.map((link) => (
          <Link key={link.href} href={link.href} className="text-accent hover:underline">
            {link.label}
          </Link>
        ))}
      </div>
    </section>
  );
}

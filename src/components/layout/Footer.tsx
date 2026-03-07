import Link from "next/link";

const links = [
  { label: "Inicio", href: "/" },
  { label: "Privacidad", href: "/privacy" },
  { label: "Terminos", href: "/terms" },
  { label: "Contacto", href: "mailto:contacto@doppel.lat" },
];

export function Footer() {
  return (
    <footer className="border-t border-white/5 py-12">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex flex-col items-center gap-6 md:flex-row md:justify-between">
          <div className="flex items-center gap-1.5 text-lg font-bold">
            Doppel
            <span className="inline-block h-2 w-2 rounded-full bg-accent" />
          </div>

          <nav className="flex flex-wrap justify-center gap-8">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm text-text-secondary transition-colors hover:text-text-primary"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <p className="text-sm text-text-secondary">
            &copy; {new Date().getFullYear()} Doppel
          </p>
        </div>
      </div>
    </footer>
  );
}

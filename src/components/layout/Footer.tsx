import Link from "next/link";

const links = [
  { label: "Privacidad", href: "/privacy" },
  { label: "Términos", href: "/terms" },
  { label: "Contacto", href: "mailto:contacto@doppel.lat" },
];

export function Footer() {
  return (
    <footer className="font-body bg-ink py-12 text-paper">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-6 md:flex-row md:justify-between">
        <span className="font-display text-2xl font-black [font-stretch:75%]">DOPPEL</span>
        <nav className="flex flex-wrap justify-center gap-8">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="text-sm font-semibold underline-offset-4 hover:underline">
              {link.label}
            </Link>
          ))}
        </nav>
        <p className="text-sm">&copy; {new Date().getFullYear()} Doppel</p>
      </div>
    </footer>
  );
}

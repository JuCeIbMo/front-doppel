import Link from "next/link";

export default function NotFound() {
  return (
    <main className="font-body grid min-h-svh place-items-center bg-money px-6 text-center text-ink">
      <div>
        <p className="font-display text-[120px] leading-none font-black [font-stretch:72%] md:text-[180px]">404</p>
        <h1 className="font-display mt-2 text-3xl leading-none font-black uppercase [font-stretch:78%] md:text-5xl">
          Esta página no existe
        </h1>
        <p className="mt-4 text-lg font-semibold">Puede que el enlace esté mal escrito o que la página se haya movido.</p>
        <Link
          href="/"
          className="mt-8 inline-flex min-h-12 items-center rounded-2xl border-[3px] border-ink bg-ink px-6 font-extrabold text-paper shadow-[4px_4px_0_var(--color-waiting)] focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-ink"
        >
          Volver al inicio →
        </Link>
      </div>
    </main>
  );
}

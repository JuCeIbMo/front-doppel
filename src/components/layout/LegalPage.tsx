import type { ReactNode } from "react";

/**
 * A legal page (privacy, terms, data deletion) on the public site: the landing's heading
 * and paper, and a reading column. The text inside is plain markup; `.legal` styles it.
 */
export function LegalPage({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <main className="font-body bg-paper px-5 pt-32 pb-24 text-ink md:pt-40">
      <article className="legal mx-auto max-w-2xl">
        <h1 className="font-display text-[44px] leading-[0.9] font-black text-balance uppercase [font-stretch:72%] md:text-7xl">
          {title}
        </h1>
        <p className="font-hand mt-4 text-xl font-bold text-steps">Última actualización: {updated}</p>
        <div className="mt-12 space-y-10">{children}</div>
      </article>
    </main>
  );
}

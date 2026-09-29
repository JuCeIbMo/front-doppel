"use client";

import { useEffect, useState } from "react";
import { HireLink } from "./HireLink";

/**
 * The main button, always within reach on a phone while the story scrolls, so nobody has
 * to reach the end to sign up. It steps aside once the closing section, with its own
 * button, is on screen, and stays aside below it. On a computer the bar at the top carries
 * it instead.
 */
export function StickyCta() {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const target = document.getElementById("contratar");
    if (!target) return;
    const observer = new IntersectionObserver(
      ([entry]) => setHidden(entry.isIntersecting || entry.boundingClientRect.top < 0),
      {
        threshold: 0.2,
      },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      className={`fixed inset-x-0 bottom-4 z-40 flex justify-center px-4 transition-[opacity,translate] duration-300 md:hidden ${
        hidden ? "pointer-events-none translate-y-6 opacity-0" : ""
      }`}
      aria-hidden={hidden}
    >
      <HireLink
        tabIndex={hidden ? -1 : undefined}
        className="flex min-h-14 w-full max-w-md items-center justify-center rounded-2xl border-[3px] border-ink bg-ink text-lg font-extrabold text-paper shadow-[4px_4px_0_var(--color-waiting)]"
      />
    </div>
  );
}

"use client";

import { AnimatedSection } from "@/components/ui/AnimatedSection";
import { Button } from "@/components/ui/Button";

export function FinalCTA() {
  return (
    <section className="relative py-32 px-6 overflow-hidden">
      {/* Subtle radial green glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(37,211,102,0.05)_0%,transparent_60%)] pointer-events-none" />

      <div className="relative z-10 max-w-2xl mx-auto text-center">
        <AnimatedSection>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold">
            Empieza hoy — gratis
          </h2>
          <p className="text-text-secondary text-lg mt-4">
            Conecta tu WhatsApp Business y deja que la IA trabaje por ti
          </p>
          <div className="mt-8">
            <Button href="/connect">Conectar mi WhatsApp</Button>
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}

"use client";

import { AnimatedSection } from "@/components/ui/AnimatedSection";

const steps = [
  {
    number: 1,
    title: "Conecta tu WhatsApp",
    description:
      "Conecta tu WhatsApp Business en un clic con nuestro proceso guiado",
    icon: (
      <svg
        width="48"
        height="48"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
      </svg>
    ),
  },
  {
    number: 2,
    title: "Configura tu asistente",
    description:
      "Define la informacion de tu negocio y personaliza las respuestas",
    icon: (
      <svg
        width="48"
        height="48"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
  },
  {
    number: 3,
    title: "Automatiza 24/7",
    description:
      "Tu asistente responde automaticamente a tus clientes",
    icon: (
      <svg
        width="48"
        height="48"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 2l2.09 4.26L18.18 7 15 10.09 15.82 14.18 12 12.26 8.18 14.18 9 10.09 5.82 7l4.09-.74z" />
        <path d="M5 19h14" />
        <path d="M5 22h14" />
      </svg>
    ),
  },
];

export function HowItWorks() {
  return (
    <section id="como-funciona" className="py-32 px-6">
      <div className="max-w-7xl mx-auto">
        <AnimatedSection>
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-20">
            Como funciona
          </h2>
        </AnimatedSection>

        <div className="relative grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8">
          {/* Dashed connector line (desktop only) */}
          <div className="hidden md:block absolute top-20 left-[20%] right-[20%] border-t border-dashed border-white/10" />

          {steps.map((step, i) => (
            <AnimatedSection key={step.number} delay={i * 0.1}>
              <div className="relative flex flex-col items-center text-center">
                {/* Number badge */}
                <div className="w-10 h-10 rounded-full bg-accent/10 text-accent font-bold flex items-center justify-center text-sm">
                  {step.number}
                </div>

                {/* Icon */}
                <div className="w-12 h-12 text-accent mt-4 flex items-center justify-center">
                  {step.icon}
                </div>

                {/* Title */}
                <h3 className="text-xl font-bold mt-4">{step.title}</h3>

                {/* Description */}
                <p className="text-text-secondary mt-2 max-w-xs">
                  {step.description}
                </p>
              </div>
            </AnimatedSection>
          ))}
        </div>
      </div>
    </section>
  );
}

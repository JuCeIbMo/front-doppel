import type { Metadata } from "next";
import { EmployeeStory } from "@/components/landing/EmployeeStory";
import { HireSteps } from "@/components/landing/HireSteps";
import { StickyCta } from "@/components/landing/StickyCta";

export const metadata: Metadata = {
  title: "Doppel — Tu empleado completo, en tu WhatsApp",
  description:
    "Contesta mensajes y llamadas, vende, agenda y cobra por tu negocio, y te reporta a ti por WhatsApp.",
};

export default function Home() {
  return (
    <main className="font-body text-ink">
      <EmployeeStory />
      <HireSteps />
      <StickyCta />
    </main>
  );
}

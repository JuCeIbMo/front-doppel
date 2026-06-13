import type { Metadata } from "next";
import { AppProviders } from "@/components/app/AppProviders";
import { satoshi } from "@/lib/fonts";
import "@/styles/globals.css";
import "driver.js/dist/driver.css";

export const metadata: Metadata = {
  title: "Doppel — Automatiza tu WhatsApp Business con IA",
  description: "Conecta tu WhatsApp Business en 2 minutos. Sin codigo. Sin complicaciones.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={satoshi.variable}>
      <body className="bg-bg-primary text-text-primary font-sans antialiased">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}

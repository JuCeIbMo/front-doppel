import type { Metadata } from "next";
import { satoshi } from "@/lib/fonts";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "Doppel — Automatiza tu WhatsApp Business con IA",
  description: "Conecta tu WhatsApp Business en 2 minutos. Sin codigo. Sin complicaciones.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={satoshi.variable}>
      <body className="bg-bg-primary text-text-primary font-sans antialiased">
        {children}
      </body>
    </html>
  );
}

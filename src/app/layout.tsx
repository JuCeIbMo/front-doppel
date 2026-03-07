import type { Metadata } from "next";
import { satoshi } from "@/lib/fonts";
import "@/styles/globals.css";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

export const metadata: Metadata = {
  title: "Doppel — Automatiza tu WhatsApp Business con IA",
  description: "Conecta tu WhatsApp Business en 2 minutos. Sin codigo. Sin complicaciones.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={satoshi.variable}>
      <body className="bg-bg-primary text-text-primary font-sans antialiased">
        <Navbar />
        {children}
        <Footer />
      </body>
    </html>
  );
}

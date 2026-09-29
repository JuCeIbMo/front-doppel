import type { Metadata, Viewport } from "next";
import { AppProviders } from "@/components/app/AppProviders";
import { archivo, figtree, kalam, satoshi } from "@/lib/fonts";
import { SITE_DESCRIPTION, SITE_NAME, SITE_TITLE, SITE_URL } from "@/lib/site";
import "@/styles/globals.css";
import "driver.js/dist/driver.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  openGraph: {
    type: "website",
    locale: "es_BO",
    siteName: SITE_NAME,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: "/",
    // public/og.png: the landing's first scene at 1200×630, captured from the page itself.
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Tu empleado completo, en tu WhatsApp" }],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: ["/og.png"],
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#C8102E",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="es"
      className={`${satoshi.variable} ${archivo.variable} ${figtree.variable} ${kalam.variable}`}
    >
      <body className="bg-bg-primary text-text-primary font-sans antialiased">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { EmployeeStory } from "@/components/landing/EmployeeStory";
import { HireSteps } from "@/components/landing/HireSteps";
import { Questions } from "@/components/landing/Questions";
import { StickyCta } from "@/components/landing/StickyCta";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

/** What search engines read about the product; nothing here that the page does not say. */
const structuredData = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: SITE_NAME,
  url: SITE_URL,
  description: SITE_DESCRIPTION,
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  inLanguage: "es",
};

export default function Home() {
  return (
    <main className="font-body text-ink">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }}
      />
      <EmployeeStory />
      <Questions />
      <HireSteps />
      <StickyCta />
    </main>
  );
}

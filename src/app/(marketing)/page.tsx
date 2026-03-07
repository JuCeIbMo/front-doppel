import { Hero } from "@/components/landing/Hero";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Features } from "@/components/landing/Features";
import { Trust } from "@/components/landing/Trust";
import { FinalCTA } from "@/components/landing/FinalCTA";

export default function Home() {
  return (
    <main>
      <Hero />
      <HowItWorks />
      <Features />
      <Trust />
      <FinalCTA />
    </main>
  );
}

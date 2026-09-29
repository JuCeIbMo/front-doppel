import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="marketing bg-paper text-ink">
      <Navbar />
      {children}
      <Footer />
    </div>
  );
}

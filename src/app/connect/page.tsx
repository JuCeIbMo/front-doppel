import Link from "next/link";
import { AuthFlow } from "@/components/connect/AuthFlow";

export default function ConnectPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2 mb-12">
        <span className="text-xl font-bold text-text-primary">Doppel</span>
        <span className="inline-block w-2 h-2 rounded-full bg-accent" />
      </Link>

      <AuthFlow />
    </div>
  );
}

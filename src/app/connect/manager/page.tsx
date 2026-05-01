import { Suspense } from "react";
import { ManagerSetup } from "@/components/connect/ManagerSetup";

export default function ManagerSetupPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <ManagerSetup />
    </Suspense>
  );
}

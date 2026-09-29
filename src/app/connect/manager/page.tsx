import { Suspense } from "react";
import { ManagerSetup } from "@/components/connect/ManagerSetup";

export default function ManagerSetupPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-svh flex items-center justify-center bg-money">
          <div className="size-6 animate-spin rounded-full border-[3px] border-ink border-t-transparent" />
        </div>
      }
    >
      <ManagerSetup />
    </Suspense>
  );
}

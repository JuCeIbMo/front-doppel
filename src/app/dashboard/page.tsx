import { ComingSoonGate } from "@/components/dashboard/ComingSoon";
import { ErpOverviewView } from "@/components/dashboard/ErpOverviewView";

export default function DashboardPage() {
  return (
    <ComingSoonGate feature="overview" title="Resumen">
      <ErpOverviewView />
    </ComingSoonGate>
  );
}

import { ComingSoonGate } from "@/components/dashboard/ComingSoon";
import { OverviewView } from "@/components/dashboard/OverviewView";

export default function DashboardPage() {
  return (
    <ComingSoonGate feature="overview" title="Inicio">
      <OverviewView />
    </ComingSoonGate>
  );
}

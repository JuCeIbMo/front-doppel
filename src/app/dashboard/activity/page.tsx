import { ComingSoonGate } from "@/components/dashboard/ComingSoon";
import { ErpActivityView } from "@/components/dashboard/ErpActivityView";

export default function DashboardActivityPage() {
  return (
    <ComingSoonGate feature="activity" title="Bitácora">
      <ErpActivityView />
    </ComingSoonGate>
  );
}

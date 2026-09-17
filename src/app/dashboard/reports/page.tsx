import { ComingSoonGate } from "@/components/dashboard/ComingSoon";
import { ErpReportsView } from "@/components/dashboard/ErpReportsView";

export default function DashboardReportsPage() {
  return (
    <ComingSoonGate feature="reports" title="Reportes">
      <ErpReportsView />
    </ComingSoonGate>
  );
}

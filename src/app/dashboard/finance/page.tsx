import { ComingSoonGate } from "@/components/dashboard/ComingSoon";
import { ErpFinanceView } from "@/components/dashboard/ErpFinanceView";

export default function DashboardFinancePage() {
  return (
    <ComingSoonGate feature="finance" title="Finanzas">
      <ErpFinanceView />
    </ComingSoonGate>
  );
}

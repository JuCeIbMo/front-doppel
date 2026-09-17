import { ComingSoonGate } from "@/components/dashboard/ComingSoon";
import { ErpSalesView } from "@/components/dashboard/ErpSalesView";

export default function DashboardSalesPage() {
  return (
    <ComingSoonGate feature="sales" title="Ventas">
      <ErpSalesView />
    </ComingSoonGate>
  );
}

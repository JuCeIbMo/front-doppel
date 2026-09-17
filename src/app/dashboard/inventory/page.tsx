import { ComingSoonGate } from "@/components/dashboard/ComingSoon";
import { ErpInventoryView } from "@/components/dashboard/ErpInventoryView";

export default function DashboardInventoryPage() {
  return (
    <ComingSoonGate feature="inventory" title="Inventario">
      <ErpInventoryView />
    </ComingSoonGate>
  );
}

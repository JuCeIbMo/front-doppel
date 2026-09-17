import { ComingSoonGate } from "@/components/dashboard/ComingSoon";
import { ErpProductsView } from "@/components/dashboard/ErpProductsView";

export default function DashboardProductsPage() {
  return (
    <ComingSoonGate feature="products" title="Productos">
      <ErpProductsView />
    </ComingSoonGate>
  );
}

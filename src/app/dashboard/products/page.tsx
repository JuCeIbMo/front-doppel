import { ComingSoonGate } from "@/components/dashboard/ComingSoon";
import { ProductsView } from "@/components/dashboard/ProductsView";

export default function DashboardProductsPage() {
  return (
    <ComingSoonGate feature="products" title="Productos">
      <ProductsView />
    </ComingSoonGate>
  );
}

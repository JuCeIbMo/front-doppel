import { ComingSoonGate } from "@/components/dashboard/ComingSoon";
import { ProductEditorView } from "@/components/dashboard/ProductEditorView";

export default function DashboardProductNewPage() {
  return (
    <ComingSoonGate feature="products" title="Nuevo producto">
      <ProductEditorView />
    </ComingSoonGate>
  );
}

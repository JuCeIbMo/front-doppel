import { ComingSoonGate } from "@/components/dashboard/ComingSoon";
import { ProductEditorView } from "@/components/dashboard/ProductEditorView";

export default async function DashboardProductEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <ComingSoonGate feature="products" title="Producto">
      <ProductEditorView productCode={decodeURIComponent(id)} />
    </ComingSoonGate>
  );
}

import { ComingSoonGate } from "@/components/dashboard/ComingSoon";
import { ErpProductEditorView } from "@/components/dashboard/ErpProductEditorView";

export default async function DashboardProductEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <ComingSoonGate feature="products" title="Producto">
      <ErpProductEditorView productId={id} />
    </ComingSoonGate>
  );
}

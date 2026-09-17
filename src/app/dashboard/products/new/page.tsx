import { ComingSoonGate } from "@/components/dashboard/ComingSoon";
import { ErpProductEditorView } from "@/components/dashboard/ErpProductEditorView";

export default async function DashboardProductNewPage({
  searchParams,
}: {
  searchParams: Promise<{ barcode?: string }>;
}) {
  const params = await searchParams;
  return (
    <ComingSoonGate feature="products" title="Nuevo producto">
      <ErpProductEditorView barcodeSeed={params.barcode} />
    </ComingSoonGate>
  );
}

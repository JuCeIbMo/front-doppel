import { ErpProductEditorView } from "@/components/dashboard/ErpProductEditorView";

export default async function DashboardProductNewPage({
  searchParams,
}: {
  searchParams: Promise<{ barcode?: string }>;
}) {
  const params = await searchParams;
  return <ErpProductEditorView barcodeSeed={params.barcode} />;
}

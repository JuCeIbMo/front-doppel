import { ErpProductEditorView } from "@/components/dashboard/ErpProductEditorView";

export default async function DashboardProductEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ErpProductEditorView productId={id} />;
}

import { ErpSaleDetailView } from "@/components/dashboard/ErpSaleDetailView";

export default async function DashboardSaleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ErpSaleDetailView saleId={id} />;
}

import { ComingSoonGate } from "@/components/dashboard/ComingSoon";
import { ErpSaleDetailView } from "@/components/dashboard/ErpSaleDetailView";

export default async function DashboardSaleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <ComingSoonGate feature="sales" title="Venta">
      <ErpSaleDetailView saleId={id} />
    </ComingSoonGate>
  );
}

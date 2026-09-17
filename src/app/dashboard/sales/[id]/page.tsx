import { ComingSoonGate } from "@/components/dashboard/ComingSoon";
import { SaleDetailView } from "@/components/dashboard/SaleDetailView";

export default async function DashboardSaleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <ComingSoonGate feature="saleDetail" title="Venta">
      <SaleDetailView saleCode={decodeURIComponent(id)} />
    </ComingSoonGate>
  );
}

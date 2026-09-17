import { ComingSoonGate } from "@/components/dashboard/ComingSoon";
import { ErpInventoryMovementsView } from "@/components/dashboard/ErpInventoryMovementsView";

export default async function DashboardInventoryMovementsPage({
  searchParams,
}: {
  searchParams: Promise<{ product_id?: string }>;
}) {
  const params = await searchParams;
  return (
    <ComingSoonGate feature="inventory" title="Movimientos de inventario">
      <ErpInventoryMovementsView initialProductId={params.product_id ?? ""} />
    </ComingSoonGate>
  );
}

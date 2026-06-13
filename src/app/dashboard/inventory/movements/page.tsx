import { ErpInventoryMovementsView } from "@/components/dashboard/ErpInventoryMovementsView";

export default async function DashboardInventoryMovementsPage({
  searchParams,
}: {
  searchParams: Promise<{ product_id?: string }>;
}) {
  const params = await searchParams;
  return <ErpInventoryMovementsView initialProductId={params.product_id ?? ""} />;
}

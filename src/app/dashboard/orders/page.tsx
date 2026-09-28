import { OrdersView } from "@/components/dashboard/OrdersView";

export default async function DashboardOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string }>;
}) {
  const { estado } = await searchParams;
  return <OrdersView initialStatus={estado} />;
}

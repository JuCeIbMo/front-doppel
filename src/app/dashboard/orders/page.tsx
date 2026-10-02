import { OrdersView } from "@/components/dashboard/OrdersView";

export default async function DashboardOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string; cita?: string }>;
}) {
  const { estado, cita } = await searchParams;
  return <OrdersView initialStatus={estado} highlight={cita} />;
}

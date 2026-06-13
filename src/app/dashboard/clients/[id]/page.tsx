import { ErpClientDetailView } from "@/components/dashboard/ErpClientDetailView";

export default async function DashboardClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ErpClientDetailView clientId={id} />;
}

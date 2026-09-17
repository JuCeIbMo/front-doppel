import { ComingSoonGate } from "@/components/dashboard/ComingSoon";
import { ErpClientDetailView } from "@/components/dashboard/ErpClientDetailView";

export default async function DashboardClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <ComingSoonGate feature="clients" title="Cliente">
      <ErpClientDetailView clientId={id} />
    </ComingSoonGate>
  );
}

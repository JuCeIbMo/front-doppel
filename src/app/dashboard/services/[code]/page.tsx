import { ServiceEditorView } from "@/components/dashboard/ServiceEditorView";

export default async function DashboardServiceEditPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  return <ServiceEditorView serviceCode={decodeURIComponent(code)} />;
}

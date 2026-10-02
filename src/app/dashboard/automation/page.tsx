import { DashboardView } from "@/components/dashboard/DashboardView";

export default async function DashboardAutomationPage({
  searchParams,
}: {
  searchParams: Promise<{ numero?: string }>;
}) {
  const { numero } = await searchParams;
  return <DashboardView openNumber={numero} />;
}

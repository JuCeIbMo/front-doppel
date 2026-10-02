import { AgendaView } from "@/components/dashboard/AgendaView";

export default async function DashboardAgendaPage({
  searchParams,
}: {
  searchParams: Promise<{ dia?: string; cita?: string }>;
}) {
  const { dia, cita } = await searchParams;
  return <AgendaView initialDay={dia} highlight={cita} />;
}

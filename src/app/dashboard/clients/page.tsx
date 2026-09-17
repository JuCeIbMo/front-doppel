import { ComingSoonGate } from "@/components/dashboard/ComingSoon";
import { ErpClientsView } from "@/components/dashboard/ErpClientsView";

export default function DashboardClientsPage() {
  return (
    <ComingSoonGate feature="clients" title="Clientes">
      <ErpClientsView />
    </ComingSoonGate>
  );
}

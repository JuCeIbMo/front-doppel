import { ComingSoonGate } from "@/components/dashboard/ComingSoon";
import { ErpSettingsView } from "@/components/dashboard/ErpSettingsView";

export default function DashboardSettingsPage() {
  return (
    <ComingSoonGate feature="settings" title="Settings">
      <ErpSettingsView />
    </ComingSoonGate>
  );
}

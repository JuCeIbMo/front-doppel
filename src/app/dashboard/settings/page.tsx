import { ComingSoonGate } from "@/components/dashboard/ComingSoon";
import { SettingsView } from "@/components/dashboard/SettingsView";

export default function DashboardSettingsPage() {
  return (
    <ComingSoonGate feature="settings" title="Ajustes">
      <SettingsView />
    </ComingSoonGate>
  );
}

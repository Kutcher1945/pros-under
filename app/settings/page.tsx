import { RoleGate } from '@/components/AppShell';
import { SettingsView } from '@/components/views/AdminViews';

export default function SettingsPage() {
  return (
    <RoleGate page="settings">
      <SettingsView />
    </RoleGate>
  );
}

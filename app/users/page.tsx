import { RoleGate } from '@/components/AppShell';
import { UsersView } from '@/components/views/AdminViews';

export default function UsersPage() {
  return (
    <RoleGate page="users">
      <UsersView />
    </RoleGate>
  );
}

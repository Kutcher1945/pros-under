import { RoleGate } from '@/components/AppShell';
import { SignalsView } from '@/components/views/SignalViews';

export default function SignalsPage() {
  return (
    <RoleGate page="signals">
      <SignalsView />
    </RoleGate>
  );
}

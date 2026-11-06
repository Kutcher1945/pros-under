import { RoleGate } from '@/components/AppShell';
import { OverviewView } from '@/components/views/OverviewView';

export default function OverviewPage() {
  return (
    <RoleGate page="overview">
      <OverviewView />
    </RoleGate>
  );
}

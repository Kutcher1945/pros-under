import { RoleGate } from '@/components/AppShell';
import { TasksView } from '@/components/views/SignalViews';

export default function TasksPage() {
  return (
    <RoleGate page="tasks">
      <TasksView />
    </RoleGate>
  );
}

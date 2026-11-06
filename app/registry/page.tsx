import { Suspense } from 'react';

import { RoleGate } from '@/components/AppShell';
import { RegistryView } from '@/components/views/RegistryView';

export default function RegistryPage() {
  return (
    <RoleGate page="registry">
      {/* RegistryView reads ?filter=&unit= via useSearchParams. */}
      <Suspense>
        <RegistryView />
      </Suspense>
    </RoleGate>
  );
}

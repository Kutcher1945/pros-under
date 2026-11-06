'use client';

import { Suspense, use } from 'react';

import { RoleGate } from '@/components/AppShell';
import { CaseView } from '@/components/case/CaseView';

export default function CasePage({ params }: PageProps<'/registry/[id]'>) {
  const { id } = use(params);
  return (
    <RoleGate page="registry">
      {/* CaseView reads ?tab= via useSearchParams. */}
      <Suspense>
        <CaseView id={id} />
      </Suspense>
    </RoleGate>
  );
}

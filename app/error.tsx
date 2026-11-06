'use client';

import { ErrorScreen } from '@/components/ErrorScreen';

export default function Error({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <ErrorScreen retry={retry} />;
}

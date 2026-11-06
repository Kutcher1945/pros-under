'use client';

import './globals.css';

import { ErrorScreen } from '@/components/ErrorScreen';

/** Catches errors in the root layout (AppShell) itself; must render html/body. */
export default function GlobalError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <html lang="ru">
      <body>
        <ErrorScreen retry={retry} />
      </body>
    </html>
  );
}

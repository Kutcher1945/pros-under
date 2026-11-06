import type { Metadata } from 'next';

import './globals.css';

import { AppShell } from '@/components/AppShell';
import { ToastProvider } from '@/components/Toast';

export const metadata: Metadata = {
  title: 'Опека · Реестр и надзор',
  description: 'Единый реестр дел несовершеннолетних. Проверка карточек и работа с замечаниями.',
};

// Applies a saved theme before first paint (same approach as prosecutor_dtp_next).
const THEME_INIT_SCRIPT = `
(function () {
  try {
    var stored = window.localStorage.getItem('opeka-theme');
    if (stored === 'light' || stored === 'dark') {
      document.documentElement.setAttribute('data-theme', stored);
    }
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    // data-theme is set by the inline script before hydration — an expected mismatch.
    <html lang="ru" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>
        <ToastProvider>
          <AppShell>{children}</AppShell>
        </ToastProvider>
      </body>
    </html>
  );
}

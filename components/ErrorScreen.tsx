'use client';

import clsx from 'clsx';

import { signOut } from '@/lib/store';

import { ui } from './ui';

/** Fallback for render errors: retry, or sign out and start over. */
export function ErrorScreen({ retry }: { retry: () => void }) {
  async function leave() {
    await signOut();
    // Full reload: drop whatever state led to the error.
    window.location.replace('/login');
  }

  return (
    <div style={{ minHeight: '60vh', display: 'grid', placeItems: 'center', padding: 24 }}>
      <div className={ui.panel} style={{ maxWidth: 520, padding: 24 }}>
        <h1 style={{ margin: '0 0 8px', fontSize: 20 }}>Не удалось отобразить страницу</h1>
        <p style={{ margin: '0 0 18px', color: 'var(--ink-2)', fontSize: 13.5, lineHeight: 1.6 }}>
          Попробуйте ещё раз. Если ошибка повторяется, выйдите из системы и войдите снова.
        </p>
        <div className={ui.actions}>
          <button type="button" className={clsx(ui.btn, ui.primary)} onClick={retry}>
            Попробовать снова
          </button>
          <button type="button" className={ui.btn} onClick={leave}>
            Выйти
          </button>
        </div>
      </div>
    </div>
  );
}

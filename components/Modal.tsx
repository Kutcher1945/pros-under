'use client';

import clsx from 'clsx';
import { type FormEvent, type ReactNode, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { Icon } from './Icon';
import styles from './modal.module.css';
import { ui } from './ui';

/** Id of the AppShell wrapper made inert while a dialog is open. */
export const APP_ROOT_ID = 'opeka-app';
let openDialogs = 0;

type Props = {
  title: string;
  submitLabel?: string;
  wide?: boolean;
  onClose: () => void;
  /** Return an error message to keep the dialog open, or null to close it. */
  onSubmit: (form: FormData) => Promise<string | null> | string | null;
  /** Extra footer buttons, placed before the submit button. */
  extraActions?: ReactNode;
  children: ReactNode;
};

export function Modal({ title, submitLabel = 'Сохранить', wide = false, onClose, onSubmit, extraActions, children }: Props) {
  const titleId = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  // Closing mid-save would hide a result that still lands, so it waits.
  const requestClose = () => {
    if (!isPending) onClose();
  };
  const closeRef = useRef(requestClose);
  useEffect(() => {
    closeRef.current = requestClose;
  });

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    formRef.current?.querySelector<HTMLElement>('input:not([readonly]):not([type="hidden"]), textarea:not([readonly]), select')?.focus();
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    // Tab and screen readers stay inside the dialog: the app behind is inert.
    const appRoot = document.getElementById(APP_ROOT_ID);
    openDialogs += 1;
    appRoot?.setAttribute('inert', '');
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') closeRef.current();
    }
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      openDialogs -= 1;
      if (openDialogs === 0) appRoot?.removeAttribute('inert');
      document.body.style.overflow = overflow;
      previouslyFocused?.focus?.();
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsPending(true);
    setError(null);
    try {
      const message = await onSubmit(new FormData(event.currentTarget));
      if (message) setError(message);
      else onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось выполнить действие.');
    } finally {
      setIsPending(false);
    }
  }

  return createPortal(
    <div className={styles.overlay} onMouseDown={(e) => e.target === e.currentTarget && requestClose()}>
      <section className={clsx(styles.card, wide && styles.wide)} role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className={styles.head}>
          <h2 id={titleId}>{title}</h2>
          <button type="button" className={styles.close} onClick={requestClose} aria-label="Закрыть" disabled={isPending}>
            <Icon name="x" />
          </button>
        </div>
        <form ref={formRef} className={styles.form} onSubmit={handleSubmit} noValidate>
          <div className={styles.body}>
            {children}
            {error && (
              <p className={styles.error} role="alert">
                {error}
              </p>
            )}
          </div>
          <div className={styles.foot}>
            <button type="button" className={ui.btn} onClick={requestClose} disabled={isPending}>
              Отмена
            </button>
            {extraActions}
            <button type="submit" className={clsx(ui.btn, ui.primary)} disabled={isPending}>
              {isPending ? 'Сохранение…' : submitLabel}
            </button>
          </div>
        </form>
      </section>
    </div>,
    document.body,
  );
}

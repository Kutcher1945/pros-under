'use client';

import clsx from 'clsx';
import { useState } from 'react';

import { canEditCase } from '@/lib/access';
import { formatDate } from '@/lib/dates';
import { canPreview, openDocument } from '@/lib/files';
import type { Case, CaseDocument } from '@/lib/types';

import { Icon } from '../Icon';
import { useSession } from '../Session';
import { useToast } from '../Toast';
import { EmptyState, ui } from '../ui';
import styles from './case.module.css';

type ListProps = {
  docs: CaseDocument[];
  /** Highlights the document attached to the current archive request. */
  primaryId?: string;
  /** Adds an «Открыть» preview button for PDFs and images. */
  withPreview?: boolean;
};

export function DocumentList({ docs, primaryId, withPreview = false }: ListProps) {
  const toast = useToast();
  const [busyId, setBusyId] = useState<string | null>(null);

  async function open(doc: CaseDocument, mode: 'open' | 'download') {
    setBusyId(doc.id);
    const error = await openDocument(doc, mode);
    setBusyId(null);
    if (error) toast(error);
  }

  return (
    <div className={styles.docs}>
      {docs.map((d) => (
        <div key={d.id} className={styles.doc}>
          <span className={styles.docIcon}>
            <Icon name="doc" />
          </span>
          <div className={styles.docInfo}>
            <strong>{d.name}</strong>
            <small>
              {d.type} · {formatDate(d.date)}
              {d.number ? ` · ${d.number}` : ''}
            </small>
            {d.id === primaryId && <small className={styles.attached}>Приложен к текущему запросу</small>}
          </div>
          <div className={ui.actions}>
            {withPreview && canPreview(d) && (
              <button type="button" className={clsx(ui.btn, ui.small)} onClick={() => open(d, 'open')} disabled={busyId === d.id}>
                Открыть
              </button>
            )}
            <button type="button" className={clsx(ui.btn, ui.small)} onClick={() => open(d, 'download')} disabled={busyId === d.id}>
              {busyId === d.id ? 'Загрузка…' : 'Скачать'}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

export function CaseDocuments({ c, onAdd }: { c: Case; onAdd: () => void }) {
  const { me } = useSession();
  return (
    <>
      <div className={styles.statusBar}>
        <h3 style={{ margin: 0 }}>Материалы дела · {c.docs.length}</h3>
        {canEditCase(me, c) && (
          <button type="button" className={ui.btn} onClick={onAdd}>
            <Icon name="plus" />
            Добавить документ
          </button>
        )}
      </div>
      {c.docs.length ? <DocumentList docs={c.docs} /> : <EmptyState title="Документов пока нет" />}
    </>
  );
}

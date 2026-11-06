'use client';

import clsx from 'clsx';

import { canDecideArchive, userName } from '@/lib/access';
import { formatDate } from '@/lib/dates';
import type { Case } from '@/lib/types';

import { useSession } from '../Session';
import { ui } from '../ui';
import styles from './case.module.css';

const TITLES = {
  pending: 'Архивирование на проверке ОВД',
  returned: 'Запрос архивирования возвращён',
  approved: 'Архивирование одобрено',
} as const;

export function ArchiveNotice({ c, onReview }: { c: Case; onReview: () => void }) {
  const { state, me } = useSession();
  const request = c.archiveRequest;
  if (!request) return null;
  return (
    <div className={clsx(styles.archive, request.status === 'returned' && styles.archiveReturned)} role="status">
      <strong>{TITLES[request.status]}</strong>
      <div>
        {request.reason} · Предлагаемая дата завершения: {formatDate(request.date)}
      </div>
      <div className={ui.muted} style={{ fontSize: 12 }}>
        Отправил: {userName(state, request.author)} · {formatDate(request.created, true)}
      </div>
      {request.feedback && <div style={{ marginTop: 6 }}>Причина возврата: {request.feedback}</div>}
      {request.status === 'pending' && (
        <>
          <div style={{ marginTop: 6 }}>Дело остаётся активным. Решение принимает руководитель ОВД своего подразделения.</div>
          {canDecideArchive(me, c) && (
            <div className={ui.actions} style={{ marginTop: 10 }}>
              <button type="button" className={clsx(ui.btn, ui.small, ui.primary)} onClick={onReview}>
                Рассмотреть запрос и документы
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

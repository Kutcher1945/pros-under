'use client';

import clsx from 'clsx';

import { canDelegate, findUser, hasAuthority, isLate, ROLE_LABELS, userName } from '@/lib/access';
import { formatDate } from '@/lib/dates';
import type { Case, Remark, Signal } from '@/lib/types';

import { Icon } from '../Icon';
import { useSession } from '../Session';
import { Badge, EmptyState, SignalBadge, ui } from '../ui';
import styles from './case.module.css';

export type SignalCommand = 'reply' | 'accept' | 'return' | 'cancel' | 'delegate';

function SignalActions({ s, onCommand }: { s: Signal; onCommand: (command: SignalCommand, signal: Signal) => void }) {
  const { state, me } = useSession();
  const isAuthor = s.author === me.id;
  return (
    <div className={styles.remarkActions}>
      {s.status === 'open' && s.executor === me.id && (
        <button type="button" className={clsx(ui.btn, ui.small, ui.primary)} onClick={() => onCommand('reply', s)}>
          Отправить на проверку
        </button>
      )}
      {s.status === 'review' && isAuthor && (
        <>
          <button type="button" className={clsx(ui.btn, ui.small, ui.primary)} onClick={() => onCommand('accept', s)}>
            <Icon name="check" />
            Принять
          </button>
          <button type="button" className={clsx(ui.btn, ui.small)} onClick={() => onCommand('return', s)}>
            Вернуть на доработку
          </button>
        </>
      )}
      {s.status !== 'closed' && isAuthor && (
        <button type="button" className={clsx(ui.btn, ui.small, ui.danger)} onClick={() => onCommand('cancel', s)}>
          Отменить замечание
        </button>
      )}
      {canDelegate(state, me, s) && (
        <button type="button" className={clsx(ui.btn, ui.small)} onClick={() => onCommand('delegate', s)}>
          Передать инспектору
        </button>
      )}
    </div>
  );
}

function RemarkCard({ r, onCommand }: { r: Remark; onCommand: (command: SignalCommand, signal: Signal) => void }) {
  const { state, today } = useSession();
  const author = findUser(state, r.author);
  return (
    <article className={clsx(styles.remark, r.required && styles.remarkSignal, r.required && r.status === 'closed' && styles.remarkClosed)}>
      <div className={styles.remarkTop}>
        <div>
          <strong>{author?.name ?? 'Не назначен'}</strong>
          <div className={styles.remarkMeta}>
            {author ? ROLE_LABELS[author.role] : ''} · {formatDate(r.created)}
          </div>
        </div>
        <div className={ui.badgeStack}>
          {r.required ? <SignalBadge status={r.status} /> : <Badge>Комментарий</Badge>}
          {r.required && isLate(r, today) && <Badge tone="red">Просрочено</Badge>}
        </div>
      </div>
      <p className={styles.remarkText}>{r.text}</p>
      {r.required && (
        <div className={styles.remarkMeta}>
          {r.section} · Исполнитель: <b>{userName(state, r.executor)}</b> · Срок: <b>{formatDate(r.due)}</b>
        </div>
      )}
      {r.events.map((e, i) => (
        <div key={`${e.at}-${i}`} className={styles.event}>
          <strong>{userName(state, e.by)}</strong>
          <span className={styles.remarkMeta}> · {formatDate(e.at, true)}</span>
          <div>{e.text}</div>
        </div>
      ))}
      {r.required && <SignalActions s={r} onCommand={onCommand} />}
    </article>
  );
}

type Props = {
  c: Case;
  onAdd: () => void;
  onCommand: (command: SignalCommand, signal: Signal) => void;
};

export function CaseRemarks({ c, onAdd, onCommand }: Props) {
  const { state, me } = useSession();
  const remarks = state.remarks.filter((r) => r.caseId === c.id).reverse();
  return (
    <>
      <div className={styles.statusBar}>
        <h3 style={{ margin: 0 }}>Обсуждение карточки</h3>
        {hasAuthority(state, me, c) && (
          <button type="button" className={ui.btn} onClick={onAdd}>
            <Icon name="plus" />
            Добавить комментарий
          </button>
        )}
      </div>
      {remarks.length ? (
        <div className={styles.remarks}>
          {remarks.map((r) => (
            <RemarkCard key={r.id} r={r} onCommand={onCommand} />
          ))}
        </div>
      ) : (
        <EmptyState title="Комментариев пока нет" />
      )}
    </>
  );
}

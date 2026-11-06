import clsx from 'clsx';
import type { ReactNode } from 'react';

import { initials } from '@/lib/access';
import { formatDate } from '@/lib/dates';
import type { Case, ReviewState, SignalStatus } from '@/lib/types';

import { Icon, type IconName } from './Icon';
import styles from './ui.module.css';

export { styles as ui };

export type Tone = 'gray' | 'green' | 'orange' | 'red' | 'blue';

export function Badge({ tone = 'gray', children }: { tone?: Tone; children: ReactNode }) {
  return <span className={clsx(styles.badge, tone !== 'gray' && styles[tone])}>{children}</span>;
}

const REVIEW: Record<ReviewState, [string, Tone]> = {
  new: ['Не проверена', 'orange'],
  checked: ['Проверена', 'green'],
  changed: ['Изменена после проверки', 'blue'],
};

export function ReviewBadge({ review }: { review: ReviewState }) {
  const [label, tone] = REVIEW[review];
  return <Badge tone={tone}>{label}</Badge>;
}

export function CaseStatusBadge({ c, long = false }: { c: Case; long?: boolean }) {
  const active = c.status === 'active';
  return <Badge tone={active ? 'green' : 'gray'}>{active ? (long ? 'Активное дело' : 'Активное') : long ? 'Архивное дело' : 'Архивное'}</Badge>;
}

const SIGNAL: Record<SignalStatus, [string, Tone]> = {
  open: ['Открыто', 'orange'],
  review: ['На проверке', 'blue'],
  closed: ['Закрыто', 'green'],
};

export function SignalBadge({ status }: { status: SignalStatus }) {
  const [label, tone] = SIGNAL[status];
  return <Badge tone={tone}>{label}</Badge>;
}

export function PageHead({ eyebrow, title, subtitle, actions }: { eyebrow: string; title: ReactNode; subtitle: ReactNode; actions?: ReactNode }) {
  return (
    <div className={styles.pageHead}>
      <div>
        <span className={styles.eyebrow}>{eyebrow}</span>
        <h1>{title}</h1>
        <p className={styles.subtitle}>{subtitle}</p>
      </div>
      {actions && <div className={styles.actions}>{actions}</div>}
    </div>
  );
}

export function Note({ warn = false, children }: { warn?: boolean; children: ReactNode }) {
  return <p className={clsx(styles.note, warn && styles.noteWarn)}>{children}</p>;
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className={styles.empty}>
      <Icon name="check" />
      <strong>{title}</strong>
      {hint}
    </div>
  );
}

export function Footer({ today }: { today: string }) {
  return (
    <div className={styles.footer}>
      <span>Данные на {formatDate(today)}</span>
      <span>Карточка → замечание → исправление → проверка</span>
    </div>
  );
}

export function Avatar({ name, icon }: { name?: string; icon?: IconName }) {
  return <span className={styles.avatar}>{icon ? <Icon name={icon} /> : initials(name ?? '')}</span>;
}

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  count?: number;
}

export function Segmented<T extends string>({ options, value, onChange, label }: { options: SegmentOption<T>[]; value: T; onChange: (v: T) => void; label: string }) {
  return (
    <div className={styles.segmented} role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" aria-pressed={value === o.value} onClick={() => onChange(o.value)}>
          {o.label}
          {o.count !== undefined && <span className={styles.count}>{o.count}</span>}
        </button>
      ))}
    </div>
  );
}

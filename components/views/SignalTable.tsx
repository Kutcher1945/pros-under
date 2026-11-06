'use client';

import clsx from 'clsx';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { isLate, userName } from '@/lib/access';
import { formatDate } from '@/lib/dates';
import type { Signal } from '@/lib/types';

import { Icon } from '../Icon';
import { useSession } from '../Session';
import { EmptyState, SignalBadge, ui } from '../ui';

export function SignalTable({ signals }: { signals: Signal[] }) {
  const { state, today } = useSession();
  const router = useRouter();
  return (
    <>
      <div className={ui.tableWrap}>
        <table>
          <thead>
            <tr>
              <th>Дело</th>
              <th>Что требуется исправить</th>
              <th>Автор / исполнитель</th>
              <th>Срок</th>
              <th>Состояние</th>
              <th aria-label="Открыть" />
            </tr>
          </thead>
          <tbody>
            {signals.map((s) => {
              const c = state.cases.find((x) => x.id === s.caseId);
              if (!c) return null;
              const href = `/registry/${c.id}?tab=comments`;
              const late = isLate(s, today);
              return (
                <tr key={s.id} className={ui.clickRow} onClick={() => router.push(href)}>
                  <td>
                    <Link href={href} className={ui.rowLink} onClick={(e) => e.stopPropagation()}>
                      {c.name}
                    </Link>
                    <span className={clsx(ui.micro, ui.muted)}>{c.number}</span>
                  </td>
                  <td style={{ maxWidth: 360 }}>
                    {s.text}
                    <span className={clsx(ui.micro, ui.muted)}>{s.section}</span>
                  </td>
                  <td>
                    {userName(state, s.author)}
                    <span className={clsx(ui.micro, ui.muted)}>Исп.: {userName(state, s.executor)}</span>
                  </td>
                  <td className={late ? ui.lateText : undefined} style={{ whiteSpace: 'nowrap', fontWeight: 600 }}>
                    {formatDate(s.due)}
                    {late && <span className={ui.micro}>Просрочено</span>}
                  </td>
                  <td>
                    <SignalBadge status={s.status} />
                  </td>
                  <td>
                    <span className={ui.chevron}>
                      <Icon name="arrow" size={16} />
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {!signals.length && <EmptyState title="Здесь пока нет замечаний" hint="Новые замечания появятся после направления автором." />}
      <div className={ui.panelFoot}>
        <span>{signals.length} замечаний</span>
        <span>Откройте карточку для ответа и проверки</span>
      </div>
    </>
  );
}

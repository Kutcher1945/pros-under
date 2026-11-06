'use client';

import clsx from 'clsx';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { isCityWide, scopeLabel } from '@/lib/access';
import { formatDate } from '@/lib/dates';
import { overviewStats, unitRows } from '@/lib/views';

import { Icon } from '../Icon';
import { useSession } from '../Session';
import { Avatar, Badge, Footer, Note, PageHead, ui } from '../ui';

function registryHref(params: Record<string, string>) {
  return `/registry?${new URLSearchParams(params).toString()}`;
}

export function OverviewView() {
  const { state, me, today } = useSession();
  const router = useRouter();
  const isProsecutor = isCityWide(me);
  const stats = overviewStats(state, me, today);
  const rows = unitRows(state, me, today);

  return (
    <>
      <PageHead
        eyebrow={scopeLabel(me)}
        title={isProsecutor ? 'Общий обзор' : 'Обзор подразделения'}
        subtitle={isProsecutor ? 'Дела города и контроль исполнения замечаний.' : 'Только важное: дела, проверка карточек и исправление замечаний.'}
        actions={
          <Badge>
            <Icon name="clock" size={13} />
            {formatDate(today)}
          </Badge>
        }
      />

      <div className={ui.stats}>
        {stats.map((s) => (
          <Link key={s.title} href={registryHref({ filter: s.filter })} className={clsx(ui.stat, s.alert && ui.statAlert)}>
            <span className={ui.statValue}>{s.value}</span>
            <span className={ui.statLabel}>{s.title}</span>
            <span className={ui.statNote}>{s.note}</span>
          </Link>
        ))}
      </div>

      <section className={ui.panel}>
        <div className={ui.panelHead}>
          <h2>{isProsecutor ? 'Подразделения ОВД' : 'Работа инспекторов'}</h2>
          <p className={ui.panelHint}>Нажмите строку, чтобы открыть дела</p>
        </div>
        <div className={ui.tableWrap}>
          <table>
            <thead>
              <tr>
                <th>{isProsecutor ? 'Подразделение' : 'Инспектор'}</th>
                <th>Активные дела</th>
                <th>Требуют проверки</th>
                <th>Замечания</th>
                <th>Просрочено</th>
                <th aria-label="Открыть" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const href = registryHref({ unit: row.key });
                return (
                  <tr key={row.key} className={ui.clickRow} onClick={() => router.push(href)}>
                    <td>
                      <div className={ui.person}>
                        {row.isOrg ? <Avatar icon="folder" /> : <Avatar name={row.label} />}
                        <Link href={href} className={ui.rowLink} onClick={(e) => e.stopPropagation()}>
                          {row.label}
                        </Link>
                      </div>
                    </td>
                    <td>{row.active}</td>
                    <td>{row.toReview}</td>
                    <td>{row.open}</td>
                    <td>{row.late ? <Badge tone="red">{row.late} просрочено</Badge> : '—'}</td>
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
      </section>

      <Note>
        {me.role === 'chief'
          ? 'Проверка карточки и исправление замечаний — отдельные действия. Отметка «Проверена» не закрывает открытые замечания.'
          : 'Оставляйте комментарии прямо в карточке. Если требуется исправление, укажите исполнителя и срок — замечание появится в его рабочем списке.'}
      </Note>
      <Footer today={today} />
    </>
  );
}

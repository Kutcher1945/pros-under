'use client';

import clsx from 'clsx';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

import { activeInspectors, canCreateCase, isCityWide, isLate, openSignalsOf, scopeLabel, userName, visibleCases } from '@/lib/access';
import { ageOn, formatDate } from '@/lib/dates';
import { casesCsv } from '@/lib/export';
import { downloadBlob } from '@/lib/files';
import { filterCases, parseRegistryFilter, registryFilterOptions } from '@/lib/views';
import type { Case } from '@/lib/types';

import { CaseFormModal } from '../forms/CaseFormModal';
import { Icon } from '../Icon';
import { useSession } from '../Session';
import { useToast } from '../Toast';
import { Avatar, Badge, CaseStatusBadge, EmptyState, Footer, PageHead, ReviewBadge, ui } from '../ui';

function CaseRow({ c }: { c: Case }) {
  const { state, me, today } = useSession();
  const router = useRouter();
  const open = openSignalsOf(state, c);
  const href = `/registry/${c.id}`;
  return (
    <tr className={ui.clickRow} onClick={() => router.push(href)}>
      <td>
        <div className={ui.person}>
          <Avatar name={c.name} />
          <div>
            <Link href={href} className={ui.rowLink} onClick={(e) => e.stopPropagation()}>
              {c.name}
            </Link>
            <span className={clsx(ui.micro, ui.muted)}>
              {c.number} · {ageOn(c.dob, today)} лет
            </span>
          </div>
        </div>
      </td>
      <td style={{ maxWidth: 240 }}>
        {c.grounds[0]?.category ?? '—'}
        <span className={clsx(ui.micro, ui.muted)}>{formatDate(c.registered)}</span>
      </td>
      <td>
        {me.role === 'inspector' ? c.district : userName(state, c.inspector)}
        <span className={clsx(ui.micro, ui.muted)}>{c.org}</span>
      </td>
      <td>
        <div className={ui.badgeStack}>
          <CaseStatusBadge c={c} />
          <ReviewBadge review={c.review} />
          {c.archiveRequest?.status === 'pending' && <Badge tone="blue">Архивирование на проверке</Badge>}
        </div>
      </td>
      <td>
        {open.length ? (
          <>
            <Badge tone="orange">{open.length} замеч.</Badge>
            {open.some((s) => isLate(s, today)) && <span className={clsx(ui.micro, ui.lateText)}>Есть просрочка</span>}
          </>
        ) : (
          <span className={ui.muted}>Нет замечаний</span>
        )}
      </td>
      <td>
        <span className={ui.chevron}>
          <Icon name="arrow" size={16} />
        </span>
      </td>
    </tr>
  );
}

export function RegistryView() {
  const { state, me, today } = useSession();
  const toast = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [search, setSearch] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const filter = parseRegistryFilter(params.get('filter'), me);
  const unit = params.get('unit') ?? '';
  const cases = filterCases(state, me, today, { search, filter, unit });
  const total = visibleCases(state, me).length;
  const units: [string, string][] = isCityWide(me) ? state.orgs.map((o) => [o, o]) : activeInspectors(state, me.org).map((u) => [u.id, u.name]);

  function setParam(key: 'filter' | 'unit', value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  function exportCsv() {
    downloadBlob(new Blob([casesCsv(state, cases)], { type: 'text/csv;charset=utf-8' }), `Реестр_дел_${today}.csv`);
    toast('Выгружены только доступные дела');
  }

  return (
    <>
      <PageHead
        eyebrow={scopeLabel(me)}
        title="Реестр дел"
        subtitle={me.role === 'inspector' ? 'Ваши карточки несовершеннолетних и замечания по ним.' : 'Сведения, документы и замечания — в одной карточке.'}
        actions={
          <>
            {canCreateCase(me) && (
              <button type="button" className={clsx(ui.btn, ui.primary)} onClick={() => setIsCreating(true)}>
                <Icon name="plus" />
                Создать карточку
              </button>
            )}
            <button type="button" className={ui.btn} onClick={exportCsv} disabled={!cases.length}>
              <Icon name="download" />
              Экспорт
            </button>
          </>
        }
      />

      <section className={ui.panel}>
        <div className={ui.toolbar}>
          <div className={ui.search}>
            <Icon name="search" />
            <input type="search" className={ui.control} placeholder="ФИО, ИИН или номер дела" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Поиск дел" />
          </div>
          <select className={ui.control} value={filter} onChange={(e) => setParam('filter', e.target.value)} aria-label="Фильтр дел">
            {registryFilterOptions(me).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          {me.role !== 'inspector' && (
            <select className={ui.control} value={unit} onChange={(e) => setParam('unit', e.target.value)} aria-label="Подразделение или инспектор">
              <option value="">{isCityWide(me) ? 'Все подразделения' : 'Все инспекторы'}</option>
              {units.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          )}
        </div>
        <div className={ui.tableWrap}>
          <table>
            <thead>
              <tr>
                <th>Несовершеннолетний</th>
                <th>Основание и дата учёта</th>
                <th>{me.role === 'inspector' ? 'Район' : 'Ответственный'}</th>
                <th>Состояние / проверка</th>
                <th>Замечания</th>
                <th aria-label="Открыть" />
              </tr>
            </thead>
            <tbody>
              {cases.map((c) => (
                <CaseRow key={c.id} c={c} />
              ))}
            </tbody>
          </table>
        </div>
        {!cases.length && <EmptyState title="Дела не найдены" hint="Попробуйте изменить поиск или фильтры." />}
        <div className={ui.panelFoot}>
          <span>
            Показано {cases.length} из {total} дел
          </span>
          <span>Сведения доступны в пределах вашей роли</span>
        </div>
      </section>
      <Footer today={today} />

      {isCreating && <CaseFormModal onClose={() => setIsCreating(false)} onSaved={(id) => router.push(`/registry/${id}`)} />}
    </>
  );
}

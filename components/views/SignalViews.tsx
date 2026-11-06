'use client';

import { useState } from 'react';

import { scopeLabel } from '@/lib/access';
import { inboxSignals, openScopedSignals, type SignalBox, taskCounts, taskSignals, type TaskTab } from '@/lib/views';

import { useSession } from '../Session';
import { Footer, Note, PageHead, Segmented, type SegmentOption, ui } from '../ui';
import { SignalTable } from './SignalTable';

export function SignalsView() {
  const { state, me, today } = useSession();
  const [box, setBox] = useState<SignalBox>('incoming');
  const options: SegmentOption<SignalBox>[] =
    me.role === 'chief' || me.role === 'superadmin'
      ? [
          { value: 'incoming', label: me.role === 'chief' ? 'Входящие от прокурора' : 'Назначенные мне', count: inboxSignals(state, me, 'incoming').length },
          { value: 'outgoing', label: me.role === 'chief' ? 'Отправленные инспекторам' : 'Отправленные мной', count: inboxSignals(state, me, 'outgoing').length },
        ]
      : [{ value: 'incoming', label: 'Мои замечания' }];

  return (
    <>
      <PageHead eyebrow={scopeLabel(me)} title="Сигналы надзора" subtitle="Замечания по карточкам. Исправьте сведения и отправьте результат автору на проверку." />
      <section className={ui.panel}>
        <div className={ui.segmentedBar}>
          <Segmented label="Вид списка" options={options} value={box} onChange={setBox} />
        </div>
        <SignalTable signals={inboxSignals(state, me, box)} />
      </section>
      <Footer today={today} />
    </>
  );
}

const TASK_TABS: [TaskTab, string][] = [
  ['all', 'Все'],
  ['today', 'Сегодня'],
  ['late', 'Просроченные'],
  ['review', 'На проверке'],
];

export function TasksView() {
  const { state, me, today } = useSession();
  const [tab, setTab] = useState<TaskTab>('all');
  const all = openScopedSignals(state, me);
  const counts = taskCounts(all, today);

  return (
    <>
      <PageHead eyebrow={scopeLabel(me)} title="Задачи и сроки" subtitle="Единый список незавершённых замечаний вашего подразделения." />
      <section className={ui.panel}>
        <div className={ui.segmentedBar}>
          <Segmented label="Срок" value={tab} onChange={setTab} options={TASK_TABS.map(([value, label]) => ({ value, label, count: counts[value] }))} />
        </div>
        <SignalTable signals={taskSignals(all, today, tab)} />
      </section>
      <Note>Срок исправления устанавливает автор замечания. Это организационный срок; он не подменяет сроки, установленные законодательством. Просрочка сохраняется в истории после исполнения.</Note>
      <Footer today={today} />
    </>
  );
}

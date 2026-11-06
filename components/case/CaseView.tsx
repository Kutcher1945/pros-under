'use client';

import clsx from 'clsx';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

import { actsAsChief, canEditCase, canSee, hasAuthority, openSignalsOf, scopeLabel } from '@/lib/access';
import { ageOn } from '@/lib/dates';
import { opekaApi } from '@/lib/opeka-api';
import { mutate } from '@/lib/store';
import type { Signal } from '@/lib/types';

import { ArchiveRequestModal, ArchiveReviewModal } from '../forms/ArchiveModals';
import { DocumentModal, GroundModal, ReassignModal, RemarkModal } from '../forms/CaseActionModals';
import { CaseFormModal } from '../forms/CaseFormModal';
import { DelegateModal, SignalReplyModal } from '../forms/SignalModals';
import { Icon } from '../Icon';
import { useSession } from '../Session';
import { useToast } from '../Toast';
import { Badge, CaseStatusBadge, EmptyState, Footer, PageHead, ReviewBadge, Segmented, ui } from '../ui';
import { ArchiveNotice } from './ArchiveNotice';
import styles from './case.module.css';
import { CaseDocuments } from './CaseDocuments';
import { CaseInfo } from './CaseInfo';
import { CaseRemarks, type SignalCommand } from './CaseRemarks';

type Tab = 'info' | 'docs' | 'comments';
const TABS: Tab[] = ['info', 'docs', 'comments'];

type Dialog =
  | { kind: 'edit' | 'remark' | 'reassign' | 'archive' | 'review' | 'document' | 'ground' }
  | { kind: 'reply' | 'return' | 'cancel' | 'delegate'; signal: Signal };

export function CaseView({ id }: { id: string }) {
  const { state, me, today } = useSession();
  const toast = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [dialog, setDialog] = useState<Dialog | null>(null);

  const tabParam = params.get('tab') as Tab | null;
  const tab: Tab = tabParam && TABS.includes(tabParam) ? tabParam : 'info';
  const c = state.cases.find((x) => x.id === id);

  if (!c || !canSee(state, me, c)) {
    return (
      <>
        <Link href="/registry" className={styles.back}>
          <Icon name="back" />
          Вернуться в реестр
        </Link>
        <EmptyState title="Карточка недоступна" hint="Дело не найдено или не входит в ваше рабочее пространство." />
      </>
    );
  }

  const editable = canEditCase(me, c);
  const authority = hasAuthority(state, me, c);
  const open = openSignalsOf(state, c);
  const isChiefOnActive = actsAsChief(me, c) && c.status === 'active';
  const close = () => setDialog(null);

  function setTab(next: Tab) {
    router.replace(next === 'info' ? pathname : `${pathname}?tab=${next}`, { scroll: false });
  }

  async function check() {
    const result = await mutate(() => opekaApi.markChecked(id));
    toast(result.ok ? 'Карточка отмечена проверенной' : result.error);
  }

  async function onCommand(command: SignalCommand, signal: Signal) {
    if (command !== 'accept') return setDialog({ kind: command, signal });
    const result = await mutate(() => opekaApi.accept(signal.id));
    toast(result.ok ? 'Исправление принято' : result.error);
  }

  return (
    <>
      <Link href="/registry" className={styles.back}>
        <Icon name="back" />
        Вернуться в реестр
      </Link>
      <PageHead
        eyebrow={scopeLabel(me)}
        title={c.name}
        subtitle={`${c.number} · ${ageOn(c.dob, today)} лет · ${c.district} район`}
        actions={
          <>
            {editable && (
              <button type="button" className={ui.btn} onClick={() => setDialog({ kind: 'edit' })}>
                <Icon name="edit" />
                Редактировать
              </button>
            )}
            {authority && (
              <button type="button" className={clsx(ui.btn, ui.primary)} onClick={() => setDialog({ kind: 'remark' })}>
                <Icon name="plus" />
                Комментарий
              </button>
            )}
          </>
        }
      />

      <div className={styles.statusBar}>
        <div className={ui.badgeStack}>
          <CaseStatusBadge c={c} long />
          <ReviewBadge review={c.review} />
          {open.length > 0 && <Badge tone="orange">{open.length} открытых замеч.</Badge>}
        </div>
        <div className={ui.actions}>
          {isChiefOnActive && (
            <button type="button" className={clsx(ui.btn, ui.small)} onClick={() => setDialog({ kind: 'reassign' })}>
              Сменить инспектора
            </button>
          )}
          {isChiefOnActive && c.review !== 'checked' && (
            <button type="button" className={clsx(ui.btn, ui.small)} onClick={check}>
              <Icon name="check" />
              Проверено
            </button>
          )}
          {editable && (
            <button type="button" className={clsx(ui.btn, ui.small)} onClick={() => setDialog({ kind: 'archive' })}>
              Запросить архивирование
            </button>
          )}
        </div>
      </div>

      <ArchiveNotice c={c} onReview={() => setDialog({ kind: 'review' })} />

      <section className={ui.panel}>
        <div className={styles.tabsBar}>
          <Segmented
            label="Разделы карточки"
            value={tab}
            onChange={setTab}
            options={[
              { value: 'info', label: 'Основные сведения' },
              { value: 'docs', label: 'Документы', count: c.docs.length },
              { value: 'comments', label: 'Комментарии и замечания', count: state.remarks.filter((r) => r.caseId === c.id).length },
            ]}
          />
        </div>
        <div className={styles.body}>
          {tab === 'info' && <CaseInfo c={c} onAddGround={() => setDialog({ kind: 'ground' })} />}
          {tab === 'docs' && <CaseDocuments c={c} onAdd={() => setDialog({ kind: 'document' })} />}
          {tab === 'comments' && <CaseRemarks c={c} onAdd={() => setDialog({ kind: 'remark' })} onCommand={onCommand} />}
        </div>
      </section>
      <Footer today={today} />

      {dialog?.kind === 'edit' && <CaseFormModal c={c} onClose={close} />}
      {dialog?.kind === 'remark' && <RemarkModal c={c} onClose={close} onSaved={() => setTab('comments')} />}
      {dialog?.kind === 'reassign' && <ReassignModal c={c} onClose={close} />}
      {dialog?.kind === 'document' && <DocumentModal c={c} onClose={close} />}
      {dialog?.kind === 'ground' && <GroundModal c={c} onClose={close} />}
      {dialog?.kind === 'archive' && <ArchiveRequestModal c={c} onClose={close} />}
      {dialog?.kind === 'review' && <ArchiveReviewModal c={c} onClose={close} />}
      {(dialog?.kind === 'reply' || dialog?.kind === 'return' || dialog?.kind === 'cancel') && <SignalReplyModal signal={dialog.signal} kind={dialog.kind} onClose={close} />}
      {dialog?.kind === 'delegate' && <DelegateModal signal={dialog.signal} inspectorId={c.inspector} onClose={close} />}
    </>
  );
}

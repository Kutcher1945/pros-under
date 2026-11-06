'use client';

import clsx from 'clsx';
import { useState } from 'react';

import { userName } from '@/lib/access';
import { ARCHIVE_REASONS, COMPLETION_DOCUMENT } from '@/lib/constants';
import { formatDate } from '@/lib/dates';
import { uploadError } from '@/lib/files';
import { opekaApi } from '@/lib/opeka-api';
import { mutate } from '@/lib/store';
import type { Case, CaseDocument } from '@/lib/types';

import { DocumentList } from '../case/CaseDocuments';
import { GroundRow } from '../case/CaseInfo';
import caseStyles from '../case/case.module.css';
import { Modal } from '../Modal';
import { useSession } from '../Session';
import { useToast } from '../Toast';
import { Badge, Note, ui } from '../ui';
import { FileField, fileOf, Grid, Hint, ReadonlyField, Section, SelectField, str, TextAreaField, TextField } from './fields';

export function ArchiveRequestModal({ c, onClose }: { c: Case; onClose: () => void }) {
  const { today } = useSession();
  const toast = useToast();
  const previous = c.archiveRequest;

  async function submit(form: FormData) {
    const fileProblem = uploadError(fileOf(form));
    if (fileProblem) return fileProblem;
    const result = await mutate(() => opekaApi.requestArchive(c.id, form));
    if (!result.ok) return result.error;
    toast('Запрос направлен руководителю ОВД');
    return null;
  }

  return (
    <Modal title="Запрос на архивирование" submitLabel="Отправить руководителю ОВД" onClose={onClose} onSubmit={submit}>
      <Grid>
        <TextField name="date" label="Предлагаемая дата завершения" type="date" defaultValue={previous?.date ?? today} min={c.registered} required />
        <SelectField name="reason" label="Причина" options={ARCHIVE_REASONS} defaultValue={previous?.reason ?? ARCHIVE_REASONS[0]} />
        <FileField label="Подтверждающий документ" full />
        <TextAreaField name="text" label="Пояснение" required defaultValue={previous?.text} />
      </Grid>
      <Hint>Запрос поступит руководителю вашего ОВД. До одобрения дело останется активным; изменение карточки будет временно недоступно. Открытые замечания сохранятся.</Hint>
    </Modal>
  );
}

function ArchiveReviewDetails({ c }: { c: Case }) {
  const { state } = useSession();
  const request = c.archiveRequest;
  if (!request) return null;
  const isCompletion = (d: CaseDocument) => d.id === request.docId || d.type === COMPLETION_DOCUMENT;
  const completion = c.docs.filter(isCompletion);
  const others = c.docs.filter((d) => !isCompletion(d));
  return (
    <>
      <div className={caseStyles.reviewIntro}>
        <Badge tone="blue">Запрос на снятие с учёта</Badge>
        <span className={ui.muted} style={{ fontSize: 12 }}>
          {c.number}
        </span>
      </div>
      <Section>Карточка несовершеннолетнего</Section>
      <Grid>
        <ReadonlyField label="ФИО" value={c.name} />
        <ReadonlyField label="Дата рождения" value={formatDate(c.dob)} />
        <ReadonlyField label="ИИН" value={c.iin || 'Не внесён'} />
        <ReadonlyField label="Ответственный инспектор" value={userName(state, c.inspector)} />
        <ReadonlyField label="Подразделение" value={c.org} />
        <ReadonlyField label="Дата постановки на учёт" value={formatDate(c.registered)} />
      </Grid>
      <Section>Действующие основания учёта</Section>
      {c.grounds.map((g, i) => (
        <GroundRow key={`${g.number}-${i}`} ground={g} />
      ))}
      <Section>Основание снятия с учёта</Section>
      <Grid>
        <ReadonlyField label="Причина снятия" value={request.reason} />
        <ReadonlyField label="Предлагаемая дата завершения" value={formatDate(request.date)} />
        <ReadonlyField label="Запрос направил" value={userName(state, request.author)} />
        <ReadonlyField label="Дата отправки запроса" value={formatDate(request.created, true)} />
        <ReadonlyField label="Пояснение инспектора" value={request.text} full multiline />
      </Grid>
      <Section>Документы по снятию с учёта</Section>
      {completion.length ? (
        <DocumentList docs={completion} primaryId={request.docId} withPreview />
      ) : (
        <Note warn>Подтверждающие документы не найдены. Верните запрос инспектору для уточнения.</Note>
      )}
      <details className={caseStyles.reviewAll}>
        <summary>Все остальные документы дела ({others.length})</summary>
        <DocumentList docs={others} withPreview />
      </details>
    </>
  );
}

/** Chief's review of an archive request: case data, request and documents; approve or return. */
export function ArchiveReviewModal({ c, onClose }: { c: Case; onClose: () => void }) {
  const toast = useToast();
  const [isReturning, setIsReturning] = useState(false);

  async function submit(form: FormData) {
    const decision = isReturning ? { approve: false, feedback: str(form, 'feedback') } : { approve: true };
    const result = await mutate(() => opekaApi.decideArchive(c.id, decision));
    if (!result.ok) return result.error;
    toast(isReturning ? 'Запрос возвращён инспектору' : 'Архивирование одобрено');
    return null;
  }

  return (
    <Modal
      title={isReturning ? 'Вернуть запрос инспектору' : 'Рассмотрение снятия с учёта'}
      submitLabel={isReturning ? 'Вернуть инспектору' : 'Одобрить и архивировать'}
      wide
      onClose={onClose}
      onSubmit={submit}
      extraActions={
        !isReturning && (
          <button type="button" className={clsx(ui.btn)} onClick={() => setIsReturning(true)}>
            Вернуть инспектору
          </button>
        )
      }
    >
      <ArchiveReviewDetails c={c} />
      {isReturning ? (
        <div style={{ marginTop: 18 }}>
          <TextAreaField name="feedback" label="Причина возврата" required />
        </div>
      ) : (
        <Hint>После одобрения карточка перейдёт в архив. Проверьте основание снятия и подтверждающие документы. Незакрытые замечания сохранятся.</Hint>
      )}
    </Modal>
  );
}

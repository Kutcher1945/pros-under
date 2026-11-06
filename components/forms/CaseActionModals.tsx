'use client';

import { useState } from 'react';

import { activeInspectors, signalExecutors, ROLE_LABELS, userName } from '@/lib/access';
import { CASE_SECTIONS, DEFAULT_SIGNAL_DAYS, DOCUMENT_TYPES } from '@/lib/constants';
import { offsetDay } from '@/lib/dates';
import { uploadError } from '@/lib/files';
import { opekaApi } from '@/lib/opeka-api';
import { mutate } from '@/lib/store';
import type { Case } from '@/lib/types';

import { Modal } from '../Modal';
import { useSession } from '../Session';
import { useToast } from '../Toast';
import { FileField, fileOf, form as formStyles, Grid, Hint, SelectField, str, TextAreaField, TextField } from './fields';

type CaseModalProps = { c: Case; onClose: () => void };

/** Uploads the form (multipart; field names match the backend) after a quick file check. */
async function upload(form: FormData, call: (form: FormData) => Promise<unknown>) {
  const fileProblem = uploadError(fileOf(form));
  if (fileProblem) return fileProblem;
  const result = await mutate(() => call(form));
  return result.ok ? null : result.error;
}

export function DocumentModal({ c, onClose }: CaseModalProps) {
  const { today } = useSession();
  const toast = useToast();

  async function submit(form: FormData) {
    const error = await upload(form, (f) => opekaApi.addDocument(c.id, f));
    if (!error) toast('Документ добавлен');
    return error;
  }

  return (
    <Modal title="Добавить документ" submitLabel="Добавить" onClose={onClose} onSubmit={submit}>
      <Grid>
        <SelectField name="type" label="Тип документа" options={DOCUMENT_TYPES} defaultValue="Индивидуальный план" />
        <TextField name="date" label="Дата документа" type="date" defaultValue={today} max={today} required />
        <TextField name="number" label="Номер при наличии" />
        <FileField label="Файл" />
      </Grid>
      <Hint>Дата документа и время загрузки сохраняются отдельно. Файл хранится на сервере и доступен только в пределах ролей.</Hint>
    </Modal>
  );
}

export function GroundModal({ c, onClose }: CaseModalProps) {
  const { state, today } = useSession();
  const toast = useToast();

  async function submit(form: FormData) {
    const error = await upload(form, (f) => opekaApi.addGround(c.id, f));
    if (!error) toast('Основание добавлено');
    return error;
  }

  return (
    <Modal title="Дополнительное основание" submitLabel="Добавить основание" onClose={onClose} onSubmit={submit}>
      <Grid>
        <SelectField name="category" label="Категория" options={state.categories} defaultValue={state.categories[0]} />
        <TextField name="type" label="Вид документа" required />
        <TextField name="number" label="Номер при наличии" />
        <TextField name="date" label="Дата документа" type="date" defaultValue={today} max={today} required />
        <FileField label="Документ основания" full />
      </Grid>
    </Modal>
  );
}

export function RemarkModal({ c, onClose, onSaved }: CaseModalProps & { onSaved: () => void }) {
  const { state, me, today } = useSession();
  const toast = useToast();
  const [isRequired, setIsRequired] = useState(false);
  const executors = signalExecutors(state, me, c).map((id): [string, string] => {
    const role = state.users.find((u) => u.id === id)?.role;
    return [id, `${userName(state, id)}${role ? ` · ${ROLE_LABELS[role]}` : ''}`];
  });

  async function submit(form: FormData) {
    const required = form.get('required') === 'on';
    const input = { text: str(form, 'text'), required, section: str(form, 'section'), executor: str(form, 'executor'), due: str(form, 'due') };
    const result = await mutate(() => opekaApi.addRemark(c.id, input));
    if (!result.ok) return result.error;
    toast(required ? 'Замечание направлено исполнителю' : 'Комментарий добавлен');
    onSaved();
    return null;
  }

  return (
    <Modal title="Комментарий к делу" onClose={onClose} onSubmit={submit}>
      <label className={formStyles.check}>
        <input type="checkbox" name="required" checked={isRequired} onChange={(e) => setIsRequired(e.target.checked)} />
        Требует исправления
      </label>
      <TextAreaField name="text" label="Комментарий" required placeholder="Укажите, что нужно уточнить или исправить" />
      {isRequired && (
        <div style={{ marginTop: 16 }}>
          <Grid>
            <SelectField name="section" label="Раздел карточки" options={CASE_SECTIONS} defaultValue={CASE_SECTIONS[0]} />
            <SelectField name="executor" label="Исполнитель" options={executors} defaultValue={c.inspector} />
            <TextField name="due" label="Срок исправления" type="date" defaultValue={offsetDay(DEFAULT_SIGNAL_DAYS)} min={today} required />
          </Grid>
          <Hint>Срок назначается автором. Он относится к исправлению замечания и не подменяет нормативный срок.</Hint>
        </div>
      )}
    </Modal>
  );
}

export function ReassignModal({ c, onClose }: CaseModalProps) {
  const { state } = useSession();
  const toast = useToast();
  const inspectors = activeInspectors(state, c.org).map((u): [string, string] => [u.id, u.name]);

  async function submit(form: FormData) {
    const result = await mutate(() => opekaApi.reassign(c.id, str(form, 'inspector')));
    if (!result.ok) return result.error;
    toast('Ответственный назначен');
    return null;
  }

  return (
    <Modal title="Назначить инспектора" submitLabel="Назначить" onClose={onClose} onSubmit={submit}>
      <SelectField name="inspector" label="Ответственный инспектор" options={inspectors} defaultValue={c.inspector} full />
      <Hint>Открытые замечания прежнему инспектору по этому делу будут переданы новому. Авторы и сроки сохранятся.</Hint>
    </Modal>
  );
}

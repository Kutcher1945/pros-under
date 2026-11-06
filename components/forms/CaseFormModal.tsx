'use client';

import { allActiveInspectors } from '@/lib/access';
import { EDUCATION_STATUSES } from '@/lib/constants';
import { uploadError } from '@/lib/files';
import { opekaApi } from '@/lib/opeka-api';
import { mutate } from '@/lib/store';
import type { Case } from '@/lib/types';

import { Modal } from '../Modal';
import { useSession } from '../Session';
import { useToast } from '../Toast';
import { Note } from '../ui';
import { FileField, fileOf, Grid, Hint, Section, SelectField, str, TextField } from './fields';

// Form field names = backend CaseSerializer fields.
const FIELDS = ['name', 'dob', 'iin', 'district', 'address', 'education', 'school', 'grade', 'rep', 'phone', 'category', 'registered', 'groundType', 'groundNumber', 'groundDate', 'end'];

type Props = {
  /** Omitted when creating a new card. */
  c?: Case;
  onClose: () => void;
  onSaved?: (caseId: string) => void;
};

export function CaseFormModal({ c, onClose, onSaved }: Props) {
  const { state, me, today } = useSession();
  const toast = useToast();
  const ground = c?.grounds[0];
  // The superadmin creates cards on behalf of an inspector; the ОВД follows the inspector.
  const picksInspector = !c && me.role === 'superadmin';
  const inspectors = allActiveInspectors(state).map((u): [string, string] => [u.id, `${u.name} · ${u.org}`]);
  const categories = [...new Set([...state.categories, ...(ground?.category ? [ground.category] : [])])];

  async function submit(form: FormData) {
    if (!c) {
      const fileProblem = uploadError(fileOf(form));
      if (fileProblem) return fileProblem;
    }
    const result = c
      ? await mutate(() => opekaApi.updateCase(c.id, Object.fromEntries(FIELDS.map((k) => [k, str(form, k)]))))
      : await mutate(() => opekaApi.createCase(form));
    if (!result.ok) return result.error;
    toast(c ? 'Изменения сохранены' : 'Карточка создана');
    if (result.caseId) onSaved?.(result.caseId);
    return null;
  }

  return (
    <Modal title={c ? 'Редактировать карточку' : 'Новая карточка дела'} submitLabel={c ? 'Сохранить изменения' : 'Создать карточку'} wide onClose={onClose} onSubmit={submit}>
      {picksInspector && (
        <>
          <Section>Ответственный</Section>
          {inspectors.length ? (
            <Grid>
              <SelectField name="inspector" label="Ответственный инспектор (ОВД — по инспектору)" options={inspectors} defaultValue={inspectors[0][0]} full />
            </Grid>
          ) : (
            <Note warn>Сначала заведите инспектора в разделе «Пользователи»: карточка закрепляется за инспектором и его ОВД.</Note>
          )}
        </>
      )}
      <Section>Сведения о ребёнке</Section>
      <Grid>
        <TextField name="name" label="ФИО" defaultValue={c?.name} required />
        <TextField name="dob" label="Дата рождения" type="date" defaultValue={c?.dob} max={today} required />
        <TextField name="iin" label="ИИН при наличии" defaultValue={c?.iin} placeholder="12 цифр" />
        <SelectField name="district" label="Район проживания" options={state.districts} defaultValue={c?.district ?? state.districts[0]} />
        <TextField name="address" label="Фактический адрес" defaultValue={c?.address} required />
        <SelectField name="education" label="Статус обучения" options={EDUCATION_STATUSES} defaultValue={c?.education ?? EDUCATION_STATUSES[0]} />
        <TextField name="school" label="Организация образования" defaultValue={c?.school} />
        <TextField name="grade" label="Класс или курс" defaultValue={c?.grade} />
        <TextField name="rep" label="ФИО представителя" defaultValue={c?.rep} />
        <TextField name="phone" label="Контакт представителя" type="tel" defaultValue={c?.phone} />
      </Grid>

      <Section>Основание учёта</Section>
      <Grid>
        <SelectField name="category" label="Категория" options={categories} defaultValue={ground?.category ?? categories[0]} />
        <TextField name="registered" label="Официальная дата постановки" type="date" defaultValue={c?.registered} max={today} required />
        <TextField name="groundType" label="Вид документа основания" defaultValue={ground?.type} required />
        <TextField name="groundNumber" label="Номер документа при наличии" defaultValue={ground?.number} />
        <TextField name="groundDate" label="Дата документа основания" type="date" defaultValue={ground?.date} max={today} required />
        <TextField name="end" label="Дата окончания основания, если установлена" type="date" defaultValue={c?.end} />
        {!c && <FileField label="Документ основания" full />}
      </Grid>
      <Hint>* Обязательные поля. Карточка появится как активная и непроверенная. Сведения об официальном учёте должны подтверждаться документом.</Hint>
    </Modal>
  );
}

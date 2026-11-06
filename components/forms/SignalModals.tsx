'use client';

import { activeInspectors } from '@/lib/access';
import { opekaApi } from '@/lib/opeka-api';
import { mutate } from '@/lib/store';
import type { Signal } from '@/lib/types';

import { Modal } from '../Modal';
import { useSession } from '../Session';
import { useToast } from '../Toast';
import { Note } from '../ui';
import { Hint, SelectField, str, TextAreaField } from './fields';

type SignalReply = 'reply' | 'return' | 'cancel';

const REPLY_COPY: Record<SignalReply, { title: string; submit: string; label: string; placeholder: string; done: string }> = {
  reply: {
    title: 'Отправить результат на проверку',
    submit: 'Отправить на проверку',
    label: 'Что исправлено или уточнено',
    placeholder: 'Опишите изменения. Документы добавьте во вкладке «Документы».',
    done: 'Ответ направлен автору замечания',
  },
  return: { title: 'Вернуть на доработку', submit: 'Вернуть', label: 'Причина', placeholder: 'Укажите причину', done: 'Возвращено исполнителю' },
  cancel: { title: 'Отменить замечание', submit: 'Отменить замечание', label: 'Причина', placeholder: 'Укажите причину', done: 'Замечание отменено' },
};

export function SignalReplyModal({ signal, kind, onClose }: { signal: Signal; kind: SignalReply; onClose: () => void }) {
  const toast = useToast();
  const copy = REPLY_COPY[kind];

  async function submit(form: FormData) {
    const result = await mutate(() => opekaApi.respond(signal.id, kind, str(form, 'text')));
    if (!result.ok) return result.error;
    toast(copy.done);
    return null;
  }

  return (
    <Modal title={copy.title} submitLabel={copy.submit} onClose={onClose} onSubmit={submit}>
      <Note>{signal.text}</Note>
      <TextAreaField name="text" label={copy.label} required placeholder={copy.placeholder} />
    </Modal>
  );
}

export function DelegateModal({ signal, inspectorId, onClose }: { signal: Signal; inspectorId: string; onClose: () => void }) {
  const { state, me } = useSession();
  const toast = useToast();
  const inspectors = activeInspectors(state, me.org).map((u): [string, string] => [u.id, u.name]);

  async function submit(form: FormData) {
    const result = await mutate(() => opekaApi.delegate(signal.id, str(form, 'executor')));
    if (!result.ok) return result.error;
    toast('Исполнитель изменён');
    return null;
  }

  return (
    <Modal title="Передать исполнение инспектору" submitLabel="Передать" onClose={onClose} onSubmit={submit}>
      <SelectField name="executor" label="Инспектор" options={inspectors} defaultValue={inspectorId} full />
      <Hint>Замечание останется прежним. Окончательно проверит результат прокурор — автор замечания.</Hint>
    </Modal>
  );
}

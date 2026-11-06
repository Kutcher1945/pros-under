'use client';

import clsx from 'clsx';
import { useState } from 'react';

import { ASSIGNABLE_ROLES, ROLE_LABELS, scopeLabel } from '@/lib/access';
import { ADMIN_ORG, PROSECUTOR_ORG } from '@/lib/constants';
import { opekaApi } from '@/lib/opeka-api';
import { mutate } from '@/lib/store';
import type { SettingKey } from '@/lib/types';

import { Grid, Hint, SelectField, str, TextField } from '../forms/fields';
import { Icon } from '../Icon';
import { Modal } from '../Modal';
import { useSession } from '../Session';
import { useToast } from '../Toast';
import { Avatar, Badge, Footer, Note, PageHead, ui } from '../ui';

function AddUserModal({ onClose }: { onClose: () => void }) {
  const { state } = useSession();
  const toast = useToast();

  async function submit(form: FormData) {
    const input = { login: str(form, 'login'), password: str(form, 'password'), name: str(form, 'name'), role: str(form, 'role'), org: str(form, 'org') };
    const result = await mutate(() => opekaApi.createUser(input));
    if (!result.ok) return result.error;
    toast('Профиль создан');
    return null;
  }

  return (
    <Modal title="Новый пользователь" submitLabel="Создать профиль" onClose={onClose} onSubmit={submit}>
      <Grid>
        <TextField name="name" label="ФИО" required />
        <TextField name="login" label="Логин для входа" required placeholder="латиница, 3–32 символа" />
        <TextField name="password" label="Начальный пароль" type="password" required />
        <SelectField name="role" label="Роль" options={ASSIGNABLE_ROLES.map((r) => [r, ROLE_LABELS[r]])} defaultValue="inspector" />
        <SelectField name="org" label="Организация" options={[...state.orgs, PROSECUTOR_ORG, ADMIN_ORG]} defaultValue={state.orgs[0]} />
      </Grid>
      <Hint>Создаётся учётная запись платформы с доступом к «Опеке». Пароль проверяется по правилам сервера; передайте его сотруднику защищённым способом. Уже существующие учётные записи подключает суперпользователь в админке Django.</Hint>
    </Modal>
  );
}

export function UsersView() {
  const { state, me, today } = useSession();
  const toast = useToast();
  const [isAdding, setIsAdding] = useState(false);

  async function toggle(userId: string, wasActive: boolean) {
    const result = await mutate(() => opekaApi.toggleUser(userId));
    toast(result.ok ? (wasActive ? 'Доступ заблокирован' : 'Доступ активирован') : result.error);
  }

  return (
    <>
      <PageHead
        eyebrow={scopeLabel(me)}
        title="Пользователи"
        subtitle="Четыре роли. Доступ определяется подразделением и назначением; вход — по логину."
        actions={
          <button type="button" className={clsx(ui.btn, ui.primary)} onClick={() => setIsAdding(true)}>
            <Icon name="plus" />
            Добавить пользователя
          </button>
        }
      />
      <section className={ui.panel}>
        <div className={ui.tableWrap}>
          <table>
            <thead>
              <tr>
                <th>Пользователь</th>
                <th>Логин</th>
                <th>Роль</th>
                <th>Организация</th>
                <th>Доступ</th>
                <th aria-label="Действие" />
              </tr>
            </thead>
            <tbody>
              {state.users.map((u) => (
                <tr key={u.id}>
                  <td>
                    <div className={ui.person}>
                      <Avatar name={u.name} />
                      <strong>{u.name}</strong>
                    </div>
                  </td>
                  <td>
                    <code style={{ fontSize: 12.5 }}>{u.login}</code>
                  </td>
                  <td>{ROLE_LABELS[u.role]}</td>
                  <td>{u.org}</td>
                  <td>
                    <Badge tone={u.active ? 'green' : 'gray'}>{u.active ? 'Активен' : 'Заблокирован'}</Badge>
                  </td>
                  <td>
                    {u.id === me.id ? (
                      <span className={ui.muted}>Ваш профиль</span>
                    ) : (
                      <button type="button" className={clsx(ui.btn, ui.small, u.active && ui.danger)} onClick={() => toggle(u.id, u.active)}>
                        {u.active ? 'Заблокировать' : 'Активировать'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <Note>Администратор управляет пользователями и справочниками. Детские дела и документы в роли «Администратор» недоступны. Суперпользователи системы входят во все разделы.</Note>
      <Footer today={today} />
      {isAdding && <AddUserModal onClose={() => setIsAdding(false)} />}
    </>
  );
}

const SETTING_TITLES: Record<SettingKey, [title: string, field: string]> = {
  orgs: ['Подразделения ОВД', 'Подразделение ОВД'],
  categories: ['Категории оснований', 'Категория'],
};

export function SettingsView() {
  const { state, me, today } = useSession();
  const toast = useToast();
  const [adding, setAdding] = useState<SettingKey | null>(null);

  async function submitSetting(key: SettingKey, form: FormData) {
    const result = await mutate(() => opekaApi.addReference(key, str(form, 'value')));
    if (!result.ok) return result.error;
    toast('Справочник обновлён');
    return null;
  }

  return (
    <>
      <PageHead eyebrow={scopeLabel(me)} title="Справочники" subtitle="Подразделения и категории для заполнения карточек." />
      <div style={{ display: 'grid', gap: 18, gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
        {(Object.keys(SETTING_TITLES) as SettingKey[]).map((key) => (
          <section key={key} className={ui.panel} style={{ marginBottom: 0 }}>
            <div className={ui.panelHead}>
              <h2>
                {SETTING_TITLES[key][0]} <span className={ui.muted}>· {state[key].length}</span>
              </h2>
              <button type="button" className={clsx(ui.btn, ui.small)} onClick={() => setAdding(key)}>
                <Icon name="plus" />
                Добавить
              </button>
            </div>
            <ul style={{ listStyle: 'none', margin: 0, padding: '4px 16px' }}>
              {state[key].map((value) => (
                <li key={value} style={{ padding: '10px 0', borderBottom: '1px solid var(--line)', fontSize: 13.5 }}>
                  {value}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      <div style={{ marginTop: 18 }}>
        <Note>Справочник категорий необходимо утвердить по применимой редакции нормативных актов. Добавление названия в справочник не создаёт правового основания учёта.</Note>
      </div>
      <Footer today={today} />

      {adding && (
        <Modal title="Добавить значение" submitLabel="Добавить" onClose={() => setAdding(null)} onSubmit={(form) => submitSetting(adding, form)}>
          <TextField name="value" label={SETTING_TITLES[adding][1]} required full />
        </Modal>
      )}
    </>
  );
}

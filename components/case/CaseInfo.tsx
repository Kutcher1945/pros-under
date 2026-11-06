'use client';

import clsx from 'clsx';

import { canEditCase, userName } from '@/lib/access';
import { formatDate } from '@/lib/dates';
import type { Case, Ground } from '@/lib/types';

import { useSession } from '../Session';
import { Note, ui } from '../ui';
import styles from './case.module.css';

type Detail = [label: string, value: string | undefined];

export function DetailList({ items }: { items: Detail[] }) {
  return (
    <dl className={styles.details}>
      {items.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd className={value ? undefined : styles.unset}>{value || 'Не указано'}</dd>
        </div>
      ))}
    </dl>
  );
}

export function GroundRow({ ground }: { ground: Ground }) {
  return (
    <div className={styles.reason}>
      <div>
        <span>Категория</span>
        <strong>{ground.category}</strong>
      </div>
      <div>
        <span>Документ основания</span>
        <strong>
          {ground.type} · {ground.number || 'б/н'} · {formatDate(ground.date)}
        </strong>
      </div>
    </div>
  );
}

export function CaseInfo({ c, onAddGround }: { c: Case; onAddGround: () => void }) {
  const { state, me } = useSession();
  return (
    <>
      <h3>Сведения о ребёнке</h3>
      <DetailList
        items={[
          ['ФИО', c.name],
          ['Дата рождения', formatDate(c.dob)],
          ['ИИН', c.iin || 'Не внесён'],
          ['Район проживания', c.district],
          ['Фактический адрес', c.address],
          ['Статус обучения', c.education],
          ['Организация образования', c.school],
          ['Класс или курс', c.grade],
          ['Законный представитель', c.rep],
          ['Контакт представителя', c.phone],
        ]}
      />

      <div className={styles.sectionTitle}>
        Основания учёта
        {canEditCase(me, c) && (
          <button type="button" className={clsx(ui.btn, ui.small)} onClick={onAddGround}>
            Добавить основание
          </button>
        )}
      </div>
      {c.grounds.map((g, i) => (
        <GroundRow key={`${g.number}-${i}`} ground={g} />
      ))}

      <div className={styles.sectionTitle}>Учёт</div>
      <DetailList
        items={[
          ['Официальная дата постановки', formatDate(c.registered)],
          ['Дата окончания основания', c.end ? formatDate(c.end) : 'Если установлена документом'],
          ['Подразделение', c.org],
          ['Ответственный инспектор', userName(state, c.inspector)],
        ]}
      />

      {c.status === 'archived' && (
        <>
          <div className={styles.sectionTitle}>Завершение дела</div>
          <DetailList
            items={[
              ['Дата завершения', formatDate(c.archiveDate)],
              ['Причина', c.archiveReason],
            ]}
          />
        </>
      )}

      <div style={{ marginTop: 20 }}>
        <Note>Карточка отражает сведения об оформленном учёте. Сохранение карточки не выполняет постановку на учёт в официальной системе МВД.</Note>
      </div>
    </>
  );
}

'use client';

import clsx from 'clsx';
import { useId, type ReactNode } from 'react';

import { UPLOAD_ACCEPT } from '@/lib/constants';

import styles from '../modal.module.css';

export { styles as form };

type Option = string | [value: string, label: string];

interface Common {
  name: string;
  label: string;
  required?: boolean;
  full?: boolean;
}

function Label({ id, label, required }: { id: string; label: string; required?: boolean }) {
  return (
    <label htmlFor={id}>
      {label}
      {required && ' *'}
    </label>
  );
}

export function TextField({ name, label, required, full, defaultValue, type = 'text', max, min, placeholder }: Common & { defaultValue?: string; type?: 'text' | 'date' | 'tel' | 'password'; max?: string; min?: string; placeholder?: string }) {
  const id = useId();
  return (
    <div className={clsx(styles.field, full && styles.full)}>
      <Label id={id} label={label} required={required} />
      <input
        id={id}
        name={name}
        type={type}
        defaultValue={defaultValue}
        required={required}
        max={max}
        min={min}
        placeholder={placeholder}
        autoComplete={type === 'password' ? 'new-password' : undefined}
      />
    </div>
  );
}

export function SelectField({ name, label, options, defaultValue, full }: Common & { options: Option[]; defaultValue?: string }) {
  const id = useId();
  return (
    <div className={clsx(styles.field, full && styles.full)}>
      <Label id={id} label={label} required />
      <select id={id} name={name} defaultValue={defaultValue} required>
        {options.map((o) => {
          const [value, text] = Array.isArray(o) ? o : [o, o];
          return (
            <option key={value} value={value}>
              {text}
            </option>
          );
        })}
      </select>
    </div>
  );
}

export function TextAreaField({ name, label, required, full = true, defaultValue, placeholder }: Common & { defaultValue?: string; placeholder?: string }) {
  const id = useId();
  return (
    <div className={clsx(styles.field, full && styles.full)}>
      <Label id={id} label={label} required={required} />
      <textarea id={id} name={name} defaultValue={defaultValue} required={required} placeholder={placeholder} />
    </div>
  );
}

export function FileField({ name = 'file', label, full }: Partial<Common> & { label: string }) {
  const id = useId();
  return (
    <div className={clsx(styles.field, full && styles.full)}>
      <Label id={id} label={`${label} · до 2 МБ`} required />
      <input id={id} name={name} type="file" accept={UPLOAD_ACCEPT} required />
    </div>
  );
}

export function ReadonlyField({ label, value, full, multiline }: { label: string; value: string | undefined; full?: boolean; multiline?: boolean }) {
  const id = useId();
  const shown = value || 'Не указано';
  return (
    <div className={clsx(styles.field, full && styles.full)}>
      <label htmlFor={id}>{label}</label>
      {multiline ? <textarea id={id} readOnly className={styles.readonly} value={shown} /> : <input id={id} readOnly className={styles.readonly} value={shown} />}
    </div>
  );
}

export function Grid({ children }: { children: ReactNode }) {
  return <div className={styles.grid}>{children}</div>;
}

export function Section({ children }: { children: ReactNode }) {
  return <div className={styles.section}>{children}</div>;
}

export function Hint({ children }: { children: ReactNode }) {
  return <p className={styles.hint}>{children}</p>;
}

/** Reads a string field from FormData ('' when absent). */
export function str(form: FormData, key: string): string {
  const value = form.get(key);
  return typeof value === 'string' ? value : '';
}

export function fileOf(form: FormData, key = 'file'): File | null {
  const value = form.get(key);
  return value instanceof File ? value : null;
}

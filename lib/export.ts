import { openSignalsOf, userName } from './access';
import type { Case, OpekaState } from './types';

const HEADER = ['Номер дела', 'ФИО', 'Дата рождения', 'Район', 'Подразделение', 'Инспектор', 'Состояние', 'Дата учёта', 'Замечания'];

/** Quotes a CSV cell and neutralises spreadsheet formula prefixes (=, +, -, @, tab, CR). */
export function csvCell(value: string | number): string {
  return `"${String(value).replace(/^[\t\r=+\-@]/, "'$&").replace(/"/g, '""')}"`;
}

/** Semicolon CSV with BOM so Excel opens Cyrillic correctly. */
export function casesCsv(state: OpekaState, cases: Case[]): string {
  const rows = cases.map((c) => [
    c.number,
    c.name,
    c.dob,
    c.district,
    c.org,
    userName(state, c.inspector),
    c.status === 'active' ? 'Активное' : 'Архивное',
    c.registered,
    openSignalsOf(state, c).length,
  ]);
  return `﻿${[HEADER, ...rows].map((row) => row.map(csvCell).join(';')).join('\r\n')}`;
}

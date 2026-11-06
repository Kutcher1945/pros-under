import { isCityWide, isLate, needsReview, openSignalsOf, visibleCases } from './access';
import type { Case, OpekaState, Signal, User } from './types';

export type RegistryFilter = '' | 'active' | 'archived' | 'archivePending' | 'unchecked' | 'remarks' | 'late' | 'myreview' | 'mine';

export interface RegistryQuery {
  search: string;
  filter: RegistryFilter;
  /** ОВД name (prosecutor) or inspector id (chief). */
  unit: string;
}

const BASE_FILTERS: [RegistryFilter, string][] = [
  ['', 'Все дела'],
  ['active', 'Активные'],
  ['archived', 'Архивные'],
  ['archivePending', 'Архивирование на проверке'],
  ['unchecked', 'Требуют проверки'],
  ['remarks', 'С замечаниями'],
  ['late', 'С просрочкой'],
];

export function registryFilterOptions(user: User): [RegistryFilter, string][] {
  return isCityWide(user)
    ? [...BASE_FILTERS, ['mine', 'Мои замечания'], ['myreview', 'На моей проверке']]
    : BASE_FILTERS;
}

/** Filter from the URL, limited to the options this role's dropdown offers. */
export function parseRegistryFilter(value: string | null, user: User): RegistryFilter {
  const match = registryFilterOptions(user).find(([v]) => v === value);
  return match ? match[0] : '';
}

function matchesFilter(state: OpekaState, user: User, today: string, c: Case, filter: RegistryFilter): boolean {
  const open = openSignalsOf(state, c);
  switch (filter) {
    case '':
      return true;
    case 'active':
      return c.status === 'active';
    case 'archived':
      return c.status === 'archived';
    case 'archivePending':
      return c.archiveRequest?.status === 'pending';
    case 'unchecked':
      return needsReview(c);
    case 'remarks':
      return open.length > 0;
    case 'late':
      return open.some((s) => isLate(s, today));
    case 'myreview':
      return open.some((s) => s.author === user.id && s.status === 'review');
    case 'mine':
      return open.some((s) => s.author === user.id);
  }
}

export function filterCases(state: OpekaState, user: User, today: string, query: RegistryQuery): Case[] {
  const needle = query.search.trim().toLowerCase();
  return visibleCases(state, user).filter((c) => {
    if (needle && !`${c.name} ${c.iin} ${c.number}`.toLowerCase().includes(needle)) return false;
    if (query.unit && c.org !== query.unit && c.inspector !== query.unit) return false;
    return matchesFilter(state, user, today, c, query.filter);
  });
}

/** Required signals on cases the user can see. */
export function scopedSignals(state: OpekaState, user: User): Signal[] {
  const ids = new Set(visibleCases(state, user).map((c) => c.id));
  return state.remarks.filter((r): r is Signal => r.required && ids.has(r.caseId));
}

export interface StatTile {
  title: string;
  value: number;
  note: string;
  filter: RegistryFilter;
  alert?: boolean;
}

export function overviewStats(state: OpekaState, user: User, today: string): StatTile[] {
  const cases = visibleCases(state, user);
  const signals = scopedSignals(state, user);
  const open = signals.filter((s) => s.status !== 'closed').length;
  const late = signals.filter((s) => isLate(s, today)).length;
  const active: StatTile = { title: 'Активные дела', value: cases.filter((c) => c.status === 'active').length, note: 'В вашем рабочем пространстве', filter: 'active' };
  if (user.role === 'chief') {
    return [
      active,
      { title: 'Требуют проверки', value: cases.filter(needsReview).length, note: 'Новые и изменённые карточки', filter: 'unchecked' },
      { title: 'Открытые замечания', value: open, note: 'Ожидают исправления или проверки', filter: 'remarks' },
      { title: 'Просроченные', value: late, note: 'Срок исправления истёк', filter: 'late', alert: true },
    ];
  }
  return [
    active,
    { title: 'Открытые замечания', value: open, note: 'По делам города', filter: 'remarks' },
    { title: 'Просроченные', value: late, note: 'Требуют внимания', filter: 'late', alert: true },
    { title: 'На моей проверке', value: signals.filter((s) => s.author === user.id && s.status === 'review').length, note: 'Исполнители направили ответы', filter: 'myreview' },
  ];
}

export interface UnitRow {
  key: string;
  label: string;
  /** Inspector rows show initials; ОВД rows show a folder icon. */
  isOrg: boolean;
  active: number;
  toReview: number;
  open: number;
  late: number;
}

/** Prosecutor / superadmin: one row per ОВД. Chief: one row per inspector of their ОВД. */
export function unitRows(state: OpekaState, user: User, today: string): UnitRow[] {
  const cases = visibleCases(state, user);
  const signals = scopedSignals(state, user);
  const row = (key: string, label: string, isOrg: boolean, own: Case[]): UnitRow => {
    const ids = new Set(own.map((c) => c.id));
    const mine = signals.filter((s) => ids.has(s.caseId));
    return {
      key,
      label,
      isOrg,
      active: own.filter((c) => c.status === 'active').length,
      toReview: own.filter(needsReview).length,
      open: mine.filter((s) => s.status !== 'closed').length,
      late: mine.filter((s) => isLate(s, today)).length,
    };
  };
  if (isCityWide(user)) {
    return [...new Set(cases.map((c) => c.org))].map((org) => row(org, org, true, cases.filter((c) => c.org === org)));
  }
  return state.users
    .filter((u) => u.role === 'inspector' && u.org === user.org)
    .map((u) => row(u.id, u.name, false, cases.filter((c) => c.inspector === u.id)));
}

export type SignalBox = 'incoming' | 'outgoing';

/** «Сигналы надзора»: inspector — assigned to them; chief and superadmin — incoming (incl. delegated) or sent. */
export function inboxSignals(state: OpekaState, user: User, box: SignalBox): Signal[] {
  return scopedSignals(state, user).filter((s) => {
    if (user.role !== 'chief' && user.role !== 'superadmin') return s.executor === user.id;
    return box === 'outgoing' ? s.author === user.id : s.executor === user.id || s.coordinator === user.id;
  });
}

export function incomingCount(state: OpekaState, user: User): number {
  return state.remarks.filter((r) => r.required && r.status !== 'closed' && r.executor === user.id).length;
}

export type TaskTab = 'all' | 'today' | 'late' | 'review';

export function openScopedSignals(state: OpekaState, user: User): Signal[] {
  return scopedSignals(state, user).filter((s) => s.status !== 'closed');
}

export function taskSignals(all: Signal[], today: string, tab: TaskTab): Signal[] {
  return all
    .filter((s) => tab === 'all' || (tab === 'today' && s.due === today) || (tab === 'late' && isLate(s, today)) || (tab === 'review' && s.status === 'review'))
    .sort((a, b) => a.due.localeCompare(b.due));
}

export function taskCounts(all: Signal[], today: string): Record<TaskTab, number> {
  return {
    all: all.length,
    today: all.filter((s) => s.due === today).length,
    late: all.filter((s) => isLate(s, today)).length,
    review: all.filter((s) => s.status === 'review').length,
  };
}

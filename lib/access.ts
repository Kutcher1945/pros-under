import type { Case, OpekaState, Remark, Role, Signal, User } from './types';

export const ROLE_LABELS: Record<Role, string> = {
  inspector: 'Инспектор',
  chief: 'Руководитель ОВД',
  prosecutor: 'Городской прокурор',
  admin: 'Администратор',
  superadmin: 'Суперадминистратор',
};

/** Roles an Опека administrator may assign (superadmin comes from is_superuser only). */
export const ASSIGNABLE_ROLES: Role[] = ['inspector', 'chief', 'prosecutor', 'admin'];

/** Prosecutor and superadmin see the whole city. */
export function isCityWide(user: Pick<User, 'role'>): boolean {
  return user.role === 'prosecutor' || user.role === 'superadmin';
}

export type PageId = 'overview' | 'registry' | 'signals' | 'tasks' | 'users' | 'settings';

export interface NavItem {
  id: PageId;
  href: string;
  label: string;
}

const PAGES: Record<PageId, { href: string; label: string }> = {
  overview: { href: '/overview', label: 'Обзор' },
  registry: { href: '/registry', label: 'Реестр дел' },
  signals: { href: '/signals', label: 'Сигналы надзора' },
  tasks: { href: '/tasks', label: 'Задачи и сроки' },
  users: { href: '/users', label: 'Пользователи' },
  settings: { href: '/settings', label: 'Справочники' },
};

const ROLE_PAGES: Record<Role, PageId[]> = {
  inspector: ['registry', 'signals'],
  chief: ['overview', 'registry', 'signals', 'tasks'],
  prosecutor: ['overview', 'registry'],
  admin: ['users', 'settings'],
  superadmin: ['overview', 'registry', 'signals', 'tasks', 'users', 'settings'],
};

export function navFor(role: Role): NavItem[] {
  return ROLE_PAGES[role].map((id) => ({
    id,
    href: PAGES[id].href,
    label: id === 'overview' && (role === 'prosecutor' || role === 'superadmin') ? 'Общий обзор' : PAGES[id].label,
  }));
}

export function canOpenPage(role: Role, page: PageId): boolean {
  return ROLE_PAGES[role].includes(page);
}

export function homeFor(role: Role): string {
  return PAGES[ROLE_PAGES[role][0]].href;
}

export function findUser(state: OpekaState, id: string | undefined): User | undefined {
  return state.users.find((u) => u.id === id);
}

export function userName(state: OpekaState, id: string | undefined): string {
  return findUser(state, id)?.name ?? 'Не назначен';
}

/** The signed-in user; a blocked or deleted profile counts as signed out. */
export function currentUser(state: OpekaState, userId: string | null): User | undefined {
  return state.users.find((u) => u.id === userId && u.active);
}

/** Cases in the user's scope: prosecutor — city, chief — own ОВД, inspector — assigned, admin — none. */
export function visibleCases(state: OpekaState, user: User): Case[] {
  switch (user.role) {
    case 'prosecutor':
    case 'superadmin':
      return state.cases;
    case 'chief':
      return state.cases.filter((c) => c.org === user.org);
    case 'inspector':
      return state.cases.filter((c) => c.inspector === user.id);
    default:
      return [];
  }
}

export function canSee(state: OpekaState, user: User, c: Case): boolean {
  return visibleCases(state, user).some((x) => x.id === c.id);
}

/** The assigned inspector (or the superadmin) edits an active case, not while archiving is pending. */
export function canEditCase(user: User, c: Case): boolean {
  const mayEdit = user.role === 'superadmin' || (user.role === 'inspector' && c.inspector === user.id);
  return mayEdit && c.status === 'active' && c.archiveRequest?.status !== 'pending';
}

/** Who may create cards: inspectors (for themselves) and the superadmin (for a chosen inspector). */
export function canCreateCase(user: User): boolean {
  return user.role === 'inspector' || user.role === 'superadmin';
}

/** Chief of the case's ОВД — or the superadmin, who may do everything the roles do. */
export function actsAsChief(user: User, c: Case): boolean {
  return user.role === 'superadmin' || (user.role === 'chief' && user.org === c.org);
}

/** Every active inspector, e.g. to pick the responsible one for a new card. */
export function allActiveInspectors(state: OpekaState): User[] {
  return state.users.filter((u) => u.active && u.role === 'inspector');
}

/** Chiefs and prosecutors may comment and raise signals on cases in their scope. */
export function hasAuthority(state: OpekaState, user: User, c: Case): boolean {
  return (user.role === 'chief' || isCityWide(user)) && canSee(state, user, c);
}

export function isSignal(remark: Remark): remark is Signal {
  return remark.required;
}

export function signalsOf(state: OpekaState, c: Case): Signal[] {
  return state.remarks.filter((r): r is Signal => r.caseId === c.id && isSignal(r));
}

export function openSignalsOf(state: OpekaState, c: Case): Signal[] {
  return signalsOf(state, c).filter((s) => s.status !== 'closed');
}

export function isLate(signal: Signal, today: string): boolean {
  return signal.status !== 'closed' && signal.due < today;
}

/** Active case the chief still has to look at: unchecked, edited after check, or archiving pending. */
export function needsReview(c: Case): boolean {
  return c.status === 'active' && (c.review !== 'checked' || c.archiveRequest?.status === 'pending');
}

/** Who a chief or prosecutor can assign a new signal to on this case. */
export function signalExecutors(state: OpekaState, user: User, c: Case): string[] {
  if (user.role === 'chief') return [c.inspector];
  const chiefs = state.users.filter((u) => u.active && u.role === 'chief' && u.org === c.org).map((u) => u.id);
  return [c.inspector, ...chiefs];
}

export function activeInspectors(state: OpekaState, org: string): User[] {
  return state.users.filter((u) => u.active && u.role === 'inspector' && u.org === org);
}

export function initials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((part) => part[0] ?? '')
    .join('');
}

/** Eyebrow above page titles: the city for the prosecutor, the own unit otherwise. */
export function scopeLabel(user: User): string {
  return isCityWide(user) ? 'Город Алматы' : user.org;
}

/** Chief of the case's ОВД decides on a pending archive request. */
export function canDecideArchive(user: User, c: Case): boolean {
  return actsAsChief(user, c) && c.archiveRequest?.status === 'pending';
}

/** Chief passes a prosecutor's open signal on to an inspector of their ОВД. */
export function canDelegate(state: OpekaState, user: User, signal: Signal): boolean {
  return user.role === 'chief' && signal.executor === user.id && signal.status === 'open' && findUser(state, signal.author)?.role === 'prosecutor';
}

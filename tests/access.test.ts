import { describe, expect, it } from 'vitest';

import {
  actsAsChief,
  ASSIGNABLE_ROLES,
  canCreateCase,
  canEditCase,
  canOpenPage,
  currentUser,
  hasAuthority,
  homeFor,
  initials,
  isCityWide,
  isLate,
  navFor,
  needsReview,
  openSignalsOf,
  signalExecutors,
  userName,
  visibleCases,
} from '@/lib/access';
import type { Signal } from '@/lib/types';

import { caseById, CLOCK, day, fresh, user } from './fixtures';

describe('role scope', () => {
  it.each([
    ['i1', 4],
    ['i2', 2],
    ['i3', 3],
    ['c1', 6],
    ['p1', 9],
    ['a1', 0],
  ])('%s sees %i cases (same counts as the prototype smoke check)', (id, count) => {
    const state = fresh();
    expect(visibleCases(state, user(state, id))).toHaveLength(count);
  });

  it('chief sees only cases of their own ОВД', () => {
    const state = fresh();
    expect(visibleCases(state, user(state, 'c1')).every((c) => c.org === 'Алмалинское ОВД')).toBe(true);
  });
});

describe('navigation', () => {
  it('gives each role its own pages and home', () => {
    expect(navFor('inspector').map((n) => n.id)).toEqual(['registry', 'signals']);
    expect(navFor('chief').map((n) => n.id)).toEqual(['overview', 'registry', 'signals', 'tasks']);
    expect(navFor('prosecutor').map((n) => n.label)).toEqual(['Общий обзор', 'Реестр дел']);
    expect(navFor('admin').map((n) => n.id)).toEqual(['users', 'settings']);
    expect(homeFor('inspector')).toBe('/registry');
    expect(homeFor('admin')).toBe('/users');
  });

  it('blocks pages outside the role', () => {
    expect(canOpenPage('inspector', 'tasks')).toBe(false);
    expect(canOpenPage('admin', 'registry')).toBe(false);
    expect(canOpenPage('chief', 'tasks')).toBe(true);
  });
});

describe('current user', () => {
  it('treats a missing, unknown or blocked profile as signed out', () => {
    const state = fresh();
    const blocked = { ...state, users: state.users.map((u) => (u.id === 'c1' ? { ...u, active: false } : u)) };
    expect(currentUser(blocked, 'c1')).toBeUndefined();
    expect(currentUser(state, 'nobody')).toBeUndefined();
    expect(currentUser(state, null)).toBeUndefined();
    expect(currentUser(state, 'p1')?.id).toBe('p1');
  });

  it('names unknown users «Не назначен»', () => {
    expect(userName(fresh(), 'ghost')).toBe('Не назначен');
  });
});

describe('case permissions', () => {
  it('lets only the assigned inspector edit an active case', () => {
    const state = fresh();
    expect(canEditCase(user(state, 'i1'), caseById(state, 'c102'))).toBe(true);
    expect(canEditCase(user(state, 'i1'), caseById(state, 'c107'))).toBe(false);
    expect(canEditCase(user(state, 'c1'), caseById(state, 'c102'))).toBe(false);
  });

  it('locks editing while archiving is pending and for archived cases', () => {
    const state = fresh();
    const c = caseById(state, 'c102');
    const pending = { ...c, archiveRequest: { status: 'pending' as const, date: day(0), reason: 'x', text: 'x', author: 'i1', created: CLOCK.now } };
    expect(canEditCase(user(state, 'i1'), pending)).toBe(false);
    expect(canEditCase(user(state, 'i3'), caseById(state, 'c109'))).toBe(false);
  });

  it('gives comment authority to chiefs and prosecutors within scope only', () => {
    const state = fresh();
    expect(hasAuthority(state, user(state, 'c1'), caseById(state, 'c102'))).toBe(true);
    expect(hasAuthority(state, user(state, 'c1'), caseById(state, 'c107'))).toBe(false);
    expect(hasAuthority(state, user(state, 'p1'), caseById(state, 'c107'))).toBe(true);
    expect(hasAuthority(state, user(state, 'i1'), caseById(state, 'c102'))).toBe(false);
  });

  it('lets a prosecutor assign signals to the inspector or the ОВД chief, a chief only to the inspector', () => {
    const state = fresh();
    const c = caseById(state, 'c102');
    expect(signalExecutors(state, user(state, 'p1'), c)).toEqual(['i1', 'c1']);
    expect(signalExecutors(state, user(state, 'c1'), c)).toEqual(['i1']);
  });
});

describe('signals and review', () => {
  it('counts open signals and detects overdue ones', () => {
    const state = fresh();
    expect(openSignalsOf(state, caseById(state, 'c102'))).toHaveLength(1);
    const s2 = state.remarks.find((r) => r.id === 's2') as Signal;
    const s1 = state.remarks.find((r) => r.id === 's1') as Signal;
    expect(isLate(s2, CLOCK.today)).toBe(true);
    expect(isLate(s1, CLOCK.today)).toBe(false);
    expect(isLate({ ...s2, status: 'closed' }, CLOCK.today)).toBe(false);
  });

  it('flags unchecked, changed or archive-pending active cases for review', () => {
    const state = fresh();
    expect(needsReview(caseById(state, 'c101'))).toBe(false);
    expect(needsReview(caseById(state, 'c102'))).toBe(true);
    expect(needsReview(caseById(state, 'c103'))).toBe(true);
    expect(needsReview(caseById(state, 'c109'))).toBe(false);
  });

  it('builds initials from the first two words', () => {
    expect(initials('Асылбеков Данияр Ерланович')).toBe('АД');
    expect(initials('Администратор')).toBe('А');
  });
});

describe('superadmin (Django superuser)', () => {
  const superadmin = { id: 'su', login: 'admin', name: 'Admin', role: 'superadmin' as const, org: 'Управление системой', active: true };

  it('opens every ported module, with the city-wide overview', () => {
    expect(navFor('superadmin').map((n) => n.id)).toEqual(['overview', 'registry', 'signals', 'tasks', 'users', 'settings']);
    expect(navFor('superadmin')[0].label).toBe('Общий обзор');
    expect(canOpenPage('superadmin', 'tasks')).toBe(true);
    expect(canOpenPage('superadmin', 'users')).toBe(true);
  });

  it('sees every case and may do what every role does', () => {
    const state = fresh();
    expect(visibleCases(state, superadmin)).toHaveLength(9);
    expect(isCityWide(superadmin)).toBe(true);
    expect(hasAuthority(state, superadmin, caseById(state, 'c107'))).toBe(true);
    expect(canEditCase(superadmin, caseById(state, 'c102'))).toBe(true);
    expect(canEditCase(superadmin, caseById(state, 'c109'))).toBe(false);
    expect(canCreateCase(superadmin)).toBe(true);
    expect(actsAsChief(superadmin, caseById(state, 'c107'))).toBe(true);
    expect(actsAsChief(user(state, 'c1'), caseById(state, 'c107'))).toBe(false);
    expect(canCreateCase(user(state, 'c1'))).toBe(false);
  });

  it('is never offered as an assignable role', () => {
    expect(ASSIGNABLE_ROLES).not.toContain('superadmin');
  });
});

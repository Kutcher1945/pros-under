import { describe, expect, it } from 'vitest';

import {
  filterCases,
  inboxSignals,
  incomingCount,
  openScopedSignals,
  overviewStats,
  parseRegistryFilter,
  registryFilterOptions,
  taskCounts,
  taskSignals,
  unitRows,
} from '@/lib/views';

import { CLOCK, day, fresh, user } from './fixtures';

const query = (patch = {}) => ({ search: '', filter: '' as const, unit: '', ...patch });

describe('registry filtering', () => {
  it('searches by name or number, case-insensitive', () => {
    const state = fresh();
    const p1 = user(state, 'p1');
    expect(filterCases(state, p1, CLOCK.today, query({ search: 'ким' })).map((c) => c.id)).toEqual(['c102']);
    expect(filterCases(state, p1, CLOCK.today, query({ search: 'нл-2026-0130' })).map((c) => c.id)).toEqual(['c103']);
  });

  it('filters by ОВД for the prosecutor and by inspector for the chief', () => {
    const state = fresh();
    expect(filterCases(state, user(state, 'p1'), CLOCK.today, query({ unit: 'Бостандыкское ОВД' }))).toHaveLength(3);
    expect(filterCases(state, user(state, 'c1'), CLOCK.today, query({ unit: 'i2' }))).toHaveLength(2);
  });

  it.each([
    ['active', 8],
    ['archived', 1],
    ['unchecked', 5],
    ['remarks', 4],
    ['late', 2],
    ['mine', 2],
  ] as const)('prosecutor filter %s → %i cases', (filter, count) => {
    const state = fresh();
    expect(filterCases(state, user(state, 'p1'), CLOCK.today, query({ filter }))).toHaveLength(count);
  });

  it('finds the case whose archiving awaits review (smoke check)', () => {
    const base = fresh();
    const request = { status: 'pending' as const, date: day(0), reason: 'Прекращение основания', text: 'x', author: 'i1', created: CLOCK.now };
    const state = { ...base, cases: base.cases.map((c) => (c.id === 'c102' ? { ...c, archiveRequest: request } : c)) };
    expect(filterCases(state, user(state, 'c1'), CLOCK.today, query({ filter: 'archivePending' })).map((c) => c.id)).toEqual(['c102']);
  });

  it('lists «Мои замечания» filters for the prosecutor only and parses unknown values as «all»', () => {
    const state = fresh();
    expect(registryFilterOptions(user(state, 'p1')).map(([v]) => v)).toContain('myreview');
    expect(registryFilterOptions(user(state, 'c1')).map(([v]) => v)).not.toContain('mine');
    expect(parseRegistryFilter('late', user(state, 'c1'))).toBe('late');
    expect(parseRegistryFilter('mine', user(state, 'p1'))).toBe('mine');
    expect(parseRegistryFilter('mine', user(state, 'c1'))).toBe('');
    expect(parseRegistryFilter('<script>', user(state, 'p1'))).toBe('');
    expect(parseRegistryFilter(null, user(state, 'p1'))).toBe('');
  });
});

describe('overview', () => {
  it('shows the chief its review queue and overdue signals', () => {
    const state = fresh();
    const stats = overviewStats(state, user(state, 'c1'), CLOCK.today);
    expect(stats.map((s) => [s.filter, s.value])).toEqual([
      ['active', 6],
      ['unchecked', 4],
      ['remarks', 4],
      ['late', 2],
    ]);
    expect(stats[3].alert).toBe(true);
  });

  it('shows the prosecutor city totals and signals awaiting their check', () => {
    const state = fresh();
    expect(overviewStats(state, user(state, 'p1'), CLOCK.today).map((s) => [s.filter, s.value])).toEqual([
      ['active', 8],
      ['remarks', 4],
      ['late', 2],
      ['myreview', 0],
    ]);
  });

  it('breaks down by ОВД for the prosecutor and by inspector for the chief', () => {
    const state = fresh();
    expect(unitRows(state, user(state, 'p1'), CLOCK.today).map((r) => [r.label, r.active])).toEqual([
      ['Алмалинское ОВД', 6],
      ['Бостандыкское ОВД', 2],
    ]);
    const inspectors = unitRows(state, user(state, 'c1'), CLOCK.today);
    expect(inspectors.map((r) => [r.key, r.active, r.open, r.late])).toEqual([
      ['i1', 4, 3, 2],
      ['i2', 2, 1, 0],
    ]);
  });
});

describe('signals and tasks', () => {
  it('splits the chief inbox into incoming and sent', () => {
    const state = fresh();
    const c1 = user(state, 'c1');
    expect(inboxSignals(state, c1, 'incoming').map((s) => s.id)).toEqual(['s3']);
    expect(inboxSignals(state, c1, 'outgoing').map((s) => s.id)).toEqual(['s1', 's4']);
    expect(inboxSignals(state, user(state, 'i1'), 'incoming').map((s) => s.id)).toEqual(['s1', 's2', 's4']);
  });

  it('counts open signals assigned to the user for the nav badge', () => {
    const state = fresh();
    expect(incomingCount(state, user(state, 'i1'))).toBe(3);
    expect(incomingCount(state, user(state, 'p1'))).toBe(0);
  });

  it('sorts tasks by deadline and counts each tab', () => {
    const state = fresh();
    const all = openScopedSignals(state, user(state, 'c1'));
    expect(taskSignals(all, CLOCK.today, 'all').map((s) => s.due)).toEqual([...all.map((s) => s.due)].sort());
    expect(taskCounts(all, CLOCK.today)).toEqual({ all: 4, today: 0, late: 2, review: 1 });
    expect(taskSignals(all, CLOCK.today, 'review').map((s) => s.id)).toEqual(['s4']);
  });
});

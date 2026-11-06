import { findUser } from '@/lib/access';
import { isoDay, offsetDay } from '@/lib/dates';
import type { OpekaState, User } from '@/lib/types';

import { seedState } from './seed';

export const FROM = new Date('2026-11-04T06:00:00Z');
export const CLOCK = { now: FROM.toISOString(), today: isoDay(FROM) };
export const day = (n: number) => offsetDay(n, FROM);

export function fresh(): OpekaState {
  return seedState(FROM);
}

export function user(state: OpekaState, id: string): User {
  const found = findUser(state, id);
  if (!found) throw new Error(`no user ${id}`);
  return found;
}

export function caseById(state: OpekaState, id: string) {
  const c = state.cases.find((x) => x.id === id);
  if (!c) throw new Error(`no case ${id}`);
  return c;
}

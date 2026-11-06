'use client';

import { useSyncExternalStore } from 'react';

import { ApiAuthError, ApiError, apiGet, clearTokens, hasSession, login, logout } from './api';
import { NO_ACCESS_MESSAGE } from './constants';
import { WORKSPACE_PATH } from './opeka-api';
import type { OpekaState, User } from './types';

/* Session + workspace snapshot from prosecutor-backend. The server applies the
   role scope; screens derive their views from this snapshot via lib/views.ts
   and change data only through `mutate()`, which reloads it afterwards. */

export type SessionStatus = 'loading' | 'ready' | 'signed-out' | 'no-access' | 'error';

export interface Snapshot {
  status: SessionStatus;
  state: OpekaState | null;
  userId: string | null;
  error: string | null;
}

export type MutationOutcome = { ok: true; caseId?: string } | { ok: false; error: string };

interface Workspace extends OpekaState {
  me: User;
}

const SIGNED_OUT: Snapshot = { status: 'signed-out', state: null, userId: null, error: null };
const SERVER_SNAPSHOT: Snapshot = { status: 'loading', state: null, userId: null, error: null };

let snapshot: Snapshot = SERVER_SNAPSHOT;
let started = false;
const listeners = new Set<() => void>();

function set(next: Snapshot): Snapshot {
  snapshot = next;
  listeners.forEach((listener) => listener());
  return next;
}

function messageOf(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback;
}

async function load(): Promise<Snapshot> {
  if (!hasSession()) return set(SIGNED_OUT);
  try {
    const { me, ...state } = await apiGet<Workspace>(WORKSPACE_PATH);
    return set({ status: 'ready', state, userId: me.id, error: null });
  } catch (err) {
    if (err instanceof ApiAuthError) {
      clearTokens();
      return set(SIGNED_OUT);
    }
    if (err instanceof ApiError && err.status === 403) return set({ status: 'no-access', state: null, userId: null, error: err.message });
    // Keep showing the last good data next to the error rather than blanking the screen.
    return set({ ...snapshot, status: snapshot.state ? 'ready' : 'error', error: messageOf(err, 'Не удалось загрузить данные.') });
  }
}

function onStorage(event: StorageEvent) {
  // Signed out in another tab (tokens removed): follow it here.
  if ((event.key === 'opeka_refresh' && !event.newValue) || event.key === null) {
    if (!hasSession()) set(SIGNED_OUT);
  }
}

function onVisible() {
  // Other people change the registry too: refresh when the tab comes back into view.
  if (document.visibilityState === 'visible' && snapshot.status === 'ready') void load();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!started) {
    started = true;
    window.addEventListener('storage', onStorage);
    document.addEventListener('visibilitychange', onVisible);
    void load();
  }
  return () => {
    listeners.delete(listener);
  };
}

/** Session status and workspace; `loading` during server render and the first fetch. */
export function useOpeka(): Snapshot {
  return useSyncExternalStore(subscribe, () => snapshot, () => SERVER_SNAPSHOT);
}

export function reloadWorkspace(): Promise<Snapshot> {
  return load();
}

/** Runs an API call, then reloads the workspace so every screen shows the result. */
export async function mutate(call: () => Promise<unknown>): Promise<MutationOutcome> {
  try {
    const result = (await call()) as { caseId?: string } | undefined;
    await load();
    return { ok: true, caseId: result?.caseId };
  } catch (err) {
    if (err instanceof ApiAuthError) await load();
    return { ok: false, error: messageOf(err, 'Не удалось выполнить действие.') };
  }
}

/** Signs in through the platform auth; returns an error message or null. */
export async function signIn(username: string, password: string): Promise<string | null> {
  try {
    await login(username, password);
  } catch (err) {
    return messageOf(err, 'Не удалось войти');
  }
  set(SERVER_SNAPSHOT);
  const result = await load();
  if (result.status === 'ready') return null;
  if (result.status === 'no-access') {
    // A valid platform account without an Опека profile: do not keep its session here.
    await logout();
    set(SIGNED_OUT);
    return result.error || NO_ACCESS_MESSAGE;
  }
  return result.error || 'Не удалось войти';
}

export async function signOut(): Promise<void> {
  set(SIGNED_OUT);
  await logout();
}

'use client';

import { createContext, useContext } from 'react';

import type { OpekaState, User } from '@/lib/types';

export interface Session {
  state: OpekaState;
  me: User;
  today: string;
}

export const SessionContext = createContext<Session | null>(null);

/** Data and demo user for screens rendered inside AppShell (always loaded there). */
export function useSession(): Session {
  const session = useContext(SessionContext);
  if (!session) throw new Error('useSession must be used inside AppShell');
  return session;
}

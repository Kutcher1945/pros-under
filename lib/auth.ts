/** Where to go after sign-in: only same-site paths, never `//host` or a full URL. */
export function safeNextPath(next: string | null, fallback: string): string {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\') || next.startsWith('/login')) return fallback;
  return next;
}

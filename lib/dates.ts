const TIME_ZONE = 'Asia/Almaty';

/** YYYY-MM-DD of `date` in Almaty. */
export function isoDay(date: Date = new Date()): string {
  return date.toLocaleDateString('en-CA', { timeZone: TIME_ZONE });
}

export function offsetDay(days: number, from: Date = new Date()): string {
  const shifted = new Date(from);
  shifted.setDate(shifted.getDate() + days);
  return isoDay(shifted);
}

/** dd.mm.yyyy (plus hh:mm when `withTime`) for a date or ISO timestamp; «—» when empty. */
export function formatDate(value: string | null | undefined, withTime = false): string {
  if (!value) return '—';
  const parsed = new Date(value.length === 10 ? `${value}T12:00:00` : value);
  if (Number.isNaN(parsed.getTime())) return '—';
  return parsed.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  });
}

/** Full years between `dob` and `on` (both YYYY-MM-DD). */
export function ageOn(dob: string, on: string): number {
  const [by, bm, bd] = dob.split('-').map(Number);
  const [ty, tm, td] = on.split('-').map(Number);
  const beforeBirthday = tm < bm || (tm === bm && td < bd);
  return ty - by - (beforeBirthday ? 1 : 0);
}

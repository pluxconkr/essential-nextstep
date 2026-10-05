/**
 * Time in the program's zone (America/Los_Angeles), whatever the phone is set to.
 * Every deadline is a California date; a student in another zone must see the same days-left.
 * Uses Intl only — no date library. Demo scenarios shift the clock through `setClockOffset`.
 */

export const TZ = 'America/Los_Angeles';

let clockOffsetMs = 0;

/** Demo scenarios shift the app clock; device-time facts should use `realNowMs()`. */
export function setClockOffset(ms: number): void {
  clockOffsetMs = ms;
}

export function clockOffset(): number {
  return clockOffsetMs;
}

export function nowMs(): number {
  return Date.now() + clockOffsetMs;
}

export function realNowMs(): number {
  return Date.now();
}

export function nowIso(): string {
  return new Date(nowMs()).toISOString();
}

export interface LocalParts {
  year: number;
  month: number; // 1–12
  day: number; // 1–31
  hour: number; // 0–23
  minute: number;
  weekday: number; // 0 = Sunday
}

const partsFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: TZ,
  hourCycle: 'h23',
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  hour: 'numeric',
  minute: 'numeric',
  weekday: 'short',
});

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Calendar parts of an instant, in the program zone. */
export function localParts(ms: number): LocalParts {
  const parts = partsFormatter.formatToParts(new Date(ms));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '0';
  const hour = Number(get('hour')) % 24;
  return {
    year: Number(get('year')),
    month: Number(get('month')),
    day: Number(get('day')),
    hour,
    minute: Number(get('minute')),
    weekday: Math.max(0, WEEKDAYS.indexOf(get('weekday'))),
  };
}

/** Offset of the program zone from UTC at an instant, in minutes (DST-aware). */
function zoneOffsetMinutes(ms: number): number {
  const p = localParts(ms);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute);
  return Math.round((asUtc - ms) / 60_000);
}

/** Epoch ms of a wall-clock time in the program zone (DST-safe; ambiguous hours resolve to the earlier offset). */
export function epochForLocal(year: number, month: number, day: number, hour = 0, minute = 0): number {
  const guess = Date.UTC(year, month - 1, day, hour, minute);
  const first = guess - zoneOffsetMinutes(guess) * 60_000;
  const second = guess - zoneOffsetMinutes(first) * 60_000;
  return second;
}

/** 23:59:59.999 of a local date, as epoch ms. */
export function endOfLocalDay(year: number, month: number, day: number): number {
  return epochForLocal(year, month, day, 23, 59) + 59_999;
}

/** Midnight of the local date containing `ms`. */
export function startOfLocalDay(ms: number): number {
  const p = localParts(ms);
  return epochForLocal(p.year, p.month, p.day);
}

/** Whole local calendar days from `fromMs` to `toMs` (negative when `toMs` is earlier). */
export function daysBetween(fromMs: number, toMs: number): number {
  const a = localParts(fromMs);
  const b = localParts(toMs);
  const da = Date.UTC(a.year, a.month - 1, a.day);
  const db = Date.UTC(b.year, b.month - 1, b.day);
  return Math.round((db - da) / 86_400_000);
}

export function addDays(ms: number, days: number): number {
  const p = localParts(ms);
  return epochForLocal(p.year, p.month, p.day + days, p.hour, p.minute);
}

/** The school year runs Aug 1 – Jul 31. Returns the calendar year in which it starts. */
export function schoolYearStartYear(ms: number): number {
  const p = localParts(ms);
  return p.month >= 8 ? p.year : p.year - 1;
}

/** "2026-27" label of the school year containing `ms`. */
export function schoolYearLabel(ms: number): string {
  const y = schoolYearStartYear(ms);
  return `${y}-${String((y + 1) % 100).padStart(2, '0')}`;
}

/** Parse 'YYYY-MM-DD' as the end of that local day; NaN when malformed. */
export function isoDateToEndOfDay(iso: string): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return Number.NaN;
  return endOfLocalDay(Number(m[1]), Number(m[2]), Number(m[3]));
}

/** 'YYYY-MM-DD' of the local date containing `ms`. */
export function toIsoDate(ms: number): string {
  const p = localParts(ms);
  return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
}

export const QUIET_HOURS = { start: 21, end: 7 } as const;

/** Reminders never go out between 21:00 and 07:00 program time (safety pages are exempt). */
export function inQuietHours(ms: number): boolean {
  const { hour } = localParts(ms);
  return hour >= QUIET_HOURS.start || hour < QUIET_HOURS.end;
}

/** Move an instant forward to 07:00 local if it falls inside quiet hours. */
export function snapOutOfQuietHours(ms: number): number {
  if (!inQuietHours(ms)) return ms;
  const p = localParts(ms);
  const dayShift = p.hour >= QUIET_HOURS.start ? 1 : 0;
  return epochForLocal(p.year, p.month, p.day + dayShift, QUIET_HOURS.end, 0);
}

/** Whole minutes/hours/days ago, for "checked 4 min ago" honesty lines. */
export function relativeAgo(thenMs: number, now: number = realNowMs()): { unit: 'now' | 'min' | 'h' | 'd'; n: number } {
  const diff = Math.max(0, now - thenMs);
  const min = Math.floor(diff / 60_000);
  if (min < 1) return { unit: 'now', n: 0 };
  if (min < 60) return { unit: 'min', n: min };
  const h = Math.floor(min / 60);
  if (h < 24) return { unit: 'h', n: h };
  return { unit: 'd', n: Math.floor(h / 24) };
}

/**
 * The one place that decides how a due date, a count or a fit is described.
 * Returns structured descriptors; the UI translates them (`t()`), so this module stays string-free
 * except for Intl date pieces.
 */
import { TZ } from './time';
import type { Locale, StepStatus } from './types';

export type DueDescriptor =
  | { kind: 'done' }
  | { kind: 'overdue'; days: number }
  | { kind: 'today' }
  | { kind: 'tomorrow' }
  | { kind: 'in'; days: number; dueMs: number }
  | { kind: 'rolling'; windowDays: number }
  | { kind: 'unknown' };

export function describeDue(input: { status: StepStatus; dueMs: number | null; daysLeft: number | null; rollingWindowDays: number | null }): DueDescriptor {
  if (input.status === 'done') return { kind: 'done' };
  if (input.dueMs == null || input.daysLeft == null) {
    if (input.rollingWindowDays != null) return { kind: 'rolling', windowDays: input.rollingWindowDays };
    return { kind: 'unknown' };
  }
  if (input.daysLeft < 0) return { kind: 'overdue', days: -input.daysLeft };
  if (input.daysLeft === 0) return { kind: 'today' };
  if (input.daysLeft === 1) return { kind: 'tomorrow' };
  return { kind: 'in', days: input.daysLeft, dueMs: input.dueMs };
}

/** Due within a week is "soon" (amber); overdue is red; everything else is neutral. */
export type DueTone = 'overdue' | 'soon' | 'neutral' | 'done';

export function dueTone(d: DueDescriptor): DueTone {
  if (d.kind === 'done') return 'done';
  if (d.kind === 'overdue') return 'overdue';
  if (d.kind === 'today' || d.kind === 'tomorrow') return 'soon';
  if (d.kind === 'in' && d.days <= 7) return 'soon';
  return 'neutral';
}

const monthDayCache = new Map<string, Intl.DateTimeFormat>();

/** "Mar 2" / "2 mar" in the program zone. */
export function formatMonthDay(ms: number, locale: Locale): string {
  let f = monthDayCache.get(locale);
  if (!f) {
    f = new Intl.DateTimeFormat(locale === 'es' ? 'es-US' : 'en-US', { timeZone: TZ, month: 'short', day: 'numeric' });
    monthDayCache.set(locale, f);
  }
  return f.format(new Date(ms)).replace(/\.$/, '');
}

/** "Tue 11 Feb · 6:00 PM" pieces for events and sessions. */
export function formatDayTime(ms: number, locale: Locale): string {
  const f = new Intl.DateTimeFormat(locale === 'es' ? 'es-US' : 'en-US', {
    timeZone: TZ,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
  return f.format(new Date(ms));
}

/** Fit is never a bare percentage: a word and 2–5 bars (spec S5 shows the score; we show its meaning). */
export type FitWord = 'strong' | 'good' | 'fair' | 'possible';

export function fitWord(score: number): { word: FitWord; bars: 2 | 3 | 4 | 5 } {
  if (score >= 0.85) return { word: 'strong', bars: 5 };
  if (score >= 0.7) return { word: 'good', bars: 4 };
  if (score >= 0.55) return { word: 'fair', bars: 3 };
  return { word: 'possible', bars: 2 };
}

/** Tabular, locale-aware integer. */
export function formatInt(n: number, locale: Locale): string {
  return new Intl.NumberFormat(locale === 'es' ? 'es-US' : 'en-US', { maximumFractionDigits: 0 }).format(n);
}

/** "about 40 min" / "about 2 h" pieces. */
export function estimateDescriptor(minutes: number): { unit: 'min' | 'h'; n: number } {
  if (minutes < 90) return { unit: 'min', n: minutes };
  return { unit: 'h', n: Math.round(minutes / 30) / 2 };
}

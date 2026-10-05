/**
 * Deadline resolver (spec §8 `deadline_rule`). The correctness core: unit-tested hard.
 *
 * Rules:
 *  fixed    → 'MM-DD' in the school year the student is in the step's grade (Aug 1 – Jul 31)
 *  relative → a grade/season anchor (fall = Sep 1, spring = Feb 1) plus an offset in days
 *  district → the end of a window published in the district calendar for that school year
 *  rolling  → N days after the step was opened (null until opened)
 *
 * All results are epoch ms at the end of the due day in America/Los_Angeles.
 */
import { addDays, endOfLocalDay, epochForLocal, isoDateToEndOfDay, localParts, schoolYearStartYear } from './time';
import type { DeadlineRule, DistrictCalendar, Grade, GradeAnchor, Season } from './types';

export interface DeadlineContext {
  /** The student's current grade. */
  grade: Grade;
  /** The lowest grade the step belongs to; steps for later grades resolve in later school years. */
  stepGrade: Grade;
  nowMs: number;
  calendar: DistrictCalendar;
  openedAtMs: number | null;
}

/** Calendar year in which the school year for `stepGrade` starts, given the student is in `grade` now. */
export function schoolYearStartFor(ctx: Pick<DeadlineContext, 'grade' | 'stepGrade' | 'nowMs'>): number {
  const yearsAhead = ctx.stepGrade - ctx.grade;
  return schoolYearStartYear(ctx.nowMs) + yearsAhead;
}

function parseMonthDay(monthDay: string): { month: number; day: number } | null {
  const m = /^(\d{2})-(\d{2})$/.exec(monthDay);
  if (!m) return null;
  const month = Number(m[1]);
  const day = Number(m[2]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return { month, day };
}

function anchorParts(anchor: GradeAnchor): { grade: Grade; season: Season } | null {
  const m = /^grade_(9|10|11|12)_(fall|spring)$/.exec(anchor);
  if (!m) return null;
  return { grade: Number(m[1]) as Grade, season: m[2] as Season };
}

export function schoolYearLabelFor(startYear: number): string {
  return `${startYear}-${String((startYear + 1) % 100).padStart(2, '0')}`;
}

/**
 * Resolve a rule to the end of the due day (epoch ms), or null when it cannot be known yet
 * (rolling step not opened, district window not published).
 */
export function resolveDeadline(rule: DeadlineRule, ctx: DeadlineContext): number | null {
  switch (rule.kind) {
    case 'fixed': {
      const md = parseMonthDay(rule.monthDay);
      if (!md) return null;
      const start = schoolYearStartFor(ctx);
      const year = md.month >= 8 ? start : start + 1;
      return endOfLocalDay(year, md.month, md.day);
    }
    case 'relative': {
      const a = anchorParts(rule.anchor);
      if (!a) return null;
      const start = schoolYearStartFor({ grade: ctx.grade, stepGrade: a.grade, nowMs: ctx.nowMs });
      const anchorMs = a.season === 'fall' ? epochForLocal(start, 9, 1) : epochForLocal(start + 1, 2, 1);
      const shifted = addDays(anchorMs, rule.offsetDays);
      const p = localParts(shifted);
      return endOfLocalDay(p.year, p.month, p.day);
    }
    case 'district': {
      const label = schoolYearLabelFor(schoolYearStartFor(ctx));
      const window = ctx.calendar[label]?.[rule.key];
      if (!window) return null;
      const ms = isoDateToEndOfDay(window.to);
      return Number.isNaN(ms) ? null : ms;
    }
    case 'rolling': {
      if (ctx.openedAtMs == null) return null;
      const p = localParts(addDays(ctx.openedAtMs, rule.windowDays));
      return endOfLocalDay(p.year, p.month, p.day);
    }
    default:
      return null;
  }
}

/** Whole local days from now until the due day (negative = overdue). */
export function daysLeft(dueMs: number | null, now: number): number | null {
  if (dueMs == null) return null;
  const a = localParts(now);
  const b = localParts(dueMs);
  return Math.round((Date.UTC(b.year, b.month - 1, b.day) - Date.UTC(a.year, a.month - 1, a.day)) / 86_400_000);
}

/** A due date more than this many days in the past is treated as last year's and not shown as overdue. */
export const OVERDUE_HORIZON_DAYS = 120;

export function isWithinHorizon(dueMs: number | null, now: number): boolean {
  const d = daysLeft(dueMs, now);
  return d == null || d >= -OVERDUE_HORIZON_DAYS;
}

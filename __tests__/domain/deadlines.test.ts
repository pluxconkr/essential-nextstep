/**
 * The deadline resolver is the correctness core. Every expectation below is a California date,
 * whatever zone the test machine runs in (CI runs this suite under TZ=UTC and TZ=Asia/Seoul).
 */
import { daysLeft, isWithinHorizon, resolveDeadline, schoolYearStartFor } from '@/domain/deadlines';
import { daysBetween, endOfLocalDay, epochForLocal, inQuietHours, localParts, schoolYearLabel, schoolYearStartYear, snapOutOfQuietHours } from '@/domain/time';
import type { DistrictCalendar } from '@/domain/types';

// Fri 7 Feb 2027, 4:12 pm in Los Angeles (the prototype's frame).
const NOW = epochForLocal(2027, 2, 7, 16, 12);
const CAL: DistrictCalendar = { '2026-27': { course_selection_window: { from: '2027-03-01', to: '2027-04-15', label: 'Course selection' } } };

describe('time: program zone arithmetic', () => {
  test('epochForLocal is PST in March and PDT in July', () => {
    expect(epochForLocal(2027, 3, 2, 23, 59)).toBe(Date.UTC(2027, 2, 3, 7, 59)); // UTC-8
    expect(epochForLocal(2027, 7, 4, 12, 0)).toBe(Date.UTC(2027, 6, 4, 19, 0)); // UTC-7
  });
  test('localParts round-trips', () => {
    const p = localParts(epochForLocal(2027, 3, 2, 23, 59));
    expect([p.year, p.month, p.day, p.hour, p.minute, p.weekday]).toEqual([2027, 3, 2, 23, 59, 2]);
  });
  test('school year runs Aug 1 – Jul 31', () => {
    expect(schoolYearStartYear(NOW)).toBe(2026);
    expect(schoolYearStartYear(epochForLocal(2027, 8, 1))).toBe(2027);
    expect(schoolYearStartYear(epochForLocal(2027, 7, 31, 23))).toBe(2026);
    expect(schoolYearLabel(NOW)).toBe('2026-27');
  });
  test('daysBetween counts calendar days across the DST change', () => {
    expect(daysBetween(epochForLocal(2027, 3, 10), epochForLocal(2027, 3, 20))).toBe(10);
    expect(daysBetween(epochForLocal(2027, 3, 20), epochForLocal(2027, 3, 10))).toBe(-10);
  });
  test('quiet hours are 21:00–07:00 program time', () => {
    expect(inQuietHours(epochForLocal(2027, 2, 7, 22, 0))).toBe(true);
    expect(inQuietHours(epochForLocal(2027, 2, 7, 6, 59))).toBe(true);
    expect(inQuietHours(epochForLocal(2027, 2, 7, 8, 0))).toBe(false);
    expect(localParts(snapOutOfQuietHours(epochForLocal(2027, 2, 7, 22, 30)))).toMatchObject({ day: 8, hour: 7, minute: 0 });
    expect(localParts(snapOutOfQuietHours(epochForLocal(2027, 2, 7, 3, 0)))).toMatchObject({ day: 7, hour: 7 });
  });
});

describe('resolveDeadline', () => {
  const ctx = (over: Partial<Parameters<typeof resolveDeadline>[1]> = {}) => ({ grade: 11 as const, stepGrade: 11 as const, nowMs: NOW, calendar: CAL, openedAtMs: null, ...over });

  test('fixed: Cal Grant Mar 2 is 23 days away on Feb 7', () => {
    const due = resolveDeadline({ kind: 'fixed', monthDay: '03-02' }, ctx());
    expect(due).toBe(endOfLocalDay(2027, 3, 2));
    expect(daysLeft(due, NOW)).toBe(23);
  });
  test('fixed: a grade-12 step resolves in the next school year for a grade-11 student', () => {
    const due = resolveDeadline({ kind: 'fixed', monthDay: '10-01' }, ctx({ stepGrade: 12 }));
    expect(due).toBe(endOfLocalDay(2027, 10, 1));
    expect(daysLeft(due, NOW)).toBe(236);
  });
  test('fixed: a date already passed this school year is overdue, not next year', () => {
    const due = resolveDeadline({ kind: 'fixed', monthDay: '02-01' }, ctx());
    expect(daysLeft(due, NOW)).toBe(-6);
    expect(isWithinHorizon(due, NOW)).toBe(true);
  });
  test('fixed: fall dates belong to the first calendar year of the school year', () => {
    expect(schoolYearStartFor({ grade: 11, stepGrade: 11, nowMs: NOW })).toBe(2026);
    const due = resolveDeadline({ kind: 'fixed', monthDay: '11-30' }, ctx());
    expect(due).toBe(endOfLocalDay(2026, 11, 30));
    expect(isWithinHorizon(due, NOW)).toBe(true); // 69 days ago, still shown as overdue
    const old = resolveDeadline({ kind: 'fixed', monthDay: '09-01' }, ctx());
    expect(isWithinHorizon(old, NOW)).toBe(false); // > 120 days ago: last year's business
  });
  test('relative: grade_11_spring − 30 days = Jan 2', () => {
    const due = resolveDeadline({ kind: 'relative', anchor: 'grade_11_spring', offsetDays: -30 }, ctx());
    expect(due).toBe(endOfLocalDay(2027, 1, 2));
  });
  test('relative: grade_12_fall + 10 for a grade-11 student is Sep 11 next year', () => {
    const due = resolveDeadline({ kind: 'relative', anchor: 'grade_12_fall', offsetDays: 10 }, ctx());
    expect(due).toBe(endOfLocalDay(2027, 9, 11));
  });
  test('district: uses the window end for the current school year; null when unpublished', () => {
    expect(resolveDeadline({ kind: 'district', key: 'course_selection_window' }, ctx())).toBe(endOfLocalDay(2027, 4, 15));
    expect(resolveDeadline({ kind: 'district', key: 'missing' }, ctx())).toBeNull();
  });
  test('rolling: counts from opened_at; unknown until opened', () => {
    expect(resolveDeadline({ kind: 'rolling', windowDays: 7 }, ctx())).toBeNull();
    const due = resolveDeadline({ kind: 'rolling', windowDays: 7 }, ctx({ openedAtMs: NOW }));
    expect(due).toBe(endOfLocalDay(2027, 2, 14));
  });
  test('malformed rules resolve to null instead of throwing', () => {
    expect(resolveDeadline({ kind: 'fixed', monthDay: '13-40' }, ctx())).toBeNull();
    expect(resolveDeadline({ kind: 'relative', anchor: 'grade_7_fall' as never, offsetDays: 0 }, ctx())).toBeNull();
  });
  test('days left do not depend on the time of day', () => {
    const due = resolveDeadline({ kind: 'fixed', monthDay: '03-02' }, ctx());
    expect(daysLeft(due, epochForLocal(2027, 2, 7, 0, 1))).toBe(23);
    expect(daysLeft(due, epochForLocal(2027, 2, 7, 23, 59))).toBe(23);
    expect(daysLeft(due, epochForLocal(2027, 3, 2, 9, 0))).toBe(0);
    expect(daysLeft(due, epochForLocal(2027, 3, 3, 0, 1))).toBe(-1);
  });
});

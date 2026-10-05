import { evaluate, newlyEarned } from '@/domain/badges';
import { levelFor, POINTS, pointsBySource, pointsByWeek, totalPoints } from '@/domain/effort';
import type { BadgeDef, EffortEvent, RoadmapStep, Step, StudentStep } from '@/domain/types';

const ev = (kind: EffortEvent['kind'], at: string, id = `${kind}-${at}`): EffortEvent => ({ id, kind, points: POINTS[kind], ref: null, at });

describe('effort points', () => {
  test('the spec table: no points for streaks, time in app or logging in', () => {
    expect(POINTS).toEqual({ step_verified: 40, step_self: 10, question_asked: 5, circle_attended: 25, helped_peer: 30, resource_accepted: 20 });
  });
  test('totals, sources and levels', () => {
    const events = [ev('step_verified', '2027-02-01T10:00:00Z'), ev('circle_attended', '2027-02-02T10:00:00Z'), ev('question_asked', '2027-02-03T10:00:00Z'), ev('step_self', '2027-02-04T10:00:00Z')];
    expect(totalPoints(events)).toBe(80);
    expect(pointsBySource(events)[0]).toEqual({ kind: 'step_verified', points: 40, count: 1 });
    expect(levelFor(1240)).toEqual({ level: 4, next: 1400, into: 340 });
    expect(levelFor(0).level).toBe(1);
    expect(levelFor(5000).next).toBeNull();
  });
  test('points by week buckets the last four weeks', () => {
    const now = Date.UTC(2027, 1, 7, 12);
    const d = (days: number) => new Date(now - days * 86_400_000).toISOString();
    const events = [ev('step_verified', d(1)), ev('circle_attended', d(8)), ev('circle_attended', d(9)), ev('question_asked', d(30))];
    expect(pointsByWeek(events, now)).toEqual([0, 0, 50, 40]);
  });
});

const step = (key: string): Step => ({
  key,
  track: 'college',
  core: true,
  title: key,
  titleEs: key,
  why: 'why '.repeat(10),
  whyEs: 'por qué '.repeat(10),
  how: ['x'],
  howEs: ['x'],
  docs: ['x'],
  docsEs: ['x'],
  deadline: { kind: 'fixed', monthDay: '03-02' },
  estMinutes: 10,
  prerequisites: [],
  grades: [11],
  verifier: 'any',
  ownerRole: 'coordinator',
  sourceUrl: 'https://example.org',
  lastVerified: '2027-01-01',
  verifyBy: '2027-08-01',
  reviewStatus: 'reviewed',
  variants: [],
});
const row = (key: string, status: StudentStep['status'], verification: StudentStep['verification'] = 'mentor'): RoadmapStep => ({
  step: step(key),
  state: { stepKey: key, status, dueAt: null, openedAt: null, doneAt: null, verification: status === 'done' ? verification : null },
  blockedBy: [],
  variantReason: null,
  daysLeft: null,
});

const badges: BadgeDef[] = [
  { key: 'aid-applicant', name: 'Aid Applicant', nameEs: 'Solicitante', icon: 'dollarsign', description: '3 of 4 aid steps verified', descriptionEs: '3 de 4', criteria: { kind: 'steps_verified', stepKeys: ['aid-1', 'aid-2', 'aid-3', 'aid-4'], min: 3 }, unlocks: [] },
  { key: 'aid-ready', name: 'Aid Ready', nameEs: 'Lista', icon: 'checkmark', description: 'all four', descriptionEs: 'las cuatro', criteria: { kind: 'steps_verified', stepKeys: ['aid-1', 'aid-2', 'aid-3', 'aid-4'], min: 4 }, unlocks: ['peer_helper'] },
  { key: 'circle-regular', name: 'Circle Regular', nameEs: 'Habitual', icon: 'person.3', description: '8 of 10', descriptionEs: '8 de 10', criteria: { kind: 'circle_weeks', min: 8, of: 10 }, unlocks: [] },
  { key: 'mentor-ready', name: 'Mentor Ready', nameEs: 'Mentor', icon: 'star', description: 'Aid Ready + Circle Regular', descriptionEs: '', criteria: { kind: 'badges', badgeKeys: ['aid-ready', 'circle-regular'] }, unlocks: ['mentor_track'] },
];

describe('badges', () => {
  const base = { badges, circleWeeks: { attended: 9, of: 11 }, peersHelped: 0, resourcesAccepted: 0, earned: [], nowIso: '2027-02-07T00:00:00.000Z' };

  test('3 of 4 verified aid steps earns Aid Applicant as verified; Aid Ready still shows 3 of 4', () => {
    const r = evaluate({ ...base, roadmap: [row('aid-1', 'done'), row('aid-2', 'done'), row('aid-3', 'done'), row('aid-4', 'open')] });
    const by = Object.fromEntries(r.map((p) => [p.badge.key, p]));
    expect(by['aid-applicant'].earned).toMatchObject({ badgeKey: 'aid-applicant', evidenceLevel: 'verified' });
    expect(by['aid-ready'].earned).toBeNull();
    expect([by['aid-ready'].have, by['aid-ready'].need]).toEqual([3, 4]);
  });
  test('a self-attested step makes the badge self-reported, and it upgrades once verified', () => {
    const self = evaluate({ ...base, roadmap: [row('aid-1', 'done'), row('aid-2', 'done'), row('aid-3', 'done', 'self')] });
    const earned = self.find((p) => p.badge.key === 'aid-applicant')!.earned!;
    expect(earned.evidenceLevel).toBe('self');
    const upgraded = evaluate({ ...base, earned: [earned], roadmap: [row('aid-1', 'done'), row('aid-2', 'done'), row('aid-3', 'done')] });
    expect(upgraded.find((p) => p.badge.key === 'aid-applicant')!.earned).toMatchObject({ evidenceLevel: 'verified', earnedAt: earned.earnedAt });
  });
  test('circle weeks and composite badges', () => {
    const r = evaluate({ ...base, circleWeeks: { attended: 8, of: 10 }, roadmap: ['aid-1', 'aid-2', 'aid-3', 'aid-4'].map((k) => row(k, 'done')) });
    const keys = r.filter((p) => p.earned).map((p) => p.badge.key);
    expect(keys).toEqual(['aid-applicant', 'aid-ready', 'circle-regular', 'mentor-ready']);
    expect(newlyEarned([], r).map((e) => e.badgeKey)).toEqual(keys);
    const fewWeeks = evaluate({ ...base, circleWeeks: { attended: 5, of: 6 }, roadmap: [] });
    expect(fewWeeks.find((p) => p.badge.key === 'circle-regular')!.earned).toBeNull();
  });
});

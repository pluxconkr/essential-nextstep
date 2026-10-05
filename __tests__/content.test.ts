/**
 * The bundled content is what students see offline. It must pass the same gates as the build,
 * and the demo roadmap must produce exactly one next step from it.
 */
import content from '@/assets/data/content.json';
import { ContentSchema, EXPLORATION_STEP_KEY, isStale, shiftVerificationDates, validateContent } from '@/domain/content';
import { generate, nextStep, trackProgress } from '@/domain/roadmap';
import { epochForLocal } from '@/domain/time';
import type { Content, StudentProfile } from '@/domain/types';

const c = content as unknown as Content;
const BUILT = Date.parse(c.builtAt);

describe('bundled content', () => {
  test('matches the schema and the cross-record rules', () => {
    const parsed = ContentSchema.safeParse(c);
    expect(parsed.success ? [] : parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`)).toEqual([]);
    expect(validateContent(c)).toEqual([]);
  });
  test('has the two Phase-1 tracks filled and the exploration step', () => {
    const byTrack = (k: string) => c.steps.filter((s) => s.track === k && s.key !== EXPLORATION_STEP_KEY).length;
    expect(byTrack('college')).toBe(14);
    expect(byTrack('language')).toBe(7);
    expect(c.steps.some((s) => s.key === EXPLORATION_STEP_KEY)).toBe(true);
  });
  test('every step carries an owner, a source, verification dates, a verifier and Spanish text', () => {
    for (const s of c.steps) {
      expect(s.ownerRole).toBeTruthy();
      expect(s.sourceUrl).toMatch(/^https:\/\//);
      expect(s.lastVerified).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(s.verifyBy >= s.lastVerified).toBe(true);
      expect(s.verifier).toBeTruthy();
      expect(s.titleEs.length).toBeGreaterThan(2);
      expect(s.whyEs.length).toBeGreaterThan(20);
      expect(s.howEs.length).toBe(s.how.length);
    }
  });
  test('nothing in the bundle was stale when it was built', () => {
    for (const s of c.steps) expect(isStale(s, BUILT)).toBe(false);
  });
  test('crisis resources are present and name a reviewer', () => {
    expect(c.crisis.length).toBeGreaterThanOrEqual(3);
    for (const r of c.crisis) expect(r.reviewedBy.length).toBeGreaterThan(0);
  });
});

describe('demo student on the bundled content', () => {
  const NOW = epochForLocal(2027, 2, 7, 16, 12);
  // The demo clock is a fiction months ahead of the build; shift verification dates with it (as the demo loader does).
  const c = shiftVerificationDates(content as unknown as Content, Math.floor((NOW - BUILT) / 86_400_000));
  const ana: StudentProfile = {
    orgId: 'valley-high',
    schoolId: 'valley-high',
    schoolName: 'Valley High',
    displayName: 'Ana M.',
    initials: 'AM',
    grade: 12,
    languagesRead: ['es', 'en'],
    languagesHome: ['es'],
    elStatus: 'no',
    ageBand: 'under_18',
    goals: ['college', 'biliteracy'],
    aidPath: 'cadaa',
    verification: 'school_email',
    needsInterpreter: true,
    smsOk: true,
    lowDataMode: false,
  };
  test('gets the Dream Act variant and a single next step', () => {
    const r = generate({ profile: ana, content: c, prior: [], nowMs: NOW });
    const aid = r.find((x) => x.step.key === 'aid-application');
    expect(aid?.step.title).toBe('Submit the California Dream Act application');
    expect(aid?.daysLeft).toBe(23);
    expect(nextStep(r, NOW)).not.toBeNull();
    expect(trackProgress(r, ['college', 'career', 'language', 'study']).map((p) => p.track)).toEqual(['college', 'language']);
    // EL-only steps are hidden for a reclassified student.
    expect(r.map((x) => x.step.key)).not.toContain('elpac-prep');
  });
  test('an undecided ninth grader still lands on one step', () => {
    const r = generate({ profile: { ...ana, grade: 9, goals: ['unsure'], aidPath: null, elStatus: 'yes' }, content: c, prior: [], nowMs: NOW });
    expect(nextStep(r, NOW)).not.toBeNull();
    expect(r.map((x) => x.step.key)).toEqual(expect.arrayContaining([EXPLORATION_STEP_KEY, 'elpac-prep']));
  });
});

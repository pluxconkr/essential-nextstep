import { EXPLORATION_STEP_KEY, tracksFor, validateContent } from '@/domain/content';
import { comingUp, generate, nextStep, pickVariant, rescheduleDiff, stallStage, trackProgress, whyDiffers } from '@/domain/roadmap';
import { endOfLocalDay, epochForLocal } from '@/domain/time';
import type { Content, Step, StudentProfile, StudentStep } from '@/domain/types';

const NOW = epochForLocal(2027, 2, 7, 16, 12);
const D = (ms: number) => ms - 86_400_000 * 10; // ten days ago

const base = (over: Partial<Step> & Pick<Step, 'key' | 'track' | 'deadline' | 'grades'>): Step => ({
  core: false,
  title: `Title ${over.key}`,
  titleEs: `Título ${over.key}`,
  why: 'Why this matters, in consequence terms, long enough for the schema.',
  whyEs: 'Por qué importa, en términos de consecuencias, suficientemente largo.',
  how: ['Do the thing'],
  howEs: ['Haz la cosa'],
  docs: ['Nothing'],
  docsEs: ['Nada'],
  estMinutes: 30,
  prerequisites: [],
  verifier: 'any',
  ownerRole: 'coordinator',
  sourceUrl: 'https://example.org/source',
  lastVerified: '2027-01-15',
  verifyBy: '2027-08-01',
  reviewStatus: 'reviewed',
  variants: [],
  ...over,
});

const steps: Step[] = [
  base({ key: 'ag-audit', track: 'college', core: true, grades: [10, 11], deadline: { kind: 'fixed', monthDay: '01-15' } }),
  base({
    key: 'aid-application',
    track: 'college',
    core: true,
    grades: [11, 12],
    deadline: { kind: 'fixed', monthDay: '03-02' },
    title: 'Submit FAFSA',
    variants: [{ condition: { aidPath: 'cadaa' }, override: { title: 'Submit the California Dream Act application' } }],
  }),
  base({ key: 'cal-grant-gpa', track: 'college', core: true, grades: [11, 12], deadline: { kind: 'fixed', monthDay: '03-02' }, prerequisites: ['aid-application'], estMinutes: 15 }),
  base({ key: 'csu-account', track: 'college', grades: [12], deadline: { kind: 'fixed', monthDay: '10-01' } }),
  base({ key: 'interpreter-request', track: 'language', grades: [9, 10, 11, 12], deadline: { kind: 'district', key: 'aid_night' }, estMinutes: 5 }),
  base({ key: 'weekly-plan', track: 'study', grades: [9, 10, 11, 12], deadline: { kind: 'rolling', windowDays: 7 } }),
  base({ key: EXPLORATION_STEP_KEY, track: 'college', grades: [9, 10, 11, 12], deadline: { kind: 'rolling', windowDays: 14 } }),
  base({ key: 'stale-step', track: 'college', grades: [11], deadline: { kind: 'fixed', monthDay: '04-01' }, lastVerified: '2026-06-01' }),
];

const content: Content = {
  version: 'test',
  builtAt: '2027-02-01T00:00:00.000Z',
  tracks: [
    { key: 'college', name: 'College', nameEs: 'Universidad', order: 1 },
    { key: 'career', name: 'Career', nameEs: 'Carrera', order: 2 },
    { key: 'language', name: 'Language & family', nameEs: 'Idioma y familia', order: 3 },
    { key: 'study', name: 'Study skills', nameEs: 'Hábitos de estudio', order: 4 },
  ],
  steps,
  resources: [],
  glossary: [],
  badges: [],
  crisis: [{ key: 'x', name: 'x', nameEs: 'x', action: 'x', actionEs: 'x', reviewedBy: 'c', reviewedAt: '2027-01-01' }],
  calendar: { '2026-27': { aid_night: { from: '2027-02-09', to: '2027-02-09', label: 'Aid night interpreter request' } } },
};

const ana: StudentProfile = {
  orgId: 'valley-high',
  schoolId: 'valley-high',
  schoolName: 'Valley High',
  displayName: 'Ana M.',
  initials: 'AM',
  grade: 11,
  languagesRead: ['es', 'en'],
  languagesHome: ['es'],
  elStatus: 'no',
  ageBand: 'under_18',
  goals: ['college'],
  aidPath: 'cadaa',
  verification: 'school_email',
  needsInterpreter: true,
  smsOk: true,
  lowDataMode: false,
};

describe('content rules', () => {
  test('synthetic content is internally valid', () => {
    expect(validateContent(content)).toEqual([]);
  });
  test('tracksFor: goals and home language decide the tracks', () => {
    expect(tracksFor(['college'], ['en'])).toEqual({ tracks: ['college'], includeCore: false, includeExploration: false });
    expect(tracksFor(['college'], ['es'])).toEqual({ tracks: ['college', 'language'], includeCore: false, includeExploration: false });
    expect(tracksFor(['certificate'], ['en'])).toEqual({ tracks: ['career'], includeCore: true, includeExploration: true });
    expect(tracksFor(['unsure'], ['vi'])).toEqual({ tracks: ['language'], includeCore: true, includeExploration: true });
    expect(tracksFor([], ['en'])).toMatchObject({ includeCore: true, includeExploration: true });
  });
});

describe('generate', () => {
  test('selects the right steps and applies the aid-path variant', () => {
    const r = generate({ profile: ana, content, prior: [], nowMs: NOW });
    const keys = r.map((x) => x.step.key);
    expect(keys).toEqual(expect.arrayContaining(['ag-audit', 'aid-application', 'cal-grant-gpa', 'csu-account', 'interpreter-request']));
    expect(keys).not.toContain('weekly-plan'); // study track not selected
    expect(keys).not.toContain(EXPLORATION_STEP_KEY); // no exploration for a college-only goal
    expect(keys).not.toContain('stale-step'); // hidden: last verified > 120 days ago
    const aid = r.find((x) => x.step.key === 'aid-application')!;
    expect(aid.step.title).toBe('Submit the California Dream Act application');
    expect(aid.variantReason).toEqual({ aidPath: 'cadaa' });
    expect(aid.daysLeft).toBe(23);
  });
  test('statuses: future grade and unmet prerequisites are locked; the rest open', () => {
    const r = generate({ profile: ana, content, prior: [], nowMs: NOW });
    const by = Object.fromEntries(r.map((x) => [x.step.key, x]));
    expect(by['csu-account'].state.status).toBe('locked');
    expect(by['csu-account'].state.dueAt).toBe(endOfLocalDay(2027, 10, 1));
    expect(by['cal-grant-gpa'].state.status).toBe('locked');
    expect(by['cal-grant-gpa'].blockedBy).toEqual(['aid-application']);
    expect(by['aid-application'].state.status).toBe('open');
    expect(by['interpreter-request'].state.dueAt).toBe(endOfLocalDay(2027, 2, 9));
  });
  test('order is due ascending, nulls last; the next step is the overdue A-G audit', () => {
    const r = generate({ profile: ana, content, prior: [], nowMs: NOW });
    expect(r.map((x) => x.step.key)).toEqual(['ag-audit', 'interpreter-request', 'aid-application', 'cal-grant-gpa', 'csu-account']);
    expect(nextStep(r, NOW)?.step.key).toBe('ag-audit');
    expect(nextStep(r, NOW)?.daysLeft).toBe(-23);
  });
  test('prior progress is preserved and unlocks dependents', () => {
    const prior: StudentStep[] = [{ stepKey: 'ag-audit', status: 'done', dueAt: null, openedAt: D(NOW), doneAt: NOW, verification: 'mentor' }, { stepKey: 'aid-application', status: 'done', dueAt: null, openedAt: D(NOW), doneAt: NOW, verification: 'upload' }];
    const r = generate({ profile: ana, content, prior, nowMs: NOW });
    const by = Object.fromEntries(r.map((x) => [x.step.key, x]));
    expect(by['ag-audit'].state).toMatchObject({ status: 'done', verification: 'mentor' });
    expect(by['cal-grant-gpa'].state.status).toBe('open');
    expect(nextStep(r, NOW)?.step.key).toBe('interpreter-request');
    expect(comingUp(r, NOW).map((x) => x.step.key)).toEqual(['cal-grant-gpa', 'csu-account']);
  });
  test('a stalled step is marked and still eligible as the next step', () => {
    const prior: StudentStep[] = [{ stepKey: 'ag-audit', status: 'open', dueAt: null, openedAt: NOW - 15 * 86_400_000, doneAt: null, verification: null }];
    const r = generate({ profile: ana, content, prior, nowMs: NOW });
    expect(r.find((x) => x.step.key === 'ag-audit')?.state.status).toBe('stalled');
    expect(stallStage(NOW - 15 * 86_400_000, NOW, 'open')).toBe(2);
    expect(stallStage(NOW - 6 * 86_400_000, NOW, 'open')).toBe(0);
    expect(stallStage(NOW - 30 * 86_400_000, NOW, 'done')).toBe(0);
  });
  test('certificate-only and undecided students never land on an empty roadmap', () => {
    for (const goals of [['certificate'], ['unsure'], []] as StudentProfile['goals'][]) {
      const r = generate({ profile: { ...ana, goals, languagesHome: ['en'] }, content, prior: [], nowMs: NOW });
      expect(r.length).toBeGreaterThan(0);
      expect(r.map((x) => x.step.key)).toContain(EXPLORATION_STEP_KEY);
      expect(r.map((x) => x.step.key)).toContain('aid-application'); // core
      expect(nextStep(r, NOW)).not.toBeNull();
    }
  });
  test('track progress never shows a 0 / 0 track', () => {
    const r = generate({ profile: ana, content, prior: [], nowMs: NOW });
    const p = trackProgress(r, ['college', 'career', 'language', 'study']);
    expect(p.map((x) => x.track)).toEqual(['college', 'language']);
    expect(p[0]).toEqual({ track: 'college', done: 0, total: 4 });
  });
  test('whyDiffers names the form choice and the language track, never a status', () => {
    const r = generate({ profile: ana, content, prior: [], nowMs: NOW });
    expect(whyDiffers(r, ana)).toEqual([{ kind: 'aidPath', aidPath: 'cadaa' }, { kind: 'languageTrack' }]);
  });
  test('pickVariant leaves the template alone when nothing matches', () => {
    const { step, reason } = pickVariant(steps[1], { ...ana, aidPath: 'fafsa' });
    expect(step.title).toBe('Submit FAFSA');
    expect(reason).toBeNull();
  });
  test('rescheduleDiff lists steps whose due date moved', () => {
    const first = generate({ profile: ana, content, prior: [], nowMs: NOW });
    const prev = first.map((x) => x.state);
    const moved = generate({ profile: ana, content: { ...content, calendar: { '2026-27': { aid_night: { from: '2027-02-16', to: '2027-02-16', label: 'moved' } } } }, prior: prev, nowMs: NOW });
    expect(rescheduleDiff(prev, moved)).toEqual(['interpreter-request']);
  });
  test('generation is deterministic', () => {
    const a = generate({ profile: ana, content, prior: [], nowMs: NOW });
    const b = generate({ profile: ana, content, prior: [], nowMs: NOW });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});

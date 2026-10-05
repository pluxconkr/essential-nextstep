import { announceable, fairness, hardConstraints, queueOrder, rank, score, terms, WEIGHTS, type MatchMentor, type MatchStudent } from '@/domain/matching';

const NOW = Date.UTC(2027, 1, 7, 20, 0);
const DAY = 86_400_000;

const ana: MatchStudent = {
  id: 's1',
  languagesHome: ['es'],
  languagesRead: ['es', 'en'],
  nextStepKeys: ['aid-application', 'cal-grant-gpa', 'ag-audit'],
  goals: ['college'],
  pathTags: ['first_gen', 'cadaa', 'csu'],
  schoolId: 'valley-high',
  districtId: 'sausd',
  regionId: 'oc',
  circleIds: ['c1'],
  ageBand: 'under_18',
  staffOnly: false,
  blockedMentorIds: [],
};

const mentor = (over: Partial<MatchMentor> & { id: string }): MatchMentor => ({
  languages: ['es', 'en'],
  verifiedStepKeys: ['aid-application', 'cal-grant-gpa', 'ag-audit', 'dual-enrollment'],
  pathTags: ['first_gen', 'cadaa', 'csu'],
  schoolOfOriginId: 'valley-high',
  districtId: 'sausd',
  regionId: 'oc',
  capacity: 4,
  load: 3,
  medianReplyMinutes: 180,
  trained: true,
  conductAgreed: true,
  ageBand: 'adult',
  kind: 'near_peer',
  backgroundCheckCleared: false,
  circleIds: ['c1'],
  blockedStudentIds: [],
  pausedUntilMs: null,
  active: true,
  ...over,
});

const opts = { nowMs: NOW, adultVolunteersEnabled: false };

describe('terms and score', () => {
  test('weights sum to 1 and a perfect mentor scores 1 minus headroom', () => {
    expect(Object.values(WEIGHTS).reduce((a, b) => a + b, 0)).toBeCloseTo(1);
    const t = terms(ana, mentor({ id: 'daniela' }));
    expect(t).toEqual({ language: 1, steps: 1, path: 1, origin: 1, availability: 0.25, circle: 1 });
    expect(score(t)).toBe(0.91);
  });
  test('language fit: home language 1, read-only 0.6, none 0', () => {
    expect(terms(ana, mentor({ id: 'a', languages: ['es'] })).language).toBe(1);
    expect(terms(ana, mentor({ id: 'b', languages: ['en'] })).language).toBe(0.6);
    expect(terms({ ...ana, languagesRead: ['vi'] }, mentor({ id: 'c', languages: ['en'] })).language).toBe(0);
  });
  test('origin: same school > same district > same region', () => {
    expect(terms(ana, mentor({ id: 'a', schoolOfOriginId: 'other', districtId: 'sausd' })).origin).toBe(0.6);
    expect(terms(ana, mentor({ id: 'b', schoolOfOriginId: 'other', districtId: 'other', regionId: 'oc' })).origin).toBe(0.3);
    expect(terms(ana, mentor({ id: 'c', schoolOfOriginId: 'other', districtId: 'other', regionId: 'la' })).origin).toBe(0);
  });
  test('step overlap is the share of the next three steps the mentor verified', () => {
    expect(terms(ana, mentor({ id: 'a', verifiedStepKeys: ['aid-application'] })).steps).toBeCloseTo(1 / 3);
  });
});

describe('hard constraints (never violated)', () => {
  test.each([
    ['capacity', { load: 4 }],
    ['not_trained', { trained: false }],
    ['no_conduct', { conductAgreed: false }],
    ['inactive', { active: false }],
    ['paused', { pausedUntilMs: NOW + DAY }],
    ['mentor_not_adult', { ageBand: 'under_18' as const }],
    ['adult_volunteer_disabled', { kind: 'adult_volunteer' as const }],
    ['blocked', { blockedStudentIds: ['s1'] }],
  ])('%s', (violation, over) => {
    expect(hardConstraints(ana, mentor({ id: 'm', ...over }), opts)).toContain(violation);
    expect(rank(ana, [mentor({ id: 'm', ...over })], opts)).toEqual([]);
  });
  test('adult volunteers need a cleared background check even when enabled', () => {
    expect(hardConstraints(ana, mentor({ id: 'm', kind: 'adult_volunteer' }), { ...opts, adultVolunteersEnabled: true })).toEqual(['background_check']);
    expect(hardConstraints(ana, mentor({ id: 'm', kind: 'adult_volunteer', backgroundCheckCleared: true }), { ...opts, adultVolunteersEnabled: true })).toEqual([]);
  });
  test('staff-only students are never ranked by the algorithm', () => {
    expect(rank({ ...ana, staffOnly: true }, [mentor({ id: 'm' })], opts)).toEqual([]);
  });
  test('student blocklist is respected', () => {
    expect(rank({ ...ana, blockedMentorIds: ['m'] }, [mentor({ id: 'm' })], opts)).toEqual([]);
  });
});

describe('rank', () => {
  test('orders by score, then availability, then id', () => {
    const r = rank(ana, [mentor({ id: 'thanh', languages: ['vi', 'en'], schoolOfOriginId: 'segerstrom', load: 4 }), mentor({ id: 'jose', load: 2 }), mentor({ id: 'daniela' })], opts);
    expect(r.map((x) => x.mentor.id)).toEqual(['jose', 'daniela']);
    expect(r[0].score).toBeGreaterThan(r[1].score);
  });
  test('1,000 random pairs: no ranked mentor violates a constraint', () => {
    let seed = 42;
    const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
    const pick = <T>(xs: T[]) => xs[Math.floor(rnd() * xs.length)];
    for (let i = 0; i < 1000; i++) {
      const s: MatchStudent = { ...ana, staffOnly: rnd() < 0.1, blockedMentorIds: rnd() < 0.2 ? ['m'] : [] };
      const m = mentor({
        id: 'm',
        load: Math.floor(rnd() * 6),
        capacity: 4,
        trained: rnd() < 0.8,
        conductAgreed: rnd() < 0.8,
        active: rnd() < 0.9,
        ageBand: pick(['adult', 'under_18']),
        kind: pick(['near_peer', 'alum', 'adult_volunteer']),
        backgroundCheckCleared: rnd() < 0.5,
        pausedUntilMs: rnd() < 0.2 ? NOW + DAY : null,
        blockedStudentIds: rnd() < 0.1 ? ['s1'] : [],
      });
      const o = { nowMs: NOW, adultVolunteersEnabled: rnd() < 0.5 };
      for (const r of rank(s, [m], o)) expect(hardConstraints(s, r.mentor, o)).toEqual([]);
    }
  });
});

describe('fairness and the guardian gate', () => {
  test('language-first wait holds for 7 days, then longest-wait wins after 10', () => {
    expect(fairness(NOW - 3 * DAY, NOW, false, true)).toMatchObject({ holdForLanguage: true, longestWaitPriority: false, daysWaiting: 3 });
    expect(fairness(NOW - 8 * DAY, NOW, false, true)).toMatchObject({ holdForLanguage: false, longestWaitPriority: false });
    expect(fairness(NOW - 12 * DAY, NOW, false, true)).toMatchObject({ holdForLanguage: false, longestWaitPriority: true });
    expect(fairness(NOW - 3 * DAY, NOW, true, true).holdForLanguage).toBe(false);
  });
  test('queue puts students waiting 10+ days first, oldest first', () => {
    const q = queueOrder([{ id: 'a', waitingSinceMs: NOW - 2 * DAY }, { id: 'b', waitingSinceMs: NOW - 12 * DAY }, { id: 'c', waitingSinceMs: NOW - 9 * DAY }, { id: 'd', waitingSinceMs: NOW - 15 * DAY }], NOW);
    expect(q.map((x) => x.id)).toEqual(['d', 'b', 'c', 'a']);
  });
  test('an under-18 match is announced only after the guardian notice, by any of three paths', () => {
    const base = { studentAgeBand: 'under_18' as const, confirmedAtMs: NOW, guardianNoticeSentAtMs: null, guardianNoticeRecordedAtMs: null, familyLinkLastOpenedAtMs: null };
    expect(announceable(base)).toBe(false);
    expect(announceable({ ...base, guardianNoticeSentAtMs: NOW + 1 })).toBe(true);
    expect(announceable({ ...base, guardianNoticeRecordedAtMs: NOW + 1 })).toBe(true);
    expect(announceable({ ...base, familyLinkLastOpenedAtMs: NOW + 1 })).toBe(true);
    expect(announceable({ ...base, familyLinkLastOpenedAtMs: NOW - 1 })).toBe(false); // opened before confirmation does not count
    expect(announceable({ ...base, confirmedAtMs: null, guardianNoticeSentAtMs: NOW })).toBe(false);
    expect(announceable({ ...base, studentAgeBand: 'adult' })).toBe(true);
  });
});

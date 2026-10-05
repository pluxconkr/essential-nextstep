/**
 * Matching (spec §9). The algorithm ranks; a human confirms; nothing here assigns.
 *
 *   score = 0.28 language_fit + 0.22 step_overlap + 0.16 path_similarity
 *         + 0.14 origin_proximity + 0.12 availability + 0.08 circle_overlap
 *
 * Hard constraints are never violated; fairness rules decide who waits for whom.
 */
import type { AgeBand, Goal, MentorKind } from './types';

// spec §9 weights
export const WEIGHTS = { language: 0.28, steps: 0.22, path: 0.16, origin: 0.14, availability: 0.12, circle: 0.08 } as const;
export type Term = keyof typeof WEIGHTS;
export const DEFAULT_CAPACITY = 4;
export const LANGUAGE_WAIT_DAYS = 7;
export const LONGEST_WAIT_DAYS = 10;

export interface MatchStudent {
  id: string;
  languagesHome: string[];
  languagesRead: string[];
  nextStepKeys: string[]; // the next 3 steps
  goals: Goal[];
  pathTags: string[]; // e.g. first_gen, cadaa, csu, cc_transfer, career
  schoolId: string;
  districtId: string | null;
  regionId: string | null;
  circleIds: string[];
  ageBand: AgeBand;
  /** newcomer / unaccompanied / foster youth: staff assign, the algorithm is excluded. */
  staffOnly: boolean;
  blockedMentorIds: string[];
}

export interface MatchMentor {
  id: string;
  languages: string[];
  verifiedStepKeys: string[];
  pathTags: string[];
  schoolOfOriginId: string | null;
  districtId: string | null;
  regionId: string | null;
  capacity: number;
  load: number;
  medianReplyMinutes: number | null;
  trained: boolean;
  conductAgreed: boolean;
  ageBand: AgeBand;
  kind: MentorKind;
  backgroundCheckCleared: boolean;
  circleIds: string[];
  blockedStudentIds: string[];
  pausedUntilMs: number | null;
  active: boolean;
}

export interface MatchOptions {
  nowMs: number;
  adultVolunteersEnabled: boolean;
  weights?: Record<Term, number>;
}

const EN = (c: string) => c.toLowerCase() === 'en';
const overlap = (a: readonly string[], b: readonly string[]) => a.filter((x) => b.map((y) => y.toLowerCase()).includes(x.toLowerCase()));

export function languageFit(student: Pick<MatchStudent, 'languagesHome' | 'languagesRead'>, mentor: Pick<MatchMentor, 'languages'>): number {
  const home = overlap(student.languagesHome.filter((l) => !EN(l)), mentor.languages);
  if (home.length > 0) return 1;
  const read = overlap(student.languagesRead, mentor.languages);
  if (read.length > 0) return 0.6;
  return 0;
}

export function stepOverlap(student: Pick<MatchStudent, 'nextStepKeys'>, mentor: Pick<MatchMentor, 'verifiedStepKeys'>): number {
  if (student.nextStepKeys.length === 0) return 0;
  return overlap(student.nextStepKeys, mentor.verifiedStepKeys).length / student.nextStepKeys.length;
}

export function pathSimilarity(student: Pick<MatchStudent, 'pathTags'>, mentor: Pick<MatchMentor, 'pathTags'>): number {
  const a = new Set(student.pathTags.map((t) => t.toLowerCase()));
  const b = new Set(mentor.pathTags.map((t) => t.toLowerCase()));
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  return inter / new Set([...a, ...b]).size;
}

export function originProximity(student: Pick<MatchStudent, 'schoolId' | 'districtId' | 'regionId'>, mentor: Pick<MatchMentor, 'schoolOfOriginId' | 'districtId' | 'regionId'>): number {
  if (mentor.schoolOfOriginId && mentor.schoolOfOriginId === student.schoolId) return 1;
  if (mentor.districtId && mentor.districtId === student.districtId) return 0.6;
  if (mentor.regionId && mentor.regionId === student.regionId) return 0.3;
  return 0;
}

export function availability(mentor: Pick<MatchMentor, 'capacity' | 'load' | 'medianReplyMinutes'>): number {
  const headroom = Math.max(0, mentor.capacity - mentor.load) / Math.max(1, mentor.capacity);
  const m = mentor.medianReplyMinutes;
  const reply = m == null ? 0.7 : m <= 180 ? 1 : m <= 720 ? 0.8 : m <= 1440 ? 0.6 : 0.4;
  return headroom * reply;
}

export function circleOverlap(student: Pick<MatchStudent, 'circleIds'>, mentor: Pick<MatchMentor, 'circleIds'>): number {
  return overlap(student.circleIds, mentor.circleIds).length > 0 ? 1 : 0;
}

export function terms(student: MatchStudent, mentor: MatchMentor): Record<Term, number> {
  return {
    language: languageFit(student, mentor),
    steps: stepOverlap(student, mentor),
    path: pathSimilarity(student, mentor),
    origin: originProximity(student, mentor),
    availability: availability(mentor),
    circle: circleOverlap(student, mentor),
  };
}

export function score(t: Record<Term, number>, weights: Record<Term, number> = WEIGHTS): number {
  let s = 0;
  for (const k of Object.keys(WEIGHTS) as Term[]) s += weights[k] * t[k];
  return Math.round(s * 1000) / 1000;
}

export type Violation = 'capacity' | 'not_trained' | 'no_conduct' | 'inactive' | 'paused' | 'mentor_not_adult' | 'adult_volunteer_disabled' | 'background_check' | 'staff_only_student' | 'blocked';

/** Constraints the algorithm never violates (spec §9). Empty array = eligible. */
export function hardConstraints(student: MatchStudent, mentor: MatchMentor, opts: MatchOptions): Violation[] {
  const v: Violation[] = [];
  if (student.staffOnly) v.push('staff_only_student');
  if (mentor.load >= mentor.capacity) v.push('capacity');
  if (!mentor.trained) v.push('not_trained');
  if (!mentor.conductAgreed) v.push('no_conduct');
  if (!mentor.active) v.push('inactive');
  if (mentor.pausedUntilMs != null && mentor.pausedUntilMs > opts.nowMs) v.push('paused');
  if (mentor.ageBand !== 'adult') v.push('mentor_not_adult');
  if (mentor.kind === 'adult_volunteer') {
    if (!opts.adultVolunteersEnabled) v.push('adult_volunteer_disabled');
    else if (!mentor.backgroundCheckCleared) v.push('background_check');
  }
  if (student.blockedMentorIds.includes(mentor.id) || mentor.blockedStudentIds.includes(student.id)) v.push('blocked');
  return v;
}

export interface Ranked {
  mentor: MatchMentor;
  score: number;
  terms: Record<Term, number>;
}

/** Eligible mentors ranked by score, best first. Ties break on availability then id, so the order is stable. */
export function rank(student: MatchStudent, mentors: readonly MatchMentor[], opts: MatchOptions): Ranked[] {
  const weights = opts.weights ?? WEIGHTS;
  return mentors
    .filter((m) => hardConstraints(student, m, opts).length === 0)
    .map((mentor) => {
      const t = terms(student, mentor);
      return { mentor, score: score(t, weights), terms: t };
    })
    .sort((a, b) => b.score - a.score || b.terms.availability - a.terms.availability || (a.mentor.id < b.mentor.id ? -1 : 1));
}

export interface FairnessState {
  /** Hold for a language match (up to 7 days) before pairing with an English-speaking mentor + interpreter circle. */
  holdForLanguage: boolean;
  /** After 10 days waiting, longest-wait outranks best-fit. */
  longestWaitPriority: boolean;
  daysWaiting: number;
}

export function fairness(waitingSinceMs: number, nowMs: number, hasLanguageMatch: boolean, needsLanguageMatch: boolean): FairnessState {
  const daysWaiting = Math.floor((nowMs - waitingSinceMs) / 86_400_000);
  return {
    holdForLanguage: needsLanguageMatch && !hasLanguageMatch && daysWaiting < LANGUAGE_WAIT_DAYS,
    longestWaitPriority: daysWaiting >= LONGEST_WAIT_DAYS,
    daysWaiting,
  };
}

/** Queue order for the coordinator: students past the longest-wait threshold first (oldest first), then by waiting time. */
export function queueOrder<T extends { waitingSinceMs: number }>(queue: readonly T[], nowMs: number): T[] {
  return [...queue].sort((a, b) => {
    const fa = fairness(a.waitingSinceMs, nowMs, true, false).longestWaitPriority ? 0 : 1;
    const fb = fairness(b.waitingSinceMs, nowMs, true, false).longestWaitPriority ? 0 : 1;
    return fa - fb || a.waitingSinceMs - b.waitingSinceMs;
  });
}

export interface AnnounceInput {
  studentAgeBand: AgeBand;
  confirmedAtMs: number | null;
  guardianNoticeSentAtMs: number | null;
  guardianNoticeRecordedAtMs: number | null;
  familyLinkLastOpenedAtMs: number | null;
}

/**
 * An under-18 match is announced to neither party until the guardian notice was delivered:
 * sent to a guardian contact, recorded by staff (phone / in person), or the family view opened after
 * confirmation. There is no exception path. Adults are announced on confirmation.
 */
export function announceable(input: AnnounceInput): boolean {
  if (input.confirmedAtMs == null) return false;
  if (input.studentAgeBand === 'adult') return true;
  if (input.guardianNoticeSentAtMs != null) return true;
  if (input.guardianNoticeRecordedAtMs != null) return true;
  if (input.familyLinkLastOpenedAtMs != null && input.familyLinkLastOpenedAtMs >= input.confirmedAtMs) return true;
  return false;
}

/** Plain-language reasons for a suggestion, in the order of the weights (rendered by the UI through t()). */
export function explain(t: Record<Term, number>): { term: Term; weight: number; value: number }[] {
  return (Object.keys(WEIGHTS) as Term[]).map((term) => ({ term, weight: WEIGHTS[term], value: t[term] }));
}

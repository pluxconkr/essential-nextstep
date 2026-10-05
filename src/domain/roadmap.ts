/**
 * Roadmap engine (spec §8). Pure: the phone runs it for the "Re-check" preview and offline display,
 * the server runs it to write the canonical rows. Given the same inputs both produce the same list.
 *
 *   tracks  = tracksFor(goals) ∪ language when the home language is not English
 *   steps   = live steps of those tracks (+ core, + exploration) whose grade is now or later
 *   variant = first variant whose condition matches (aid path, EL status, grade, org)
 *   due     = resolveDeadline(rule, grade, calendar)
 *   order   = (due asc, prerequisite depth, est_minutes asc)
 *   next    = first open, unblocked step
 *
 * Show only ONE next step on home. Everything else is behind Roadmap.
 */
import { EXPLORATION_STEP_KEY, isStale, stepIndex, tracksFor } from './content';
import { daysLeft, isWithinHorizon, resolveDeadline } from './deadlines';
import type { Content, RoadmapStep, Step, StepStatus, StudentProfile, StudentStep, TrackKey, VariantCondition } from './types';

export interface GenerateInput {
  profile: StudentProfile;
  content: Content;
  /** Previously stored progress; status, opened/done timestamps and verification are preserved. */
  prior: readonly StudentStep[];
  nowMs: number;
}

/** Stall stages after a step was opened and not finished: nudge (7 d), circle invitation (14 d), coordinator flag (21 d). */
export const STALL_DAYS = [7, 14, 21] as const;

export function stallStage(openedAtMs: number | null, nowMs: number, status: StepStatus): 0 | 1 | 2 | 3 {
  if (openedAtMs == null || status === 'done' || status === 'pending_verification' || status === 'locked') return 0;
  const days = Math.floor((nowMs - openedAtMs) / 86_400_000);
  if (days >= STALL_DAYS[2]) return 3;
  if (days >= STALL_DAYS[1]) return 2;
  if (days >= STALL_DAYS[0]) return 1;
  return 0;
}

function conditionMatches(c: VariantCondition, profile: StudentProfile): boolean {
  if (c.aidPath !== undefined && profile.aidPath !== c.aidPath) return false;
  if (c.elStatus !== undefined && (profile.elStatus == null || !c.elStatus.includes(profile.elStatus))) return false;
  if (c.grade !== undefined && !c.grade.includes(profile.grade)) return false;
  if (c.orgId !== undefined && profile.orgId !== c.orgId) return false;
  return true;
}

/** Apply the first matching variant. Returns the merged step and the condition that applied. */
export function pickVariant(step: Step, profile: StudentProfile): { step: Step; reason: VariantCondition | null } {
  for (const v of step.variants) {
    if (conditionMatches(v.condition, profile)) {
      return { step: { ...step, ...v.override, variants: [] }, reason: v.condition };
    }
  }
  return { step, reason: null };
}

/** Which template steps belong to this student at all (before status and ordering). */
export function selectSteps(profile: StudentProfile, content: Content, nowMs: number): Step[] {
  const sel = tracksFor(profile.goals, profile.languagesHome);
  const chosen = new Set<TrackKey>(sel.tracks);
  return content.steps.filter((s) => {
    if (isStale(s, nowMs)) return false;
    const maxGrade = Math.max(...s.grades);
    if (maxGrade < profile.grade) return false; // a past-grade step is not shown as homework
    if (s.onlyIf && !conditionMatches(s.onlyIf, profile)) return false;
    if (s.key === EXPLORATION_STEP_KEY) return sel.includeExploration; // only for undecided / career-first students
    if (chosen.has(s.track)) return true;
    if (sel.includeCore && s.core) return true;
    return false;
  });
}

function depthOf(key: string, byKey: Map<string, Step>, memo: Map<string, number>, trail = new Set<string>()): number {
  const cached = memo.get(key);
  if (cached !== undefined) return cached;
  if (trail.has(key)) return 0;
  trail.add(key);
  const step = byKey.get(key);
  const d = step && step.prerequisites.length ? 1 + Math.max(...step.prerequisites.map((p) => depthOf(p, byKey, memo, trail))) : 0;
  memo.set(key, d);
  return d;
}

export function generate(input: GenerateInput): RoadmapStep[] {
  const { profile, content, nowMs } = input;
  const priorByKey = new Map(input.prior.map((p) => [p.stepKey, p] as const));
  const selected = selectSteps(profile, content, nowMs);
  const selectedKeys = new Set(selected.map((s) => s.key));
  const byKey = stepIndex(content);
  const depthMemo = new Map<string, number>();

  const doneKeys = new Set(input.prior.filter((p) => p.status === 'done').map((p) => p.stepKey));

  const rows: RoadmapStep[] = selected.map((template) => {
    const { step, reason } = pickVariant(template, profile);
    const prior = priorByKey.get(step.key) ?? null;
    // The school year a deadline belongs to: this year when the step covers the student's grade, else the next grade it covers.
    const stepGrade = (step.grades.includes(profile.grade) ? profile.grade : Math.min(...step.grades.filter((g) => g > profile.grade))) as Step['grades'][number];
    const dueAt = resolveDeadline(step.deadline, { grade: profile.grade, stepGrade, nowMs, calendar: content.calendar, openedAtMs: prior?.openedAt ?? null });
    // Prerequisites that are part of this roadmap and not done block the step; prerequisites outside the roadmap do not.
    const blockedBy = step.prerequisites.filter((p) => selectedKeys.has(p) && !doneKeys.has(p));
    const futureGrade = stepGrade > profile.grade;

    let status: StepStatus;
    if (prior?.status === 'done' || prior?.status === 'pending_verification') status = prior.status;
    else if (futureGrade || blockedBy.length > 0) status = 'locked';
    else status = stallStage(prior?.openedAt ?? null, nowMs, 'open') > 0 ? 'stalled' : 'open';

    const state: StudentStep = {
      stepKey: step.key,
      status,
      dueAt,
      openedAt: prior?.openedAt ?? null,
      doneAt: prior?.doneAt ?? null,
      verification: prior?.verification ?? null,
    };
    return { step, state, blockedBy, variantReason: reason, daysLeft: daysLeft(dueAt, nowMs) };
  });

  return order(rows, byKey, depthMemo);
}

/** (due asc, nulls last) → prerequisite depth → est minutes asc → key, so the order is stable. */
export function order(rows: RoadmapStep[], byKey: Map<string, Step>, memo = new Map<string, number>()): RoadmapStep[] {
  return [...rows].sort((a, b) => {
    const da = a.state.dueAt ?? Number.POSITIVE_INFINITY;
    const db = b.state.dueAt ?? Number.POSITIVE_INFINITY;
    if (da !== db) return da - db;
    const pa = depthOf(a.step.key, byKey, memo);
    const pb = depthOf(b.step.key, byKey, memo);
    if (pa !== pb) return pa - pb;
    if (a.step.estMinutes !== b.step.estMinutes) return a.step.estMinutes - b.step.estMinutes;
    return a.step.key < b.step.key ? -1 : 1;
  });
}

const ACTIONABLE: StepStatus[] = ['open', 'stalled'];

/** The ONE step on the home screen: overdue first, then the soonest due, among open, unblocked, in-horizon steps. */
export function nextStep(roadmap: readonly RoadmapStep[], nowMs: number): RoadmapStep | null {
  const candidates = roadmap.filter((r) => ACTIONABLE.includes(r.state.status) && r.blockedBy.length === 0 && isWithinHorizon(r.state.dueAt, nowMs));
  if (candidates.length === 0) return null;
  // Rolling steps without a due date come after dated steps.
  return [...candidates].sort((a, b) => (a.state.dueAt ?? Number.POSITIVE_INFINITY) - (b.state.dueAt ?? Number.POSITIVE_INFINITY))[0];
}

/** Up to `n` steps after the next one, for "Coming up". */
export function comingUp(roadmap: readonly RoadmapStep[], nowMs: number, n = 4): RoadmapStep[] {
  const next = nextStep(roadmap, nowMs);
  const rank: Record<StepStatus, number> = { stalled: 0, open: 1, locked: 2, pending_verification: 3, done: 4 };
  return roadmap
    .filter((r) => r !== next && r.state.status !== 'done' && isWithinHorizon(r.state.dueAt, nowMs))
    .sort((a, b) => rank[a.state.status] - rank[b.state.status] || (a.state.dueAt ?? Number.POSITIVE_INFINITY) - (b.state.dueAt ?? Number.POSITIVE_INFINITY))
    .slice(0, n);
}

export interface TrackProgress {
  track: TrackKey;
  done: number;
  total: number;
}

/** Progress per track, only for tracks that have at least one step for this student (never "0 / 0"). */
export function trackProgress(roadmap: readonly RoadmapStep[], trackOrder: readonly TrackKey[]): TrackProgress[] {
  return trackOrder
    .map((track) => {
      const rows = roadmap.filter((r) => r.step.track === track);
      return { track, done: rows.filter((r) => r.state.status === 'done').length, total: rows.length };
    })
    .filter((p) => p.total > 0);
}

export type DiffersReason = { kind: 'aidPath'; aidPath: 'fafsa' | 'cadaa' | 'unsure' } | { kind: 'elStatus' } | { kind: 'languageTrack' } | { kind: 'exploration' } | { kind: 'core' };

/** Why this roadmap differs from a classmate's, in the student's own terms (never a status, always a form choice or a goal). */
export function whyDiffers(roadmap: readonly RoadmapStep[], profile: StudentProfile): DiffersReason[] {
  const out: DiffersReason[] = [];
  const seen = new Set<string>();
  const push = (r: DiffersReason) => {
    const k = JSON.stringify(r);
    if (!seen.has(k)) {
      seen.add(k);
      out.push(r);
    }
  };
  for (const r of roadmap) {
    if (r.variantReason?.aidPath && profile.aidPath) push({ kind: 'aidPath', aidPath: profile.aidPath });
    if (r.variantReason?.elStatus) push({ kind: 'elStatus' });
  }
  const sel = tracksFor(profile.goals, profile.languagesHome);
  if (sel.tracks.includes('language') && !profile.goals.includes('biliteracy')) push({ kind: 'languageTrack' });
  if (sel.includeExploration) push({ kind: 'exploration' });
  if (sel.includeCore && !sel.tracks.includes('college')) push({ kind: 'core' });
  return out;
}

/** Steps whose due date changed between two generations (reminders are deleted and recreated for these). */
export function rescheduleDiff(prev: readonly StudentStep[], next: readonly RoadmapStep[]): string[] {
  const prevDue = new Map(prev.map((p) => [p.stepKey, p.dueAt] as const));
  return next.filter((r) => prevDue.has(r.step.key) && prevDue.get(r.step.key) !== r.state.dueAt).map((r) => r.step.key);
}

/** Store-friendly projection of a generated roadmap. */
export function toStudentSteps(roadmap: readonly RoadmapStep[]): StudentStep[] {
  return roadmap.map((r) => r.state);
}

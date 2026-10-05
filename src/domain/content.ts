/**
 * Content schemas and rules (spec §16). Content is an operation, not an asset:
 * every step has an owner, a source and a verify-by date, and anything not checked in 120 days
 * is hidden rather than shown as fact. The same rule runs on the phone and on the server.
 */
import { z } from 'zod';

import { isoDateToEndOfDay } from './time';
import type { Content, Goal, Step, TrackKey } from './types';

export const STALE_AFTER_DAYS = 120;
export const WARN_AFTER_DAYS = 90;
export const MAX_READING_GRADE = 6.5;
/** The step every undecided or career-first student gets so nobody lands on an empty roadmap (§3.6). */
export const EXPLORATION_STEP_KEY = 'counselor-12-minutes';

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'ISO date YYYY-MM-DD');
const locale = z.enum(['en', 'es']);
const grade = z.union([z.literal(9), z.literal(10), z.literal(11), z.literal(12)]);
const trackKey = z.enum(['college', 'career', 'language', 'study']);

export const DeadlineRuleSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('fixed'), monthDay: z.string().regex(/^\d{2}-\d{2}$/) }),
  z.object({ kind: z.literal('relative'), anchor: z.string().regex(/^grade_(9|10|11|12)_(fall|spring)$/), offsetDays: z.number().int().min(-365).max(365) }),
  z.object({ kind: z.literal('district'), key: z.string().min(1) }),
  z.object({ kind: z.literal('rolling'), windowDays: z.number().int().min(1).max(120) }),
]);

export const VariantConditionSchema = z.object({
  aidPath: z.enum(['fafsa', 'cadaa', 'unsure']).optional(),
  elStatus: z.array(z.enum(['yes', 'no', 'unsure'])).optional(),
  grade: z.array(grade).optional(),
  orgId: z.string().optional(),
});

export const StepSchema = z.object({
  key: z.string().regex(/^[a-z0-9-]+$/),
  track: trackKey,
  core: z.boolean(),
  title: z.string().min(3),
  titleEs: z.string().min(3),
  why: z.string().min(20),
  whyEs: z.string().min(20),
  how: z.array(z.string().min(3)).min(1),
  howEs: z.array(z.string().min(3)).min(1),
  docs: z.array(z.string().min(1)).min(1),
  docsEs: z.array(z.string().min(1)).min(1),
  deadline: DeadlineRuleSchema,
  estMinutes: z.number().int().min(1).max(600),
  prerequisites: z.array(z.string()),
  grades: z.array(grade).min(1),
  verifier: z.enum(['mentor', 'upload', 'staff', 'self', 'any']),
  ownerRole: z.enum(['coordinator', 'counselor', 'cbo', 'mentor_lead']),
  sourceUrl: z.string().url(),
  lastVerified: isoDate,
  verifyBy: isoDate,
  reviewStatus: z.enum(['reviewed', 'pending']),
  onlyIf: VariantConditionSchema.optional(),
  variants: z.array(
    z.object({
      condition: VariantConditionSchema,
      override: z
        .object({
          title: z.string().optional(),
          titleEs: z.string().optional(),
          why: z.string().optional(),
          whyEs: z.string().optional(),
          how: z.array(z.string()).optional(),
          howEs: z.array(z.string()).optional(),
          docs: z.array(z.string()).optional(),
          docsEs: z.array(z.string()).optional(),
          deadline: DeadlineRuleSchema.optional(),
          sourceUrl: z.string().url().optional(),
          estMinutes: z.number().int().optional(),
        })
        .strict(),
    }),
  ),
});

export const ResourceSchema = z.object({
  key: z.string().regex(/^[a-z0-9-]+$/),
  stepKey: z.string(),
  title: z.string().min(3),
  titleEs: z.string().min(3),
  kind: z.enum(['official', 'walkthrough', 'template', 'explainer', 'script', 'worksheet', 'story', 'reference']),
  url: z.string().url(),
  languages: z.array(locale).min(1),
  verifiedByRole: z.enum(['coordinator', 'counselor', 'cbo', 'mentor_lead', 'mentor']),
  verifiedByName: z.string().min(1),
  verifiedAt: isoDate,
});

export const GlossarySchema = z.object({
  term: z.string().min(1),
  definition: z.string().min(10),
  definitionEs: z.string().min(10),
  reviewedBy: z.string().min(1),
  reviewedAt: isoDate,
});

export const BadgeSchema = z.object({
  key: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string(),
  nameEs: z.string(),
  icon: z.string(),
  description: z.string(),
  descriptionEs: z.string(),
  criteria: z.discriminatedUnion('kind', [
    z.object({ kind: z.literal('steps_verified'), stepKeys: z.array(z.string()).min(1), min: z.number().int().min(1) }),
    z.object({ kind: z.literal('circle_weeks'), min: z.number().int().min(1), of: z.number().int().min(1) }),
    z.object({ kind: z.literal('peers_helped'), min: z.number().int().min(1) }),
    z.object({ kind: z.literal('resources_accepted'), min: z.number().int().min(1) }),
    z.object({ kind: z.literal('badges'), badgeKeys: z.array(z.string()).min(1) }),
  ]),
  unlocks: z.array(z.string()),
});

export const CrisisResourceSchema = z.object({
  key: z.string(),
  name: z.string(),
  nameEs: z.string(),
  action: z.string(),
  actionEs: z.string(),
  reviewedBy: z.string().min(1),
  reviewedAt: isoDate,
});

export const CalendarSchema = z.record(
  z.string().regex(/^\d{4}-\d{2}$/),
  z.record(z.string(), z.object({ from: isoDate, to: isoDate, label: z.string() })),
);

export const ContentSchema = z.object({
  version: z.string().min(1),
  builtAt: z.string(),
  tracks: z.array(z.object({ key: trackKey, name: z.string(), nameEs: z.string(), order: z.number().int() })).min(1),
  steps: z.array(StepSchema).min(1),
  resources: z.array(ResourceSchema),
  glossary: z.array(GlossarySchema),
  badges: z.array(BadgeSchema),
  crisis: z.array(CrisisResourceSchema).min(1),
  calendar: CalendarSchema,
});

/** Cross-record checks the schema cannot express. Returns human-readable problems; empty = valid. */
export function validateContent(c: Content): string[] {
  const problems: string[] = [];
  const keys = new Set<string>();
  for (const s of c.steps) {
    if (keys.has(s.key)) problems.push(`duplicate step key ${s.key}`);
    keys.add(s.key);
  }
  for (const s of c.steps) {
    for (const p of s.prerequisites) if (!keys.has(p)) problems.push(`${s.key}: unknown prerequisite ${p}`);
    if (s.prerequisites.includes(s.key)) problems.push(`${s.key}: is its own prerequisite`);
    const lv = isoDateToEndOfDay(s.lastVerified);
    const vb = isoDateToEndOfDay(s.verifyBy);
    if (Number.isNaN(lv) || Number.isNaN(vb)) problems.push(`${s.key}: bad verification dates`);
    else if (vb < lv) problems.push(`${s.key}: verifyBy is before lastVerified`);
  }
  if (!keys.has(EXPLORATION_STEP_KEY)) problems.push(`missing exploration step ${EXPLORATION_STEP_KEY}`);
  for (const r of c.resources) if (!keys.has(r.stepKey)) problems.push(`resource ${r.key}: unknown step ${r.stepKey}`);
  const badgeKeys = new Set(c.badges.map((b) => b.key));
  for (const b of c.badges) {
    if (b.criteria.kind === 'steps_verified') for (const k of b.criteria.stepKeys) if (!keys.has(k)) problems.push(`badge ${b.key}: unknown step ${k}`);
    if (b.criteria.kind === 'badges') for (const k of b.criteria.badgeKeys) if (!badgeKeys.has(k)) problems.push(`badge ${b.key}: unknown badge ${k}`);
  }
  // Prerequisite cycles.
  const state = new Map<string, 0 | 1 | 2>();
  const byKey = new Map(c.steps.map((s) => [s.key, s] as const));
  const visit = (k: string, trail: string[]): void => {
    const st = state.get(k) ?? 0;
    if (st === 1) {
      problems.push(`prerequisite cycle: ${[...trail, k].join(' → ')}`);
      return;
    }
    if (st === 2) return;
    state.set(k, 1);
    for (const p of byKey.get(k)?.prerequisites ?? []) visit(p, [...trail, k]);
    state.set(k, 2);
  };
  for (const s of c.steps) visit(s.key, []);
  return problems;
}

/** Days since the step was last verified, in whole days (floor). */
export function daysSinceVerified(step: Pick<Step, 'lastVerified'>, nowMs: number): number {
  const lv = isoDateToEndOfDay(step.lastVerified);
  if (Number.isNaN(lv)) return Number.POSITIVE_INFINITY;
  return Math.floor((nowMs - lv) / 86_400_000);
}

/** Steps stale > 120 days are hidden, not shown as fact (spec §16). */
export function isStale(step: Pick<Step, 'lastVerified'>, nowMs: number): boolean {
  return daysSinceVerified(step, nowMs) > STALE_AFTER_DAYS;
}

export function needsReverification(step: Pick<Step, 'lastVerified'>, nowMs: number): boolean {
  return daysSinceVerified(step, nowMs) > WARN_AFTER_DAYS;
}

export function visibleSteps(content: Content, nowMs: number): Step[] {
  return content.steps.filter((s) => !isStale(s, nowMs));
}

export function stepIndex(content: Content): Map<string, Step> {
  return new Map(content.steps.map((s) => [s.key, s] as const));
}

export interface TrackSelection {
  tracks: TrackKey[];
  /** Core steps (A-G, aid, Cal Grant GPA, dual enrollment) apply to any post-high-school path. */
  includeCore: boolean;
  /** The exploration step for students who picked "certificate" or "I don't know yet". */
  includeExploration: boolean;
}

const NON_ENGLISH = (code: string) => code.toLowerCase() !== 'en';

/** Goal → track map for v1 (§3.6). Career and Study-skills content ships in Phase 2. */
export function tracksFor(goals: readonly Goal[], languagesHome: readonly string[]): TrackSelection {
  const tracks = new Set<TrackKey>();
  let includeCore = false;
  let includeExploration = false;
  for (const g of goals) {
    if (g === 'college') tracks.add('college');
    if (g === 'biliteracy') tracks.add('language');
    if (g === 'certificate') {
      tracks.add('career');
      includeCore = true;
      includeExploration = true;
    }
    if (g === 'unsure') {
      includeCore = true;
      includeExploration = true;
    }
  }
  if (languagesHome.some(NON_ENGLISH)) tracks.add('language');
  if (goals.length === 0) {
    includeCore = true;
    includeExploration = true;
  }
  return { tracks: [...tracks], includeCore, includeExploration };
}

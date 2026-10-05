/**
 * Badges (spec §10): criteria are always about a COMPLETED, VERIFIED thing. Verified badges look
 * different from self-reported ones, always. Badges unlock capabilities, not cosmetics.
 */
import type { BadgeDef, EarnedBadge, RoadmapStep } from './types';

export interface BadgeInput {
  badges: readonly BadgeDef[];
  roadmap: readonly RoadmapStep[];
  circleWeeks: { attended: number; of: number };
  peersHelped: number;
  resourcesAccepted: number;
  /** Already-earned badges keep their original date. */
  earned: readonly EarnedBadge[];
  nowIso: string;
}

export interface BadgeProgress {
  badge: BadgeDef;
  earned: EarnedBadge | null;
  /** Numerator / denominator for the "3 of 4" line. */
  have: number;
  need: number;
}

function stepsVerifiedProgress(roadmap: readonly RoadmapStep[], stepKeys: readonly string[]): { count: number; allVerified: boolean } {
  const done = roadmap.filter((r) => stepKeys.includes(r.step.key) && r.state.status === 'done');
  return { count: done.length, allVerified: done.every((r) => r.state.verification !== 'self') };
}

export function evaluate(input: BadgeInput): BadgeProgress[] {
  const earnedByKey = new Map(input.earned.map((e) => [e.badgeKey, e] as const));
  const result: BadgeProgress[] = [];
  // Two passes so "badges" criteria can see badges earned in this evaluation.
  const nowEarned = new Map<string, EarnedBadge>(earnedByKey);

  const pass = () => {
    result.length = 0;
    for (const badge of input.badges) {
      let have = 0;
      let need = 1;
      let qualifies = false;
      let level: 'verified' | 'self' = 'verified';
      const c = badge.criteria;
      switch (c.kind) {
        case 'steps_verified': {
          const p = stepsVerifiedProgress(input.roadmap, c.stepKeys);
          have = p.count;
          need = c.min;
          qualifies = p.count >= c.min;
          level = p.allVerified ? 'verified' : 'self';
          break;
        }
        case 'circle_weeks':
          have = Math.min(input.circleWeeks.attended, c.of);
          need = c.min;
          qualifies = input.circleWeeks.of >= c.of ? input.circleWeeks.attended >= c.min : false;
          break;
        case 'peers_helped':
          have = input.peersHelped;
          need = c.min;
          qualifies = input.peersHelped >= c.min;
          break;
        case 'resources_accepted':
          have = input.resourcesAccepted;
          need = c.min;
          qualifies = input.resourcesAccepted >= c.min;
          break;
        case 'badges':
          have = c.badgeKeys.filter((k) => nowEarned.has(k)).length;
          need = c.badgeKeys.length;
          qualifies = have === need;
          level = c.badgeKeys.every((k) => nowEarned.get(k)?.evidenceLevel === 'verified') ? 'verified' : 'self';
          break;
      }
      const existing = nowEarned.get(badge.key) ?? null;
      let earned: EarnedBadge | null = existing;
      if (qualifies && !existing) {
        earned = { badgeKey: badge.key, earnedAt: input.nowIso, evidenceLevel: level };
        nowEarned.set(badge.key, earned);
      } else if (qualifies && existing && existing.evidenceLevel === 'self' && level === 'verified') {
        // A self-reported badge upgrades once every counted step is verified.
        earned = { ...existing, evidenceLevel: 'verified' };
        nowEarned.set(badge.key, earned);
      }
      result.push({ badge, earned, have, need });
    }
  };
  pass();
  pass();
  return result;
}

export function newlyEarned(before: readonly EarnedBadge[], after: readonly BadgeProgress[]): EarnedBadge[] {
  const had = new Set(before.map((b) => b.badgeKey));
  return after.filter((p) => p.earned && !had.has(p.badge.key)).map((p) => p.earned as EarnedBadge);
}

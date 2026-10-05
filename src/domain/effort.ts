/**
 * Effort points (spec §10). Points come from verified steps, questions asked, circles attended and
 * helping others — never from streaks alone, time in app, or logging in. There is no leaderboard.
 */
import type { EffortEvent, EffortKind } from './types';

// spec §10 effort_points table
export const POINTS: Record<EffortKind, number> = {
  step_verified: 40,
  step_self: 10,
  question_asked: 5,
  circle_attended: 25,
  helped_peer: 30,
  resource_accepted: 20,
};

export function pointsFor(kind: EffortKind): number {
  return POINTS[kind];
}

export function totalPoints(events: readonly EffortEvent[]): number {
  return events.reduce((sum, e) => sum + e.points, 0);
}

/** Level thresholds (cumulative points). Levels are a private progress marker, never compared between students. */
export const LEVELS = [0, 200, 500, 900, 1400, 2000, 2800, 3800] as const;

export function levelFor(points: number): { level: number; next: number | null; into: number } {
  let level = 1;
  for (let i = 1; i < LEVELS.length; i++) {
    if (points >= LEVELS[i]) level = i + 1;
  }
  const next = level < LEVELS.length ? LEVELS[level] : null;
  const base = LEVELS[level - 1];
  return { level, next, into: points - base };
}

/** Points grouped by source, in the order S-13 shows them. */
export function pointsBySource(events: readonly EffortEvent[]): { kind: EffortKind; points: number; count: number }[] {
  const order: EffortKind[] = ['step_verified', 'circle_attended', 'question_asked', 'helped_peer', 'resource_accepted', 'step_self'];
  return order.map((kind) => {
    const list = events.filter((e) => e.kind === kind);
    return { kind, points: list.reduce((s, e) => s + e.points, 0), count: list.length };
  });
}

/** Points per ISO week for the "this month" chart: the last `weeks` weeks ending at `now`. */
export function pointsByWeek(events: readonly EffortEvent[], now: number, weeks = 4): number[] {
  const out = new Array<number>(weeks).fill(0);
  const weekMs = 7 * 86_400_000;
  for (const e of events) {
    const t = Date.parse(e.at);
    if (!Number.isFinite(t) || t > now) continue;
    const idx = weeks - 1 - Math.floor((now - t) / weekMs);
    if (idx >= 0 && idx < weeks) out[idx] += e.points;
  }
  return out;
}

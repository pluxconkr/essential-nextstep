/**
 * Derived selectors and hooks. The roadmap is recomputed from (profile, content, progress, now)
 * with the pure engine — cheap for ~25 steps — so every screen agrees on the same list.
 */
import { useEffect, useMemo, useState } from 'react';

import demoCircles from '@/assets/data/demo/circles.json';
import demoMentors from '@/assets/data/demo/mentors.json';
import { evaluate as evaluateBadges } from '@/domain/badges';
import { comingUp, generate, nextStep, trackProgress, whyDiffers } from '@/domain/roadmap';
import { nowMs, realNowMs } from '@/domain/time';
import type { Circle, Match, MentorPublic, RoadmapStep, TrackKey } from '@/domain/types';

import { useAppState } from './appStore';

const TRACK_ORDER: TrackKey[] = ['college', 'career', 'language', 'study'];

/** Ticks once a minute so "days left" and "checked 4 min ago" stay right while the screen is open. */
export function useMinuteTick(): number {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 60_000);
    return () => clearInterval(id);
  }, []);
  return tick;
}

/** The program clock (demo-shifted). Re-read on store changes and once a minute (both re-render the caller). */
export function useNow(): number {
  useAppState((s) => s.clockTick);
  useMinuteTick();
  return Math.floor(nowMs() / 60_000) * 60_000;
}

/** Device time, for honesty lines like "checked 4 min ago". */
export function useRealNow(): number {
  useMinuteTick();
  return Math.floor(realNowMs() / 60_000) * 60_000;
}

export function useRoadmap(): RoadmapStep[] {
  const profile = useAppState((s) => s.profile);
  const content = useAppState((s) => s.content);
  const progress = useAppState((s) => s.progress);
  const now = useNow();
  return useMemo(() => (profile ? generate({ profile, content, prior: progress, nowMs: now }) : []), [profile, content, progress, now]);
}

export function useNextStep(): RoadmapStep | null {
  const roadmap = useRoadmap();
  const now = useNow();
  return useMemo(() => nextStep(roadmap, now), [roadmap, now]);
}

export function useComingUp(n = 4): RoadmapStep[] {
  const roadmap = useRoadmap();
  const now = useNow();
  return useMemo(() => comingUp(roadmap, now, n), [roadmap, now, n]);
}

export function useTrackProgress() {
  const roadmap = useRoadmap();
  return useMemo(() => trackProgress(roadmap, TRACK_ORDER), [roadmap]);
}

export function useWhyDiffers() {
  const roadmap = useRoadmap();
  const profile = useAppState((s) => s.profile);
  return useMemo(() => (profile ? whyDiffers(roadmap, profile) : []), [roadmap, profile]);
}

export function useStep(stepKey: string | undefined): RoadmapStep | null {
  const roadmap = useRoadmap();
  return useMemo(() => roadmap.find((r) => r.step.key === stepKey) ?? null, [roadmap, stepKey]);
}

export function useBadgeProgress() {
  const content = useAppState((s) => s.content);
  const effort = useAppState((s) => s.effort);
  const attendance = useAppState((s) => s.attendance);
  const earned = useAppState((s) => s.badges);
  const roadmap = useRoadmap();
  return useMemo(
    () =>
      evaluateBadges({
        badges: content.badges,
        roadmap,
        circleWeeks: attendance,
        peersHelped: effort.filter((e) => e.kind === 'helped_peer').length,
        resourcesAccepted: effort.filter((e) => e.kind === 'resource_accepted').length,
        earned,
        nowIso: new Date(nowMs()).toISOString(),
      }),
    [content.badges, roadmap, attendance, effort, earned],
  );
}

/**
 * Mentors and circles are server data. Until the API ships, the demo scenarios provide labelled
 * demo rows; outside a demo the lists are empty and the screens show their empty states.
 */
export function useDemoActive(): boolean {
  return useAppState((s) => s.settings.demoScenario !== 'none');
}

export function useMentors(): MentorPublic[] {
  const demo = useDemoActive();
  return useMemo(() => (demo ? (demoMentors as unknown as MentorPublic[]) : []), [demo]);
}

export function useMentor(id: string | undefined): MentorPublic | null {
  const list = useMentors();
  return useMemo(() => list.find((m) => m.id === id) ?? null, [list, id]);
}

export function useCircles(): Circle[] {
  const demo = useDemoActive();
  const rsvps = useAppState((s) => s.rsvps);
  return useMemo(() => (demo ? (demoCircles as unknown as Circle[]).map((c) => ({ ...c, mine: rsvps[c.id] ?? c.mine })) : []), [demo, rsvps]);
}

export function useMyMentor(): { match: Match | null; mentor: MentorPublic | null } {
  const matches = useAppState((s) => s.matches);
  const mentors = useMentors();
  return useMemo(() => {
    const match = matches.find((m) => m.state === 'active' || m.state === 'confirmed_pending_notice') ?? null;
    const mentor = match ? (mentors.find((m) => m.id === match.mentorId) ?? null) : null;
    return { match, mentor };
  }, [matches, mentors]);
}

/** How many demo mentors verified a given step — the "N mentors at your school did this" line. */
export function useMentorsWhoDid(stepKey: string | undefined): number {
  const mentors = useMentors();
  return useMemo(() => (stepKey ? mentors.filter((m) => m.verifiedStepKeys.includes(stepKey)).length : 0), [mentors, stepKey]);
}

/**
 * Zero-dependency app store built on useSyncExternalStore.
 *
 * Hydration is synchronous from local storage, so the first frame already shows real data.
 * Writes go to storage first, then notify subscribers. No network here.
 */
import { useSyncExternalStore } from 'react';

import {
  attendanceRepo,
  badgeRepo,
  cacheMetaRepo,
  contentRepo,
  effortRepo,
  familyLinkRepo,
  initStorage,
  matchRepo,
  messageRepo,
  mutationsRepo,
  onStorageNotice,
  profileRepo,
  progressRepo,
  resetAllData,
  rsvpRepo,
  settingsRepo,
  storageNoticeRepo,
  type Attendance,
  type FamilyLink,
  type Mutation,
  type MutationKind,
  type Settings,
  type StorageNotice,
} from '@/data/repos';
import { evaluate as evaluateBadges, newlyEarned } from '@/domain/badges';
import { pointsFor } from '@/domain/effort';
import { newId } from '@/domain/ids';
import { generate, toStudentSteps } from '@/domain/roadmap';
import { nowIso, nowMs } from '@/domain/time';
import type { CacheMetaMap, Content, EarnedBadge, EffortEvent, EffortKind, Match, Message, StudentProfile, StudentStep, VerificationPath } from '@/domain/types';

export interface NetworkInfo {
  /** true = online, false = offline, null = not determined yet. */
  online: boolean | null;
}

export interface AppState {
  hydrated: boolean;
  onboarded: boolean;
  profile: StudentProfile | null;
  progress: StudentStep[];
  content: Content;
  contentSource: 'bundle' | 'network';
  effort: EffortEvent[];
  badges: EarnedBadge[];
  attendance: Attendance;
  rsvps: Record<string, boolean>;
  matches: Match[];
  /** Messages per match id (last 200 each). */
  messages: Record<string, Message[]>;
  familyLink: FamilyLink | null;
  settings: Settings;
  mutations: Mutation[];
  cacheMeta: CacheMetaMap;
  network: NetworkInfo;
  storageNotice: StorageNotice | null;
  /** Bumped when the demo clock changes so derived values recompute. */
  clockTick: number;
}

type Listener = () => void;

let state: AppState = {
  hydrated: false,
  onboarded: false,
  profile: null,
  progress: [],
  content: contentRepo.get().content,
  contentSource: 'bundle',
  effort: [],
  badges: [],
  attendance: { attended: 0, of: 0 },
  rsvps: {},
  matches: [],
  messages: {},
  familyLink: null,
  settings: settingsRepo.get(),
  mutations: [],
  cacheMeta: {},
  network: { online: null },
  storageNotice: null,
  clockTick: 0,
};

const listeners = new Set<Listener>();

function emit() {
  for (const l of listeners) l();
}

export function setState(patch: Partial<AppState> | ((prev: AppState) => Partial<AppState>)) {
  const p = typeof patch === 'function' ? patch(state) : patch;
  state = { ...state, ...p };
  emit();
}

export function getState(): AppState {
  return state;
}

export function subscribe(l: Listener): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useAppState<T>(selector: (s: AppState) => T): T {
  return useSyncExternalStore(subscribe, () => selector(state), () => selector(state));
}

export function isOfflineNow(s: AppState): boolean {
  return s.settings.simulateOffline || s.network.online === false;
}

/** Synchronous hydration from disk. Called once at module scope in the root layout. */
export function hydrate(): void {
  initStorage();
  const { content, source } = contentRepo.get();
  const matches = matchRepo.get();
  const messages: Record<string, Message[]> = {};
  for (const m of matches) messages[m.id] = messageRepo.get(m.id);
  state = {
    ...state,
    hydrated: true,
    onboarded: profileRepo.isOnboarded(),
    profile: profileRepo.get(),
    progress: progressRepo.get(),
    content,
    contentSource: source,
    effort: effortRepo.get(),
    badges: badgeRepo.get(),
    attendance: attendanceRepo.get(),
    rsvps: rsvpRepo.get(),
    matches,
    messages,
    familyLink: familyLinkRepo.get(),
    settings: settingsRepo.get(),
    mutations: mutationsRepo.get(),
    cacheMeta: cacheMetaRepo.getAll(),
    storageNotice: storageNoticeRepo.get(),
  };
  onStorageNotice((n) => setState({ storageNotice: n }));
  emit();
}

function enqueue(kind: MutationKind, payload: Record<string, unknown>): Mutation {
  const m: Mutation = { id: newId('mut'), kind, payload, clientEventId: newId('evt'), createdAt: nowIso(), status: 'queued', failReason: null };
  const list = mutationsRepo.enqueue(m);
  setState({ mutations: list });
  return m;
}

/** Re-run the engine against the stored progress and persist the resulting rows. */
function regenerate(profile: StudentProfile, prior: StudentStep[]): StudentStep[] {
  const roadmap = generate({ profile, content: state.content, prior, nowMs: nowMs() });
  const rows = toStudentSteps(roadmap);
  progressRepo.replaceAll(rows);
  return rows;
}

function recomputeBadges(progress: StudentStep[], effort: EffortEvent[], attendance: Attendance, profile: StudentProfile): EarnedBadge[] {
  const roadmap = generate({ profile, content: state.content, prior: progress, nowMs: nowMs() });
  const result = evaluateBadges({
    badges: state.content.badges,
    roadmap,
    circleWeeks: attendance,
    peersHelped: effort.filter((e) => e.kind === 'helped_peer').length,
    resourcesAccepted: effort.filter((e) => e.kind === 'resource_accepted').length,
    earned: state.badges,
    nowIso: nowIso(),
  });
  const earned = result.filter((p) => p.earned).map((p) => p.earned as EarnedBadge);
  badgeRepo.replaceAll(earned);
  return earned;
}

export const actions = {
  /** Finish onboarding: save the profile, generate the first roadmap. */
  completeOnboarding(profile: StudentProfile): void {
    profileRepo.set(profile);
    profileRepo.setOnboarded(true);
    const progress = regenerate(profile, state.progress);
    setState({ profile, onboarded: true, progress });
    enqueue('profile', { profile });
  },

  /** Goals, languages or aid path changed: the roadmap is regenerated, nothing is deleted. */
  saveProfile(patch: Partial<StudentProfile>): void {
    if (!state.profile) return;
    const profile = { ...state.profile, ...patch };
    profileRepo.set(profile);
    const progress = regenerate(profile, state.progress);
    setState({ profile, progress });
    enqueue('profile', { patch });
  },

  recheckRoadmap(): void {
    if (!state.profile) return;
    setState({ progress: regenerate(state.profile, state.progress) });
  },

  openStep(stepKey: string): void {
    const row = state.progress.find((p) => p.stepKey === stepKey);
    if (!row || row.openedAt != null) return;
    const next: StudentStep = { ...row, openedAt: nowMs(), status: row.status === 'locked' ? row.status : 'open' };
    const progress = progressRepo.upsert(next);
    if (state.profile) setState({ progress: regenerate(state.profile, progress) });
    enqueue('step_open', { stepKey });
  },

  /** Mark a step done through one of the four verification paths (spec 5.2). */
  finishStep(stepKey: string, path: VerificationPath, evidenceUri?: string): { newBadges: EarnedBadge[]; points: number } {
    if (!state.profile) return { newBadges: [], points: 0 };
    const row = state.progress.find((p) => p.stepKey === stepKey);
    if (!row) return { newBadges: [], points: 0 };
    const now = nowMs();
    const status: StudentStep['status'] = path === 'self' ? 'done' : 'pending_verification';
    // Local-first: upload and mentor paths are recorded as done-pending; the server flips them on confirmation.
    // Until the server exists, the demo treats upload/staff/mentor as verified so the flow can be shown end to end.
    const effectiveStatus: StudentStep['status'] = status === 'pending_verification' && state.settings.demoScenario !== 'none' ? 'done' : status;
    const next: StudentStep = { ...row, status: effectiveStatus, openedAt: row.openedAt ?? now, doneAt: now, verification: path };
    let progress = progressRepo.upsert(next);
    progress = regenerate(state.profile, progress);
    const kind: EffortKind = path === 'self' ? 'step_self' : 'step_verified';
    const points = effectiveStatus === 'done' ? pointsFor(kind) : 0;
    let effort = state.effort;
    if (points > 0) effort = effortRepo.add({ id: newId('eff'), kind, points, ref: stepKey, at: nowIso() });
    const before = state.badges;
    const badges = recomputeBadges(progress, effort, state.attendance, state.profile);
    const earnedNow = newlyEarned(before, badges.map((b) => ({ badge: state.content.badges.find((d) => d.key === b.badgeKey)!, earned: b, have: 0, need: 0 })));
    setState({ progress, effort, badges });
    enqueue('step_done', { stepKey, path, hasEvidence: Boolean(evidenceUri) });
    return { newBadges: earnedNow, points };
  },

  reportCorrection(stepKey: string, body: string): void {
    enqueue('correction', { stepKey, body });
  },

  rsvp(circleId: string, going: boolean): void {
    setState({ rsvps: rsvpRepo.set(circleId, going) });
    enqueue('rsvp', { circleId, going });
  },

  addEffort(kind: EffortKind, ref: string | null = null): void {
    const effort = effortRepo.add({ id: newId('eff'), kind, points: pointsFor(kind), ref, at: nowIso() });
    const badges = state.profile ? recomputeBadges(state.progress, effort, state.attendance, state.profile) : state.badges;
    setState({ effort, badges });
  },

  setAttendance(a: Attendance): void {
    attendanceRepo.set(a);
    const badges = state.profile ? recomputeBadges(state.progress, state.effort, a, state.profile) : state.badges;
    setState({ attendance: a, badges });
  },

  appendMessage(matchId: string, m: Message): void {
    const list = messageRepo.append(matchId, m);
    setState({ messages: { ...state.messages, [matchId]: list } });
  },

  setMatches(list: Match[]): void {
    matchRepo.replaceAll(list);
    setState({ matches: list });
  },

  patchSettings(p: Partial<Settings>): void {
    setState({ settings: settingsRepo.patch(p) });
  },

  setNetwork(n: NetworkInfo): void {
    setState({ network: n });
  },

  setContent(c: Content, source: 'bundle' | 'network'): void {
    state = { ...state, content: c, contentSource: source };
    const cacheMeta = source === 'network' && contentRepo.saveDownloaded(c) ? cacheMetaRepo.set({ key: 'content', fetchedAt: Date.now(), bytes: JSON.stringify(c).length, version: c.version }) : state.cacheMeta;
    const progress = state.profile ? regenerate(state.profile, state.progress) : state.progress;
    setState({ progress, cacheMeta });
  },

  setFamilyLink(l: FamilyLink | null): void {
    familyLinkRepo.set(l);
    setState({ familyLink: l });
  },

  clearStorageNotice(): void {
    storageNoticeRepo.clear();
    setState({ storageNotice: null });
  },

  bumpClock(): void {
    setState({ clockTick: state.clockTick + 1 });
  },

  /** Replace every local record (demo scenarios). Progress is regenerated so statuses are consistent. */
  loadSnapshot(s: { profile: StudentProfile; progress: StudentStep[]; effort: EffortEvent[]; attendance: Attendance; rsvps: Record<string, boolean>; matches: Match[]; messages: Record<string, Message[]>; familyLink: FamilyLink | null }): void {
    profileRepo.set(s.profile);
    profileRepo.setOnboarded(true);
    effortRepo.replaceAll(s.effort);
    attendanceRepo.set(s.attendance);
    for (const [id, going] of Object.entries(s.rsvps)) rsvpRepo.set(id, going);
    matchRepo.replaceAll(s.matches);
    for (const [id, list] of Object.entries(s.messages)) messageRepo.replaceAll(id, list);
    familyLinkRepo.set(s.familyLink);
    const progress = regenerate(s.profile, s.progress);
    setState({ profile: s.profile, onboarded: true, progress, effort: s.effort, attendance: s.attendance, rsvps: s.rsvps, matches: s.matches, messages: s.messages, familyLink: s.familyLink });
    const badges = recomputeBadges(progress, s.effort, s.attendance, s.profile);
    setState({ badges });
  },

  resetAll(): void {
    resetAllData();
    const { content, source } = contentRepo.get();
    setState({
      onboarded: false,
      profile: null,
      progress: [],
      content,
      contentSource: source,
      effort: [],
      badges: [],
      attendance: { attended: 0, of: 0 },
      rsvps: {},
      matches: [],
      messages: {},
      familyLink: null,
      settings: settingsRepo.get(),
      mutations: [],
      cacheMeta: {},
      storageNotice: null,
    });
  },
};

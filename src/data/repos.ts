/**
 * Local-first repositories. Every read is synchronous and starts from local storage (or the
 * bundled fallback). Nothing here touches the network.
 */
import bundledContent from '@/assets/data/content.json';
import { ContentSchema } from '@/domain/content';
import type { CacheMeta, CacheMetaMap, Content, EarnedBadge, EffortEvent, Match, Message, StudentProfile, StudentStep } from '@/domain/types';

import { kv } from './kv';

export const KEYS = {
  schema: 'meta:schemaVersion',
  onboarded: 'onboarded:v1',
  profile: 'profile:v1',
  progress: 'progress:v1',
  effort: 'effort:v1',
  badges: 'badges:v1',
  settings: 'settings:v1',
  content: 'content:v1',
  cacheMeta: 'cacheMeta:v1',
  mutations: 'mutations:v1',
  rsvps: 'rsvps:v1',
  attendance: 'attendance:v1',
  matches: 'matches:v1',
  familyLink: 'familyLink:v1',
  storageNotice: 'storageNotice:v1',
  reminders: 'reminders:v1',
  corrections: 'corrections:v1',
} as const;

export const SCHEMA_VERSION = 1;

export type DemoScenario = 'none' | 'spring' | 'deadline-week' | 'verified';

export interface Settings {
  demoScenario: DemoScenario;
  simulateOffline: boolean;
  notificationsEnabled: boolean;
}

export const DEFAULT_SETTINGS: Settings = { demoScenario: 'none', simulateOffline: false, notificationsEnabled: true };

export type MutationKind = 'step_open' | 'step_done' | 'step_stalled' | 'rsvp' | 'checkin' | 'message' | 'correction' | 'guardian' | 'profile';

export interface Mutation {
  id: string;
  kind: MutationKind;
  payload: Record<string, unknown>;
  clientEventId: string;
  createdAt: string;
  status: 'queued' | 'failed';
  failReason: string | null;
}

export interface FamilyLink {
  token: string;
  locale: 'en' | 'es';
  createdAt: string;
  lastOpenedAt: string | null;
}

export interface Attendance {
  attended: number;
  of: number;
}

export interface StorageNotice {
  at: string;
  dropped: string[];
  recovered: boolean;
}

/** Call once at startup, synchronously, before any other storage access. */
export function initStorage(): void {
  const v = kv.get<number>(KEYS.schema);
  if (v !== SCHEMA_VERSION) kv.set(KEYS.schema, SCHEMA_VERSION);
}

// ---------- Storage guard: give up re-downloadable data first, say what was dropped ----------

type NoticeListener = (n: StorageNotice) => void;
let noticeListener: NoticeListener | null = null;
export function onStorageNotice(l: NoticeListener | null): void {
  noticeListener = l;
}

export function dropLowPriority(): string[] {
  const dropped: string[] = [];
  if (kv.get(KEYS.content) != null) {
    kv.remove(KEYS.content);
    dropped.push('downloaded-content');
  }
  for (const k of kv.keys()) {
    if (k.startsWith('messages:')) {
      kv.remove(k);
      if (!dropped.includes('message-cache')) dropped.push('message-cache');
    }
  }
  return dropped;
}

function reportStorageNotice(dropped: string[], recovered: boolean): void {
  if (dropped.length === 0 && recovered) return;
  const notice: StorageNotice = { at: new Date().toISOString(), dropped, recovered };
  kv.set(KEYS.storageNotice, notice);
  noticeListener?.(notice);
}

function guardedSet<T>(key: string, value: T): T {
  if (kv.set(key, value)) return value;
  const dropped = dropLowPriority();
  const ok = kv.set(key, value);
  reportStorageNotice(dropped, ok);
  return value;
}

function guardedUpdate<T>(key: string, fn: (prev: T | null) => T): T {
  const next = kv.update<T>(key, fn);
  if (kv.lastWriteOk) return next;
  const dropped = dropLowPriority();
  const retried = kv.update<T>(key, fn);
  reportStorageNotice(dropped, kv.lastWriteOk);
  return retried;
}

export const storageNoticeRepo = {
  get: () => kv.get<StorageNotice>(KEYS.storageNotice),
  clear: () => kv.remove(KEYS.storageNotice),
};

// ---------- Profile / onboarding ----------

const GOALS = ['college', 'certificate', 'biliteracy', 'unsure'] as const;
const AID = ['fafsa', 'cadaa', 'unsure'] as const;

export function sanitizeProfile(p: Partial<StudentProfile> | null | undefined): StudentProfile | null {
  if (!p || typeof p.displayName !== 'string') return null;
  const grade = [9, 10, 11, 12].includes(Number(p.grade)) ? (Number(p.grade) as StudentProfile['grade']) : 11;
  return {
    orgId: typeof p.orgId === 'string' ? p.orgId : 'valley-high',
    schoolId: typeof p.schoolId === 'string' ? p.schoolId : 'valley-high',
    schoolName: typeof p.schoolName === 'string' ? p.schoolName : 'Valley High',
    displayName: p.displayName,
    initials: typeof p.initials === 'string' && p.initials ? p.initials.slice(0, 2).toUpperCase() : initialsOf(p.displayName),
    grade,
    languagesRead: Array.isArray(p.languagesRead) ? p.languagesRead.filter((x): x is string => typeof x === 'string') : ['en'],
    languagesHome: Array.isArray(p.languagesHome) ? p.languagesHome.filter((x): x is string => typeof x === 'string') : ['en'],
    elStatus: p.elStatus === 'yes' || p.elStatus === 'no' || p.elStatus === 'unsure' ? p.elStatus : null,
    ageBand: p.ageBand === 'adult' ? 'adult' : 'under_18',
    goals: Array.isArray(p.goals) ? p.goals.filter((g): g is StudentProfile['goals'][number] => (GOALS as readonly string[]).includes(g as string)).slice(0, 3) : [],
    aidPath: p.aidPath && (AID as readonly string[]).includes(p.aidPath) ? p.aidPath : null,
    verification: p.verification === 'sso' || p.verification === 'school_email' || p.verification === 'cbo_vouch' ? p.verification : 'none',
    needsInterpreter: p.needsInterpreter === true,
    smsOk: p.smsOk !== false,
    lowDataMode: p.lowDataMode === true,
  };
}

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const a = parts[0]?.[0] ?? '?';
  const b = parts.length > 1 ? parts[parts.length - 1][0] : (parts[0]?.[1] ?? '');
  return (a + b).toUpperCase();
}

export const profileRepo = {
  get(): StudentProfile | null {
    return sanitizeProfile(kv.get<StudentProfile>(KEYS.profile));
  },
  set(p: StudentProfile | null): void {
    if (p) guardedSet(KEYS.profile, sanitizeProfile(p));
    else kv.remove(KEYS.profile);
  },
  isOnboarded(): boolean {
    return kv.get<boolean>(KEYS.onboarded) === true;
  },
  setOnboarded(v: boolean): void {
    guardedSet(KEYS.onboarded, v);
  },
};

// ---------- Progress (student_step rows) ----------

const STATUSES = ['locked', 'open', 'stalled', 'pending_verification', 'done'] as const;

export function sanitizeProgress(list: unknown): StudentStep[] {
  if (!Array.isArray(list)) return [];
  return (list as StudentStep[]).filter((s) => s && typeof s.stepKey === 'string' && (STATUSES as readonly string[]).includes(s.status));
}

export const progressRepo = {
  get(): StudentStep[] {
    return sanitizeProgress(kv.get(KEYS.progress));
  },
  replaceAll(list: StudentStep[]): StudentStep[] {
    return guardedSet(KEYS.progress, list);
  },
  upsert(row: StudentStep): StudentStep[] {
    return guardedUpdate<StudentStep[]>(KEYS.progress, (prev) => [...sanitizeProgress(prev).filter((p) => p.stepKey !== row.stepKey), row]);
  },
};

// ---------- Effort & badges ----------

export const effortRepo = {
  get(): EffortEvent[] {
    const v = kv.get<EffortEvent[]>(KEYS.effort);
    return Array.isArray(v) ? v : [];
  },
  add(e: EffortEvent): EffortEvent[] {
    return guardedUpdate<EffortEvent[]>(KEYS.effort, (prev) => [...(prev ?? []).filter((x) => x.id !== e.id), e]);
  },
  replaceAll(list: EffortEvent[]): EffortEvent[] {
    return guardedSet(KEYS.effort, list);
  },
};

export const badgeRepo = {
  get(): EarnedBadge[] {
    const v = kv.get<EarnedBadge[]>(KEYS.badges);
    return Array.isArray(v) ? v : [];
  },
  replaceAll(list: EarnedBadge[]): EarnedBadge[] {
    return guardedSet(KEYS.badges, list);
  },
};

// ---------- Settings ----------

export const settingsRepo = {
  get(): Settings {
    const s = { ...DEFAULT_SETTINGS, ...(kv.get<Partial<Settings>>(KEYS.settings) ?? {}) };
    if (!['none', 'spring', 'deadline-week', 'verified'].includes(s.demoScenario)) s.demoScenario = 'none';
    return s;
  },
  patch(p: Partial<Settings>): Settings {
    return guardedUpdate<Settings>(KEYS.settings, (prev) => ({ ...DEFAULT_SETTINGS, ...(prev ?? {}), ...p }));
  },
};

// ---------- Content (downloaded copy → bundled fallback) ----------

export interface ContentSource {
  content: Content;
  source: 'bundle' | 'network';
}

export const contentRepo = {
  get(): ContentSource {
    const downloaded = kv.get<unknown>(KEYS.content);
    if (downloaded) {
      const parsed = ContentSchema.safeParse(downloaded);
      if (parsed.success) return { content: parsed.data as Content, source: 'network' };
      kv.remove(KEYS.content);
    }
    return { content: bundledContent as unknown as Content, source: 'bundle' };
  },
  bundledVersion(): string {
    return (bundledContent as { version: string }).version;
  },
  saveDownloaded(c: Content): boolean {
    if (kv.set(KEYS.content, c)) return true;
    reportStorageNotice(['downloaded-content'], true);
    return false;
  },
};

// ---------- Queued writes ----------

export const mutationsRepo = {
  get(): Mutation[] {
    const v = kv.get<Mutation[]>(KEYS.mutations);
    return Array.isArray(v) ? v : [];
  },
  enqueue(m: Mutation): Mutation[] {
    return guardedUpdate<Mutation[]>(KEYS.mutations, (prev) => [...(prev ?? []), m]);
  },
  remove(id: string): Mutation[] {
    return guardedUpdate<Mutation[]>(KEYS.mutations, (prev) => (prev ?? []).filter((m) => m.id !== id));
  },
  markFailed(id: string, reason: string): Mutation[] {
    return guardedUpdate<Mutation[]>(KEYS.mutations, (prev) => (prev ?? []).map((m) => (m.id === id ? { ...m, status: 'failed', failReason: reason } : m)));
  },
  replaceAll(list: Mutation[]): Mutation[] {
    return guardedSet(KEYS.mutations, list);
  },
};

// ---------- Circles, attendance, matches, messages, family link ----------

export const rsvpRepo = {
  get(): Record<string, boolean> {
    return kv.get<Record<string, boolean>>(KEYS.rsvps) ?? {};
  },
  set(circleId: string, going: boolean): Record<string, boolean> {
    return guardedUpdate<Record<string, boolean>>(KEYS.rsvps, (prev) => ({ ...(prev ?? {}), [circleId]: going }));
  },
};

export const attendanceRepo = {
  get(): Attendance {
    return kv.get<Attendance>(KEYS.attendance) ?? { attended: 0, of: 0 };
  },
  set(a: Attendance): Attendance {
    return guardedSet(KEYS.attendance, a);
  },
};

export const matchRepo = {
  get(): Match[] {
    const v = kv.get<Match[]>(KEYS.matches);
    return Array.isArray(v) ? v : [];
  },
  replaceAll(list: Match[]): Match[] {
    return guardedSet(KEYS.matches, list);
  },
};

const MESSAGE_KEEP = 200;

export const messageRepo = {
  get(matchId: string): Message[] {
    const v = kv.get<Message[]>(`messages:${matchId}:v1`);
    return Array.isArray(v) ? v : [];
  },
  append(matchId: string, m: Message): Message[] {
    return guardedUpdate<Message[]>(`messages:${matchId}:v1`, (prev) => [...(prev ?? []).filter((x) => x.id !== m.id), m].slice(-MESSAGE_KEEP));
  },
  replaceAll(matchId: string, list: Message[]): Message[] {
    return guardedSet(`messages:${matchId}:v1`, list.slice(-MESSAGE_KEEP));
  },
};

export const familyLinkRepo = {
  get(): FamilyLink | null {
    return kv.get<FamilyLink>(KEYS.familyLink);
  },
  set(l: FamilyLink | null): void {
    if (l) guardedSet(KEYS.familyLink, l);
    else kv.remove(KEYS.familyLink);
  },
};

// ---------- Cache metadata ----------

export const cacheMetaRepo = {
  getAll(): CacheMetaMap {
    return kv.get<CacheMetaMap>(KEYS.cacheMeta) ?? {};
  },
  set(meta: CacheMeta): CacheMetaMap {
    return guardedUpdate<CacheMetaMap>(KEYS.cacheMeta, (prev) => ({ ...(prev ?? {}), [meta.key]: meta }));
  },
};

/** Wipe everything (Offline data screen → "Reset app data"). */
export function resetAllData(): void {
  kv.clear();
  initStorage();
}

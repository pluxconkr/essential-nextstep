/**
 * Domain types for NextStep.
 *
 * Plain, JSON-serialisable data. No React, React Native or Expo imports: this module is shared by
 * the phone, the console, the API routes, the content build script and the tests.
 */

export type Locale = 'en' | 'es';
export type TrackKey = 'college' | 'career' | 'language' | 'study';
export type Goal = 'college' | 'certificate' | 'biliteracy' | 'unsure';
/** A FORM choice, never a status question (spec 5.1). */
export type AidPath = 'fafsa' | 'cadaa' | 'unsure';
export type ElStatus = 'yes' | 'no' | 'unsure';
export type AgeBand = 'under_18' | 'adult';
export type Grade = 9 | 10 | 11 | 12;
export type Verification = 'sso' | 'school_email' | 'cbo_vouch' | 'none';
export type Verifier = 'mentor' | 'upload' | 'staff' | 'self' | 'any';
export type VerificationPath = 'mentor' | 'upload' | 'staff' | 'self';
export type OwnerRole = 'coordinator' | 'counselor' | 'cbo' | 'mentor_lead';
export type Season = 'fall' | 'spring';
export type GradeAnchor = `grade_${Grade}_${Season}`;

/** Deadline rules (spec §8). Dates are resolved in America/Los_Angeles by `deadlines.ts`. */
export type DeadlineRule =
  | { kind: 'fixed'; monthDay: string } // 'MM-DD', next occurrence in the step's school year
  | { kind: 'relative'; anchor: GradeAnchor; offsetDays: number }
  | { kind: 'district'; key: string } // district calendar window, end date
  | { kind: 'rolling'; windowDays: number }; // from opened_at

export interface Track {
  key: TrackKey;
  name: string;
  nameEs: string;
  order: number;
}

export interface VariantCondition {
  aidPath?: AidPath;
  elStatus?: ElStatus[];
  grade?: Grade[];
  orgId?: string;
}

export type StepOverride = Partial<Pick<Step, 'title' | 'titleEs' | 'why' | 'whyEs' | 'how' | 'howEs' | 'docs' | 'docsEs' | 'deadline' | 'sourceUrl' | 'estMinutes'>>;

export interface StepVariant {
  condition: VariantCondition;
  override: StepOverride;
}

/** One concrete action with a real deadline and a definition of done. */
export interface Step {
  key: string;
  track: TrackKey;
  /** Core steps apply to any post-high-school path (A-G audit, aid, Cal Grant GPA, dual enrollment). */
  core: boolean;
  title: string;
  titleEs: string;
  why: string;
  whyEs: string;
  how: string[];
  howEs: string[];
  docs: string[];
  docsEs: string[];
  deadline: DeadlineRule;
  estMinutes: number;
  prerequisites: string[];
  /** Grades the step belongs to. A step for a later grade is 'locked' until then. */
  grades: Grade[];
  verifier: Verifier;
  ownerRole: OwnerRole;
  sourceUrl: string;
  /** ISO date (YYYY-MM-DD). Steps older than STALE_AFTER_DAYS are hidden. */
  lastVerified: string;
  verifyBy: string;
  reviewStatus: 'reviewed' | 'pending';
  /** When set, the step exists only for students matching this condition (e.g. English learners). */
  onlyIf?: VariantCondition;
  variants: StepVariant[];
}

export interface Resource {
  key: string;
  stepKey: string;
  title: string;
  titleEs: string;
  kind: 'official' | 'walkthrough' | 'template' | 'explainer' | 'script' | 'worksheet' | 'story' | 'reference';
  url: string;
  languages: Locale[];
  verifiedByRole: OwnerRole | 'mentor';
  verifiedByName: string;
  verifiedAt: string;
}

export interface GlossaryEntry {
  term: string;
  definition: string;
  definitionEs: string;
  reviewedBy: string;
  reviewedAt: string;
}

export type BadgeCriteria =
  | { kind: 'steps_verified'; stepKeys: string[]; min: number }
  | { kind: 'circle_weeks'; min: number; of: number }
  | { kind: 'peers_helped'; min: number }
  | { kind: 'resources_accepted'; min: number }
  | { kind: 'badges'; badgeKeys: string[] };

export interface BadgeDef {
  key: string;
  name: string;
  nameEs: string;
  icon: string;
  description: string;
  descriptionEs: string;
  criteria: BadgeCriteria;
  unlocks: string[];
}

export interface CrisisResource {
  key: string;
  name: string;
  nameEs: string;
  action: string;
  actionEs: string;
  reviewedBy: string;
  reviewedAt: string;
}

export interface CalendarWindow {
  from: string; // ISO date
  to: string; // ISO date
  label: string;
}

/** District calendar: windows keyed by school year ("2026-27") and window key. */
export interface DistrictCalendar {
  [schoolYear: string]: Record<string, CalendarWindow>;
}

export interface Content {
  version: string;
  builtAt: string;
  tracks: Track[];
  steps: Step[];
  resources: Resource[];
  glossary: GlossaryEntry[];
  badges: BadgeDef[];
  crisis: CrisisResource[];
  calendar: DistrictCalendar;
}

// ---------- Student ----------

export interface StudentProfile {
  orgId: string;
  schoolId: string;
  schoolName: string;
  displayName: string;
  initials: string;
  grade: Grade;
  languagesRead: string[];
  languagesHome: string[];
  elStatus: ElStatus | null;
  ageBand: AgeBand;
  goals: Goal[];
  aidPath: AidPath | null;
  verification: Verification;
  needsInterpreter: boolean;
  smsOk: boolean;
  lowDataMode: boolean;
}

export type StepStatus = 'locked' | 'open' | 'stalled' | 'pending_verification' | 'done';

export interface StudentStep {
  stepKey: string;
  status: StepStatus;
  /** Epoch ms, end of the due day in America/Los_Angeles; null for rolling steps not yet opened. */
  dueAt: number | null;
  openedAt: number | null;
  doneAt: number | null;
  verification: VerificationPath | null;
}

/** A step resolved for one student: variant applied, deadline computed, status attached. */
export interface RoadmapStep {
  step: Step;
  state: StudentStep;
  /** Keys of prerequisite steps that are not done yet. */
  blockedBy: string[];
  /** Why this step differs from the template (variant condition that applied), for "Why yours differs". */
  variantReason: VariantCondition | null;
  daysLeft: number | null;
}

export type EffortKind = 'step_verified' | 'step_self' | 'question_asked' | 'circle_attended' | 'helped_peer' | 'resource_accepted';

export interface EffortEvent {
  id: string;
  kind: EffortKind;
  points: number;
  ref: string | null;
  at: string; // ISO
}

export interface EarnedBadge {
  badgeKey: string;
  earnedAt: string;
  evidenceLevel: 'verified' | 'self';
}

// ---------- Mentors ----------

export type MentorKind = 'near_peer' | 'alum' | 'adult_volunteer';

export interface MentorPublic {
  id: string;
  initials: string;
  displayName: string;
  nowStatus: string;
  schoolOfOriginId: string | null;
  schoolOfOriginName: string | null;
  classOf: string | null;
  languages: string[];
  pathTags: string[];
  pathLine: string;
  kind: MentorKind;
  bio: string;
  verifiedStepKeys: string[];
  cannotHelpWith: string[];
  capacity: number;
  load: number;
  medianReplyMinutes: number | null;
  circleIds: string[];
}

export type MatchState = 'requested' | 'waitlisted' | 'suggested' | 'confirmed_pending_notice' | 'active' | 'ended';

export interface Match {
  id: string;
  mentorId: string;
  state: MatchState;
  startedAt: string | null;
  frozenAt: string | null;
  unread: number;
}

export type MessageSender = 'student' | 'mentor' | 'system';

export interface Message {
  id: string;
  matchId: string;
  sender: MessageSender;
  body: string;
  bodyOriginal: string | null;
  blocked: boolean;
  blockedPatterns: string[];
  scopeStepKey: string | null;
  sentAt: string;
  /** Local-only: queued and not yet accepted by the server. */
  pending?: boolean;
}

// ---------- Circles ----------

export interface Circle {
  id: string;
  venueName: string;
  addressText: string;
  weekday: 0 | 1 | 2 | 3 | 4 | 5 | 6; // Sunday-first, like JS getDay
  startTime: string; // 'HH:MM'
  endTime: string;
  languages: string[];
  leadMentorName: string;
  capacity: number;
  joined: number;
  weeksRunning: number;
  transitNote: string;
  foodNote: string;
  siblingsOk: boolean;
  onCampus: boolean;
  what: string;
  whatEs: string;
  /** Schematic position on a 0–100 grid for the venue map (not GPS). */
  mapX: number;
  mapY: number;
  mine: boolean;
}

// ---------- Cache metadata ----------

export type AssetKey = 'content' | 'roadmap' | 'mentors' | 'matches' | 'circles' | 'badges' | 'effort';

export interface CacheMeta {
  key: AssetKey;
  fetchedAt: number;
  bytes: number;
  version: string | null;
}

export type CacheMetaMap = Partial<Record<AssetKey, CacheMeta>>;

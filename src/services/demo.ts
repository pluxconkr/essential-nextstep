/**
 * Demo scenarios (spec §20.2 demo frame). A scenario shifts the app clock to a fixed California
 * instant and loads labelled demo data for the prototype's student, Ana M. Nothing here is uploaded.
 *
 *   spring         Fri 7 Feb 2027 4:12 pm · Cal Grant in 23 days
 *   deadline-week  Wed 24 Feb 2027 · 6 days left, aid night attended
 *   verified       spring, two minutes after the Dream Act application was marked done
 */
import demoMessages from '@/assets/data/demo/messages.json';
import { contentRepo, settingsRepo, type DemoScenario, type FamilyLink } from '@/data/repos';
import { shiftVerificationDates } from '@/domain/content';
import { pointsFor } from '@/domain/effort';
import { newToken } from '@/domain/ids';
import { epochForLocal, setClockOffset } from '@/domain/time';
import type { EffortEvent, EffortKind, Match, Message, StudentProfile, StudentStep } from '@/domain/types';
import { actions, getState } from '@/store/appStore';

export const DEMO_FRAMES: Record<Exclude<DemoScenario, 'none'>, number> = {
  spring: epochForLocal(2027, 2, 7, 16, 12),
  'deadline-week': epochForLocal(2027, 2, 24, 16, 12),
  verified: epochForLocal(2027, 2, 7, 16, 14),
};

export const DEMO_STUDENT: StudentProfile = {
  orgId: 'valley-high',
  schoolId: 'valley-high',
  schoolName: 'Valley High',
  displayName: 'Ana M.',
  initials: 'AM',
  grade: 12,
  languagesRead: ['es', 'en'],
  languagesHome: ['es'],
  elStatus: 'no',
  ageBand: 'under_18',
  goals: ['college', 'biliteracy'],
  aidPath: 'cadaa',
  verification: 'school_email',
  needsInterpreter: true,
  smsOk: true,
  lowDataMode: false,
};

const DAY = 86_400_000;

function row(stepKey: string, frame: number, over: Partial<StudentStep>): StudentStep {
  return { stepKey, status: 'open', dueAt: null, openedAt: frame - 20 * DAY, doneAt: null, verification: null, ...over };
}

function progressFor(scenario: Exclude<DemoScenario, 'none'>, frame: number): StudentStep[] {
  const done = (key: string, daysAgo: number, verification: StudentStep['verification']) => row(key, frame, { status: 'done', doneAt: frame - daysAgo * DAY, openedAt: frame - (daysAgo + 10) * DAY, verification });
  const rows: StudentStep[] = [
    done('dual-enrollment', 31, 'mentor'),
    done('uc-piq', 100, 'mentor'),
    done('uc-apply', 70, 'upload'),
    done('csu-apply', 72, 'upload'),
    done('interpreter-request', 6, 'self'),
    done('family-aid-night', 3, 'staff'),
    done('translated-transcript', 20, 'self'),
    row('aid-application', frame, { openedAt: frame - 8 * DAY }),
    row('seal-biliteracy', frame, { openedAt: null }),
    row('parent-conference-questions', frame, { openedAt: null }),
    row('aid-letters', frame, { openedAt: null }),
    row('ccc-apply', frame, { openedAt: null }),
  ];
  if (scenario === 'deadline-week') {
    rows.push(row('aid-letters', frame, { openedAt: frame - 2 * DAY }));
  }
  if (scenario === 'verified') {
    rows.push(done('aid-application', 0, 'upload'));
  }
  // Later rows win for the same key.
  const byKey = new Map<string, StudentStep>();
  for (const r of rows) byKey.set(r.stepKey, r);
  return [...byKey.values()];
}

function effortFor(progress: StudentStep[], frame: number): EffortEvent[] {
  const events: EffortEvent[] = [];
  let i = 0;
  const push = (kind: EffortKind, daysAgo: number, ref: string | null = null) => {
    events.push({ id: `demo-eff-${i++}`, kind, points: pointsFor(kind), ref, at: new Date(frame - daysAgo * DAY).toISOString() });
  };
  for (const p of progress) {
    if (p.status !== 'done' || p.doneAt == null) continue;
    push(p.verification === 'self' ? 'step_self' : 'step_verified', Math.round((frame - p.doneAt) / DAY), p.stepKey);
  }
  for (let w = 0; w < 9; w++) push('circle_attended', 3 + w * 7, 'circle-newhope');
  for (let q = 0; q < 24; q++) push('question_asked', 1 + q * 5);
  push('helped_peer', 20, 'ag-audit');
  push('helped_peer', 41, 'ag-audit');
  push('resource_accepted', 16);
  return events;
}

function messagesFor(frame: number): Record<string, Message[]> {
  const out: Record<string, Message[]> = {};
  for (const [matchId, list] of Object.entries(demoMessages as Record<string, { id: string; sender: Message['sender']; body: string; scopeStepKey: string | null; minutesBeforeFrame: number }[]>)) {
    out[matchId] = list.map((m) => ({
      id: m.id,
      matchId,
      sender: m.sender,
      body: m.body,
      bodyOriginal: null,
      blocked: false,
      blockedPatterns: [],
      scopeStepKey: m.scopeStepKey,
      sentAt: new Date(frame - m.minutesBeforeFrame * 60_000).toISOString(),
    }));
  }
  return out;
}

/** Content verified today must read as recent inside the demo's fictional clock, or the staleness rule hides it. */
function applyDemoClock(frame: number): void {
  setClockOffset(frame - Date.now());
  const { content } = contentRepo.get();
  const days = Math.floor((frame - Date.parse(content.builtAt)) / DAY);
  actions.setContent(shiftVerificationDates(content, days), 'bundle');
}

/** Load a scenario: shift the clock, replace local records, remember the choice. */
export function applyDemoScenario(scenario: DemoScenario): void {
  if (scenario === 'none') {
    clearDemo();
    return;
  }
  const frame = DEMO_FRAMES[scenario];
  applyDemoClock(frame);
  const progress = progressFor(scenario, frame);
  const matches: Match[] = [{ id: 'match-daniela', mentorId: 'daniela', state: 'active', startedAt: new Date(frame - 145 * DAY).toISOString(), frozenAt: null, unread: 0 }];
  const familyLink: FamilyLink = { token: newToken(), locale: 'es', createdAt: new Date(frame - 140 * DAY).toISOString(), lastOpenedAt: new Date(frame - 2 * DAY).toISOString() };
  actions.loadSnapshot({
    profile: DEMO_STUDENT,
    progress,
    effort: effortFor(progress, frame),
    attendance: { attended: 9, of: 11 },
    rsvps: { 'circle-newhope': true },
    matches,
    messages: messagesFor(frame),
    familyLink,
  });
  actions.patchSettings({ demoScenario: scenario });
  actions.bumpClock();
}

/** On boot: the data is already on disk; only the clock offset must be re-applied. */
export function restoreDemoScenario(): void {
  const s = settingsRepo.get().demoScenario;
  if (s === 'none') {
    setClockOffset(0);
    return;
  }
  applyDemoClock(DEMO_FRAMES[s]);
}

/** Back to real data: wipe the demo records and return to onboarding. */
export function clearDemo(): void {
  if (getState().settings.demoScenario === 'none' && !getState().onboarded) return;
  setClockOffset(0);
  actions.resetAll();
  actions.patchSettings({ demoScenario: 'none' });
  actions.bumpClock();
}

/** Short label for the demo note under large titles. */
export function demoFrameLabel(scenario: DemoScenario): string | null {
  if (scenario === 'none') return null;
  const f = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Los_Angeles', weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
  return f.format(new Date(DEMO_FRAMES[scenario]));
}

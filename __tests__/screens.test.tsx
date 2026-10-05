/**
 * Screen smoke tests: every student screen renders from local state with ZERO network, in the demo
 * scenario and offline. One router render per test; expo-router's testing library provides the hooks.
 */
import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import NextScreen from '@/app/(tabs)/index';
import RoadmapScreen from '@/app/(tabs)/roadmap';
import MentorTab from '@/app/(tabs)/mentor';
import CirclesTab from '@/app/(tabs)/circles';
import GrowthScreen from '@/app/(tabs)/growth';
import StepScreen from '@/app/step/[id]';
import DoneScreen from '@/app/step/[id]/done';
import VerifiedScreen from '@/app/verified/[id]';
import ProfileScreen from '@/app/profile';
import SafetyScreen from '@/app/safety';
import FamilyScreen from '@/app/family';
import DataScreen from '@/app/data';
import OnboardingScreen from '@/app/onboarding';
import MentorsScreen from '@/app/mentors/index';
import MentorScreen from '@/app/mentor/[id]';
import ChatScreen from '@/app/chat/[matchId]';
import CircleScreen from '@/app/circle/[id]';
import { applyDemoScenario } from '@/services/demo';
import { actions, getState, hydrate } from '@/store/appStore';

const routes = {
  index: NextScreen,
  roadmap: RoadmapScreen,
  mentor: MentorTab,
  circles: CirclesTab,
  growth: GrowthScreen,
  'step/[id]': StepScreen,
  'step/[id]/done': DoneScreen,
  'verified/[id]': VerifiedScreen,
  profile: ProfileScreen,
  safety: SafetyScreen,
  family: FamilyScreen,
  data: DataScreen,
  onboarding: OnboardingScreen,
  'mentors/index': MentorsScreen,
  'mentor/[id]': MentorScreen,
  'chat/[matchId]': ChatScreen,
  'circle/[id]': CircleScreen,
};

const fetchSpy = jest.spyOn(globalThis, 'fetch' as never);

beforeEach(() => {
  hydrate();
  applyDemoScenario('spring');
  actions.setNetwork({ online: false });
  fetchSpy.mockClear();
});

afterAll(() => fetchSpy.mockRestore());

/**
 * Every event is wrapped in an awaited async act: a bare fireEvent followed by a findBy* query opens
 * overlapping act scopes under React 19, which leaves later renders unflushed (empty trees).
 */
async function press(el: ReturnType<typeof screen.getByText>) {
  await act(async () => {
    fireEvent.press(el);
  });
}
async function type(el: ReturnType<typeof screen.getByText>, text: string) {
  await act(async () => {
    fireEvent.changeText(el, text);
  });
}

describe('Next (offline, demo spring)', () => {
  test('exactly one hero: the Dream Act step with 23 days left; offline banner; demo note; zero fetches', async () => {
    await renderRouter(routes, { initialUrl: '/' });
    expect(await screen.findByText('Submit the California Dream Act application')).toBeTruthy();
    expect(screen.getAllByTestId('next-step-hero')).toHaveLength(1);
    expect(screen.getByText('23 days left · Mar 2')).toBeTruthy();
    expect(screen.getByText(/OFFLINE MODE/)).toBeTruthy();
    expect(screen.getByText(/Demo · clock set to/)).toBeTruthy();
    expect(screen.getAllByText(/Daniela R\./).length).toBeGreaterThan(0);
    expect(screen.getByText(/Newhope branch/)).toBeTruthy();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe('Roadmap and step', () => {
  test('roadmap groups by status and explains why it differs without naming a status', async () => {
    await renderRouter(routes, { initialUrl: '/roadmap' });
    expect(await screen.findByText('My roadmap')).toBeTruthy();
    expect(screen.getByText('Do now')).toBeTruthy();
    expect(screen.getByText(/Dream Act path, not FAFSA/)).toBeTruthy();
    expect(screen.queryByText(/immigration/i)).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
  test('step detail: why, documents, how, verified source, finish button', async () => {
    await renderRouter(routes, { initialUrl: '/step/aid-application' });
    expect(await screen.findByText('Why this matters')).toBeTruthy();
    expect(screen.getByText(/parents' 2024 tax return/)).toBeTruthy();
    expect(screen.getByText(/ITIN in the parent SSN field/)).toBeTruthy();
    expect(screen.getAllByText(/verified /).length).toBeGreaterThan(0);
    expect(screen.getByTestId('finish-step')).toBeTruthy();
  });
  test('a locked step names the step that has to happen first, with the variant title', async () => {
    await renderRouter(routes, { initialUrl: '/step/cal-grant-gpa' });
    expect(await screen.findByText('Not yet')).toBeTruthy();
    expect(screen.getByText(/This step opens after: Submit the California Dream Act application/)).toBeTruthy();
  });
});

describe('Mark done → verified', () => {
  test('self-attest marks the step self-reported, awards 10 points and queues the write, offline', async () => {
    await renderRouter(routes, { initialUrl: '/step/aid-letters/done' });
    expect(await screen.findByText('How should we count this?')).toBeTruthy();
    await press(screen.getByTestId('path-self'));
    await press(screen.getByTestId('submit-done'));
    expect(await screen.findByText('Saved as self-reported')).toBeTruthy();
    expect(screen.getByText('+10 effort points')).toBeTruthy();
    expect(getState().progress.find((p) => p.stepKey === 'aid-letters')).toMatchObject({ status: 'done', verification: 'self' });
    expect(getState().mutations.some((m) => m.kind === 'step_done')).toBe(true);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
  test('the mentor path is offered when a mentor is matched', async () => {
    await renderRouter(routes, { initialUrl: '/step/aid-application/done' });
    expect(await screen.findByTestId('path-mentor')).toBeTruthy();
    expect(screen.getByText('Ask my mentor to confirm')).toBeTruthy();
  });
});

describe('Mentor, chat and guard', () => {
  test('the mentor tab shows the thread', async () => {
    await renderRouter(routes, { initialUrl: '/mentor' });
    expect(await screen.findByTestId('open-thread')).toBeTruthy();
  });
  test('the chat shows the logged notice and the prototype thread', async () => {
    await renderRouter(routes, { initialUrl: '/chat/match-daniela' });
    expect(await screen.findByText(/This conversation is logged/)).toBeTruthy();
    expect(screen.getByText(/ITIN in the parent SSN field/)).toBeTruthy();
  });
  test('the composer refuses a phone number before anything is sent', async () => {
    await renderRouter(routes, { initialUrl: '/chat/match-daniela' });
    const input = await screen.findByTestId('composer-input');
    await type(input, 'call me at (714) 555-0199');
    expect(await screen.findByText(/This looks like a phone number/)).toBeTruthy();
    const before = getState().messages['match-daniela'].length;
    await press(screen.getByTestId('composer-send'));
    expect(getState().messages['match-daniela'].length).toBe(before);
  });
  test('a question is stored locally, marked pending, and counts as a question asked', async () => {
    await renderRouter(routes, { initialUrl: '/chat/match-daniela' });
    const input = await screen.findByTestId('composer-input');
    const q = getState().effort.filter((e) => e.kind === 'question_asked').length;
    await type(input, 'Is the March 2 deadline real?');
    await press(screen.getByTestId('composer-send'));
    expect(getState().messages['match-daniela'].at(-1)).toMatchObject({ sender: 'student', pending: true });
    expect(getState().effort.filter((e) => e.kind === 'question_asked').length).toBe(q + 1);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
  test('mentor profile shows the can and cannot lists', async () => {
    await renderRouter(routes, { initialUrl: '/mentor/daniela' });
    expect(await screen.findByText(/Dream Act application at this same school/)).toBeTruthy();
    expect(screen.getByText('UC applications (I did not apply)')).toBeTruthy();
  });
  test('discovery ranks mentors with fit words, never a percentage', async () => {
    await renderRouter(routes, { initialUrl: '/mentors' });
    expect(await screen.findByText('Near-peer · verified steps only')).toBeTruthy();
    expect(screen.getAllByText(/ fit$/).length).toBeGreaterThan(1);
    expect(screen.queryByText(/\d+%/)).toBeNull();
  });
});

describe('Circles, growth, profile, safety, family, data', () => {
  test('circles list renders the Tuesday library circle', async () => {
    await renderRouter(routes, { initialUrl: '/circles' });
    expect((await screen.findAllByText(/Newhope branch/)).length).toBeGreaterThan(0);
    expect(screen.getByText('5 near you')).toBeTruthy();
  });
  test('circle detail renders logistics and the adult-present rule', async () => {
    await renderRouter(routes, { initialUrl: '/circle/circle-newhope' });
    expect(await screen.findByText(/van pickup from Valley High/)).toBeTruthy();
    expect(screen.getByText('Adult present')).toBeTruthy();
  });
  test('growth shows points, sources and badges with no leaderboard', async () => {
    await renderRouter(routes, { initialUrl: '/growth' });
    expect(await screen.findByText(/effort points · level/)).toBeTruthy();
    expect(screen.getByText('Questions asked')).toBeTruthy();
    expect(screen.getByText(/there is no public leaderboard/)).toBeTruthy(); // stated, never built
    expect(screen.queryByText(/^#\d/)).toBeNull(); // no rank numbers anywhere
  });
  test('profile renders the student and the goals', async () => {
    await renderRouter(routes, { initialUrl: '/profile' });
    expect(await screen.findByText('Ana M.')).toBeTruthy();
    expect(screen.getByText(/College — CSU, UC or community college/)).toBeTruthy();
  });
  test('safety renders the under-18 rules and the immigration-data stance', async () => {
    await renderRouter(routes, { initialUrl: '/safety' });
    expect(await screen.findByText('Immigration status & data')).toBeTruthy();
    expect(screen.getByText(/No 1:1 offline meetings/)).toBeTruthy();
  });
  test('family view opens in Spanish with three requests and no document asked', async () => {
    await renderRouter(routes, { initialUrl: '/family' });
    expect(await screen.findByText('Vista para la familia')).toBeTruthy();
    expect(screen.getByText('Pedir un intérprete')).toBeTruthy();
    expect(screen.getByText(/Nada en esta pantalla pide al padre un documento/)).toBeTruthy();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
  test('offline data lists the content version and the demo picker', async () => {
    await renderRouter(routes, { initialUrl: '/data' });
    expect(await screen.findByText(/version /)).toBeTruthy();
    expect(screen.getByText('Demo & testing')).toBeTruthy();
  });
});

describe('Onboarding (real data, no demo)', () => {
  test('reaches one step in ten taps and stores the aid path as a form choice', async () => {
    applyDemoScenario('none'); // back to real data and the real clock
    await renderRouter(routes, { initialUrl: '/onboarding' });
    await press(await screen.findByTestId('onb-start'));
    await type(await screen.findByTestId('onb-name'), 'Kevin T.');
    await press(screen.getByTestId('onb-continue'));
    await press(await screen.findByText('12'));
    await press(screen.getByTestId('onb-continue'));
    await screen.findByText('Español'); // languages read (English preselected)
    await press(screen.getByTestId('onb-continue'));
    await press(await screen.findByText('Tiếng Việt'));
    await press(screen.getByTestId('onb-continue'));
    await press(await screen.findByText('No')); // English learner: no
    await press(screen.getByTestId('onb-continue'));
    await press((await screen.findAllByText('No'))[0]); // 18 or older: no
    await press(screen.getByTestId('onb-continue'));
    await press(await screen.findByTestId('goal-college'));
    await press(screen.getByTestId('onb-continue'));
    await press(await screen.findByTestId('aid-fafsa'));
    await press(screen.getByTestId('onb-continue'));
    await press(await screen.findByTestId('onb-continue')); // guardian contact (skipped)
    await press(await screen.findByTestId('onb-finish'));
    expect(getState().onboarded).toBe(true);
    expect(getState().profile).toMatchObject({ displayName: 'Kevin T.', grade: 12, aidPath: 'fafsa', ageBand: 'under_18' });
    expect(getState().progress.length).toBeGreaterThan(0);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

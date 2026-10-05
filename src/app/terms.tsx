/** Terms — plain language, high school only, what the program is and is not. Counsel review before launch (plan R17). */
import { Cell, Group, SectionFooter, SectionHeader } from '@/ui/primitives';
import { Screen } from '@/ui/Screen';

const TERMS = [
  ['Who can use NextStep', 'High-school students verified by their school or a community organization, mentors 18 or older who completed training, and program staff. Not for anyone under 13.'],
  ['What mentors are', 'Near-peers who finished the same steps. They are not counselors, lawyers or financial advisers, and the app only lets them help with steps they verified.'],
  ['Where you talk', 'Inside the app only. Messages are logged and can be reviewed by the program coordinator after a report. Mentors and students meet in person only at circles and events with an adult present.'],
  ['What we never ask', 'Immigration status, country of birth, document numbers, your location, or a photo of you.'],
  ['Mandated reporting', 'Coordinators are school staff and mandated reporters. If a message shows someone is in danger, they must act. We say so instead of promising secrecy we cannot keep.'],
  ['Your data', 'You can export or delete it from your profile. Messages are kept up to a year for safety and then removed.'],
  ['Content', 'Every step shows who checked it and when. Anything not checked in 120 days is hidden. If something is wrong, tell us from the step; it opens a review ticket.'],
  ['No money', 'Nothing in NextStep costs money, and no money changes hands between students and mentors.'],
];

export default function TermsScreen() {
  return (
    <Screen title="Terms" largeTitle="Terms" fallback="/" demo={false}>
      <SectionHeader>Plain-language terms</SectionHeader>
      <Group>
        {TERMS.map(([title, body], i) => (
          <Cell key={title} title={title} subtitle={body} last={i === TERMS.length - 1} />
        ))}
      </Group>
      <SectionFooter>Draft for counsel review before any student uses the app with real data.</SectionFooter>
    </Screen>
  );
}

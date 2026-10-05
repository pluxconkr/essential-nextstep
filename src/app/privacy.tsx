/** Privacy — the data-minimisation table as a product feature, not legal boilerplate (spec §15). */
import { Text } from 'react-native';

import { t } from '@/i18n';
import { Cell, Group, SectionFooter, SectionHeader } from '@/ui/primitives';
import { Screen } from '@/ui/Screen';
import { type } from '@/ui/theme';

const ROWS = [
  ['Name, grade, school', 'yes', 'Matching and coordinator outreach', 'While enrolled + 1 year'],
  ['Languages spoken', 'yes', 'Matching, interpretation, translated content', 'While enrolled'],
  ['Goals & steps', 'yes', 'The product itself', 'Student-controlled, exportable'],
  ['Aid form (FAFSA / CADAA)', 'as a form choice', 'Shows the right step', 'Never exported; not visible to coordinators'],
  ['Immigration status', 'never', '—', '—'],
  ['Country of birth', 'never', '—', '—'],
  ['Confirmation screenshots', 'optional', 'Step verification', '90 days, auto-deleted'],
  ['Chat messages', 'yes, logged', 'Minor safety — stated to both parties', '1 year, reviewable only on a report'],
  ['Precise location', 'never', 'Circles use venue names, not GPS', '—'],
  ['Parent contact', 'optional', 'Family view link, interpretation requests', 'Deleted on request, no account created'],
];

export default function PrivacyScreen() {
  return (
    <Screen title={t('safety.title')} largeTitle="Privacy" fallback="/" demo={false}>
      <SectionHeader>What we collect, why, and for how long</SectionHeader>
      <Group>
        {ROWS.map(([field, collected, why, retention], i) => (
          <Cell key={field} title={field} subtitle={<Text style={[type.footnote, { marginTop: 2 }]}>{`${collected} · ${why} · ${retention}`}</Text>} last={i === ROWS.length - 1} />
        ))}
      </Group>
      <SectionFooter>Aggregate-only for institutions, with small-cell suppression (fewer than 5 students are never shown). FERPA only under a district agreement; COPPA: 13+ only; California SOPIPA / AB 1584: no ads, no selling data, no profiling; CCPA/CPRA: export and deletion are buttons in your profile.</SectionFooter>
      <SectionHeader>Where AI is and is not</SectionHeader>
      <Group>
        <Cell title="Translating messages" subtitle="Optional, off by default; the original text is always kept" />
        <Cell title="Answering your aid or legal question" subtitle="Never. Routed to a person or the legal partner." />
        <Cell title="Predicting who will succeed" subtitle="Never. The only ranking is deadline-based outreach for the coordinator." last />
      </Group>
    </Screen>
  );
}

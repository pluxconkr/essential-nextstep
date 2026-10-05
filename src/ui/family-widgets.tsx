/**
 * Family view widgets — shared by the student's preview (S-16) and the web page (/f/[token]).
 * Locale-first line in body, English gloss in footnote. Nothing here asks for a document or a status.
 */
import { Text, View } from 'react-native';

import { formatMonthDay } from '@/domain/format';
import type { GlossaryEntry, RoadmapStep } from '@/domain/types';
import { tFor, type Locale } from '@/i18n';

import { Button, Cell, Group, SectionFooter, SectionHeader } from './primitives';
import { tabular, type } from './theme';

function localized<T extends object>(obj: T, base: string, loc: Locale): string {
  const rec = obj as Record<string, unknown>;
  const v = loc === 'es' ? rec[`${base}Es`] : undefined;
  const fb = rec[base];
  return typeof v === 'string' && v ? v : typeof fb === 'string' ? fb : '';
}

/** Upcoming dates for the next 90 days: title in the family's language, English gloss, days left. */
export function FamilyDates({ rows, loc, now }: { rows: RoadmapStep[]; loc: Locale; now: number }) {
  const upcoming = rows.filter((r) => r.state.status !== 'done' && r.state.dueAt != null && r.daysLeft != null && r.daysLeft >= -3 && r.daysLeft <= 90).slice(0, 6);
  return (
    <>
      <SectionHeader>{tFor(loc, 'family.upcoming')}</SectionHeader>
      <Group>
        {upcoming.length === 0 ? <Cell title={tFor(loc, 'home.allDone')} last /> : null}
        {upcoming.map((r, i) => (
          <Cell
            key={r.step.key}
            title={
              <View>
                <Text style={type.body}>
                  {formatMonthDay(r.state.dueAt as number, loc)} — {localized(r.step, 'title', loc)}
                </Text>
                {loc !== 'en' ? <Text style={[type.footnote, { marginTop: 2 }]}>{r.step.title}</Text> : null}
              </View>
            }
            subtitle={firstSentence(localized(r.step, 'why', loc))}
            value={r.daysLeft != null ? (r.daysLeft < 0 ? tFor(loc, 'due.overdue.other', { n: -r.daysLeft }) : r.daysLeft === 1 ? tFor(loc, 'due.days.one', { n: 1 }) : tFor(loc, 'due.days.other', { n: r.daysLeft })) : undefined}
            last={i === upcoming.length - 1}
          />
        ))}
      </Group>
      <SectionFooter>{tFor(loc, 'family.footer')}</SectionFooter>
    </>
  );
}

export function Glossary({ entries, loc }: { entries: GlossaryEntry[]; loc: Locale }) {
  return (
    <>
      <SectionHeader>{tFor(loc, 'family.glossary')}</SectionHeader>
      <Group>
        {entries.map((g, i) => (
          <Cell key={g.term} title={<Text style={[type.body, { fontWeight: type.headline.fontWeight }]}>{g.term}</Text>} subtitle={<Text style={[type.subheadline, { marginTop: 2 }]}>{localized(g, 'definition', loc)}</Text>} last={i === entries.length - 1} />
        ))}
      </Group>
      <SectionFooter>{tFor(loc, 'family.glossaryFooter')}</SectionFooter>
    </>
  );
}

export function FamilyRequests({ loc, onRequest, sent }: { loc: Locale; onRequest: (kind: 'interpreter' | 'ride' | 'callback') => void; sent: Record<string, boolean> }) {
  return (
    <>
      <SectionHeader>{tFor(loc, 'family.help')}</SectionHeader>
      <View style={{ gap: 8 }}>
        <Button title={tFor(loc, 'family.interpreter')} icon="mic" variant="tonal" onPress={() => onRequest('interpreter')} disabled={!!sent.interpreter} />
        <Button title={tFor(loc, 'family.ride')} icon="bus" variant="tonal" onPress={() => onRequest('ride')} disabled={!!sent.ride} />
        <Button title={tFor(loc, 'family.callback')} icon="phone" variant="tonal" onPress={() => onRequest('callback')} disabled={!!sent.callback} />
      </View>
      {Object.values(sent).some(Boolean) ? <SectionFooter>{tFor(loc, 'family.requestSent')}</SectionFooter> : null}
    </>
  );
}

export function NoticeBanner({ loc, studentName, onOptOut }: { loc: Locale; studentName: string; onOptOut: () => void }) {
  return (
    <Group padded tone="tint">
      <Text style={type.headline}>{tFor(loc, 'family.noticeTitle', { name: studentName })}</Text>
      <Text style={[type.subheadline, { marginTop: 4 }]}>{tFor(loc, 'family.noticeSub')}</Text>
      <View style={{ marginTop: 10 }}>
        <Button title={tFor(loc, 'family.optOut')} variant="secondary" small onPress={onOptOut} />
      </View>
    </Group>
  );
}

export function DaysLeft({ n }: { n: number }) {
  return <Text style={[type.body, tabular]}>{n}</Text>;
}

function firstSentence(text: string): string {
  const m = /^[^.!?]+[.!?]/.exec(text);
  return m ? m[0].trim() : text;
}

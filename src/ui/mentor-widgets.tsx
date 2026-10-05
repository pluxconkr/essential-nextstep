/**
 * Mentor widgets: the card (initials, path line, fit as a word + bars — never a bare %),
 * the can / cannot lists (the trust mechanism), and the six-term match explanation.
 */
import { Text, View } from 'react-native';

import { fitWord } from '@/domain/format';
import { explain, score, terms, WEIGHTS, type MatchMentor, type MatchStudent, type Term } from '@/domain/matching';
import type { MentorPublic, StudentProfile } from '@/domain/types';
import { t, tn } from '@/i18n';

import { Bars, Cell, Group, InitialsAvatar, ProgressBar, SectionHeader, Tag } from './primitives';
import { colors, type } from './theme';

/** Build the matching view of the student from local data (no server yet). */
export function matchStudentFrom(profile: StudentProfile, nextStepKeys: string[], circleIds: string[]): MatchStudent {
  const pathTags = [...profile.goals.map((g) => (g === 'college' ? 'csu' : g === 'certificate' ? 'career' : g === 'biliteracy' ? 'biliteracy' : 'exploring')), profile.aidPath === 'cadaa' ? 'cadaa' : profile.aidPath === 'fafsa' ? 'fafsa' : 'aid_unsure', 'first_gen'];
  return {
    id: 'me',
    languagesHome: profile.languagesHome,
    languagesRead: profile.languagesRead,
    nextStepKeys,
    goals: profile.goals,
    pathTags,
    schoolId: profile.schoolId,
    districtId: 'sausd',
    regionId: 'oc',
    circleIds,
    ageBand: profile.ageBand,
    staffOnly: false,
    blockedMentorIds: [],
  };
}

export function matchMentorFrom(m: MentorPublic): MatchMentor {
  return {
    id: m.id,
    languages: m.languages,
    verifiedStepKeys: m.verifiedStepKeys,
    pathTags: m.pathTags,
    schoolOfOriginId: m.schoolOfOriginId,
    districtId: 'sausd',
    regionId: 'oc',
    capacity: m.capacity,
    load: m.load,
    medianReplyMinutes: m.medianReplyMinutes,
    trained: true,
    conductAgreed: true,
    ageBand: 'adult',
    kind: m.kind,
    backgroundCheckCleared: false,
    circleIds: m.circleIds,
    blockedStudentIds: [],
    pausedUntilMs: null,
    active: true,
  };
}

export function fitFor(student: MatchStudent, mentor: MentorPublic): { score: number; terms: Record<Term, number> } {
  const tm = terms(student, matchMentorFrom(mentor));
  return { score: score(tm), terms: tm };
}

export function replyText(minutes: number | null): string {
  if (minutes == null) return '';
  return t('mentors.replies', { x: minutes < 90 ? tn(minutes, 'common.min') : tn(Math.round(minutes / 60), 'common.hours') });
}

export function MentorCard({ mentor, fit, onPress, last }: { mentor: MentorPublic; fit: number; onPress: () => void; last?: boolean }) {
  const f = fitWord(fit);
  const full = mentor.load >= mentor.capacity;
  return (
    <Cell
      leading={<InitialsAvatar initials={mentor.initials} verified />}
      title={
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <Text style={type.body}>{mentor.displayName}</Text>
          {full ? <Tag tone="grey" filled>{t('mentors.atCapacity')}</Tag> : null}
        </View>
      }
      subtitle={
        <View style={{ marginTop: 2, gap: 2 }}>
          <Text style={type.footnote}>{mentor.nowStatus}</Text>
          <Text style={type.footnote}>
            {mentor.schoolOfOriginName ?? ''} · {mentor.pathLine}
          </Text>
          <Text style={type.footnote}>
            {mentor.languages.map((l) => l.toUpperCase()).join(' / ')} · {tn(mentor.verifiedStepKeys.length, 'mentors.stepsVerified')}
            {mentor.medianReplyMinutes != null ? ` · ${replyText(mentor.medianReplyMinutes)}` : ''}
          </Text>
        </View>
      }
      trailing={
        <View style={{ alignItems: 'flex-end', gap: 4, marginLeft: 8 }}>
          <Text style={type.footnote}>{t(`mentors.fit.${f.word}` as const)}</Text>
          <Bars filled={f.bars} />
        </View>
      }
      accessory="chevron"
      onPress={onPress}
      accessibilityLabel={`${mentor.displayName}, ${mentor.nowStatus}, ${t(`mentors.fit.${f.word}` as const)}`}
      last={last}
    />
  );
}

export function CanCannotLists({ mentor, stepTitles }: { mentor: MentorPublic; stepTitles: (key: string) => string }) {
  return (
    <>
      <SectionHeader>{cannotHeader('can')}</SectionHeader>
      <Group tone="green">
        {mentor.verifiedStepKeys.map((k, i) => (
          <Cell key={k} icon="checkCircle" iconColor={colors.green} title={<Text style={type.subheadline}>{stepTitles(k)}</Text>} last={i === mentor.verifiedStepKeys.length - 1} />
        ))}
      </Group>
      <SectionHeader>{cannotHeader('cannot')}</SectionHeader>
      <Group>
        {mentor.cannotHelpWith.map((c, i) => (
          <Cell key={c} icon="circle" iconColor={colors.ink4} title={<Text style={type.subheadline}>{c}</Text>} last={i === mentor.cannotHelpWith.length - 1} />
        ))}
      </Group>
    </>
  );
}

function cannotHeader(which: 'can' | 'cannot'): string {
  // Short, so they read as two lists side by side in the student's mind.
  return which === 'can' ? (t('tab.mentor') === 'Mentor' ? 'Can help you with' : 'Puede ayudarte con') : t('tab.mentor') === 'Mentor' ? 'Will tell you to ask someone else about' : 'Te dirá que preguntes a alguien más sobre';
}

/** The six weighted terms, as bars with the weight printed. Rendered identically on S5 and /why/match. */
export function MatchExplain({ termsValue }: { termsValue?: Record<Term, number> }) {
  const rows = explain(termsValue ?? { language: 0, steps: 0, path: 0, origin: 0, availability: 0, circle: 0 });
  return (
    <Group padded>
      <View style={{ gap: 10 }}>
        {rows.map((r) => (
          <ProgressBar key={r.term} label={t(`match.term.${r.term}` as const)} done={Math.round((termsValue ? r.value : 1) * 100)} total={100} valueText={WEIGHTS[r.term].toFixed(2)} />
        ))}
      </View>
    </Group>
  );
}

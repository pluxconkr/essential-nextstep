/** S-06 Mentor profile — the path they walked, what they can and cannot help with, how this works. */
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';

import { fitWord } from '@/domain/format';
import { pick, t, tn } from '@/i18n';
import { actions, useAppState } from '@/store/appStore';
import { useCircles, useMentor, useMyMentor, useRoadmap } from '@/store/derived';
import { CanCannotLists, fitFor, matchStudentFrom, replyText } from '@/ui/mentor-widgets';
import { Bars, Button, Cell, Group, InitialsAvatar, KeyValue, SectionFooter, SectionHeader, Tag } from '@/ui/primitives';
import { HeaderIconButton, Screen } from '@/ui/Screen';
import { colors, type } from '@/ui/theme';

export default function MentorScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const mentor = useMentor(id);
  const profile = useAppState((s) => s.profile);
  const content = useAppState((s) => s.content);
  const roadmap = useRoadmap();
  const circles = useCircles();
  const { match } = useMyMentor();
  const [requested, setRequested] = useState(false);
  const fit = useMemo(() => (profile && mentor ? fitFor(matchStudentFrom(profile, roadmap.filter((r) => r.state.status === 'open').slice(0, 3).map((r) => r.step.key), circles.filter((c) => c.mine).map((c) => c.id)), mentor) : null), [profile, mentor, roadmap, circles]);

  if (!mentor || !profile) return null;
  const full = mentor.load >= mentor.capacity;
  const isMine = match?.mentorId === mentor.id && match.state === 'active';
  const f = fit ? fitWord(fit.score) : null;
  const titleOf = (k: string) => pick(content.steps.find((s) => s.key === k) ?? { title: k, titleEs: k }, 'title');

  const request = () => {
    setRequested(true);
    if (!match) actions.setMatches([{ id: `match-${mentor.id}`, mentorId: mentor.id, state: full ? 'waitlisted' : 'requested', startedAt: null, frozenAt: null, unread: 0 }]);
  };

  return (
    <Screen
      title={t('tab.mentor')}
      fallback="/mentor"
      headerRight={<HeaderIconButton icon="flag" label={t('safety.report')} onPress={() => router.push('/safety')} />}
      footer={
        isMine ? (
          <Button title={t('home.message')} onPress={() => router.push({ pathname: '/chat/[matchId]', params: { matchId: match!.id } })} />
        ) : (
          <>
            <Button title={requested ? (full ? t('mentors.atCapacity') : t('verified.titlePending')) : full ? 'Join the waitlist' : `Ask ${mentor.displayName.split(' ')[0]} to be my mentor`} variant={full ? 'tonal' : 'primary'} disabled={requested} onPress={request} testID="request-mentor" />
            <Button title={t('step.findSomeone')} variant="ghost" small onPress={() => router.push('/mentors')} />
          </>
        )
      }
      testID="screen-mentor-profile">
      <View style={{ height: 8 }} />
      <Group padded>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <InitialsAvatar initials={mentor.initials} size={56} verified />
          <View style={{ flex: 1 }}>
            <Text style={type.title3}>{mentor.displayName}</Text>
            <Text style={type.footnote}>{mentor.nowStatus}</Text>
            <View style={{ flexDirection: 'row', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
              {mentor.languages.map((l) => (
                <Tag key={l} tone="grey" filled>{l.toUpperCase()}</Tag>
              ))}
              <Tag tone="green">{mentor.kind === 'alum' ? 'Alum' : 'Near-peer'}</Tag>
            </View>
          </View>
          {f ? (
            <View style={{ alignItems: 'flex-end', gap: 4 }}>
              <Text style={type.footnote}>{t(`mentors.fit.${f.word}` as const)}</Text>
              <Bars filled={f.bars} />
            </View>
          ) : null}
        </View>
        <Text style={[type.subheadline, { marginTop: 12 }]}>“{mentor.bio}”</Text>
      </Group>

      <SectionHeader>{t('home.herPath')}</SectionHeader>
      <Group padded>
        <KeyValue
          rows={[
            { label: 'From', value: `${mentor.schoolOfOriginName ?? '—'}${mentor.classOf ? ` ’${mentor.classOf.slice(2)}` : ''}` },
            { label: 'Now', value: mentor.nowStatus },
            { label: 'Path', value: mentor.pathLine },
            { label: 'Mentees', value: `${mentor.load} of ${mentor.capacity}` },
            { label: 'Replies', value: replyText(mentor.medianReplyMinutes) || '—' },
          ]}
        />
      </Group>

      <CanCannotLists mentor={mentor} stepTitles={titleOf} />
      <SectionFooter>{tn(mentor.verifiedStepKeys.length, 'mentors.stepsVerified')} · {t('step.mentorsDidSub')}</SectionFooter>

      <SectionHeader>{t('mentors.howMatching')}</SectionHeader>
      <Group>
        <Cell icon="lock" title={<Text style={type.subheadline}>{t('safety.rule1')}</Text>} />
        <Cell icon="people" title={<Text style={type.subheadline}>{t('safety.rule2')}</Text>} />
        <Cell icon="family" title={<Text style={type.subheadline}>{t('safety.rule5')}</Text>} />
        <Cell icon="eyeOff" iconColor={colors.ink2} title={<Text style={type.subheadline}>{t('safety.after3Sub')}</Text>} last />
      </Group>
    </Screen>
  );
}

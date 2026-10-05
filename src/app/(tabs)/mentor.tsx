/**
 * Mentor tab — matched: the thread; pending notice: why nothing has started; unmatched: discovery.
 */
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Text, View } from 'react-native';

import { pick, t } from '@/i18n';
import { useAppState } from '@/store/appStore';
import { useCircles, useMentors, useMyMentor, useRoadmap } from '@/store/derived';
import { Button, Callout, Cell, Empty, Group, InitialsAvatar, SectionFooter, SectionHeader } from '@/ui/primitives';
import { fitFor, matchStudentFrom, MatchExplain, MentorCard } from '@/ui/mentor-widgets';
import { HeaderIconButton, Screen } from '@/ui/Screen';
import { type } from '@/ui/theme';

export default function MentorTab() {
  const router = useRouter();
  const profile = useAppState((s) => s.profile);
  const messages = useAppState((s) => s.messages);
  const { match, mentor } = useMyMentor();
  const mentors = useMentors();
  const roadmap = useRoadmap();
  const circles = useCircles();
  const student = useMemo(() => (profile ? matchStudentFrom(profile, roadmap.filter((r) => r.state.status === 'open' || r.state.status === 'stalled').slice(0, 3).map((r) => r.step.key), circles.filter((c) => c.mine).map((c) => c.id)) : null), [profile, roadmap, circles]);
  const ranked = useMemo(() => (student ? mentors.map((m) => ({ m, fit: fitFor(student, m) })).sort((a, b) => b.fit.score - a.fit.score) : []), [student, mentors]);

  if (!profile) return null;

  const headerRight = <HeaderIconButton icon="shield" label={t('safety.title')} onPress={() => router.push('/safety')} testID="to-safety" />;

  if (match && mentor && match.state === 'active') {
    const thread = messages[match.id] ?? [];
    const lastMsg = [...thread].reverse().find((m) => m.sender !== 'system');
    return (
      <Screen largeTitle={t('tab.mentor')} subtitle={t('mentors.subtitle')} headerRight={headerRight} testID="screen-mentor">
        <Group>
          <Cell
            leading={<InitialsAvatar initials={mentor.initials} verified />}
            title={mentor.displayName}
            subtitle={lastMsg ? lastMsg.body : mentor.nowStatus}
            numberOfLines={1}
            accessory="chevron"
            onPress={() => router.push({ pathname: '/chat/[matchId]', params: { matchId: match.id } })}
            testID="open-thread"
            last
          />
        </Group>
        <SectionFooter>{t('safety.rule1')}</SectionFooter>
        <SectionHeader>{t('home.herPath')}</SectionHeader>
        <Group>
          <Cell icon="person" title={mentor.nowStatus} subtitle={mentor.pathLine} accessory="chevron" onPress={() => router.push({ pathname: '/mentor/[id]', params: { id: mentor.id } })} last />
        </Group>
        <View style={{ height: 16 }} />
        <Button title={t('step.findSomeone')} variant="ghost" small onPress={() => router.push('/mentors')} />
      </Screen>
    );
  }

  if (match && match.state === 'confirmed_pending_notice') {
    return (
      <Screen largeTitle={t('tab.mentor')} subtitle={t('mentors.subtitle')} headerRight={headerRight} testID="screen-mentor">
        <Callout tone="tint" icon="family" title={t('home.noticePending')} action={<Button title={t('family.share')} variant="tonal" small onPress={() => router.push('/family')} />}>
          {t('home.noticePendingSub')}
        </Callout>
      </Screen>
    );
  }

  return (
    <Screen largeTitle={t('mentors.title')} subtitle={t('mentors.subtitle')} headerRight={headerRight} testID="screen-mentor">
      <Callout tone="tint" icon="mentor">
        {t('mentors.blurb')}
      </Callout>
      <SectionHeader>{t('home.findMentor')}</SectionHeader>
      {ranked.length === 0 ? (
        <Empty icon="mentor" title={t('home.noMentorTitle')} subtitle={t('mentors.comingM2')} />
      ) : (
        <Group>
          {ranked.slice(0, 5).map(({ m, fit }, i) => (
            <MentorCard key={m.id} mentor={m} fit={fit.score} onPress={() => router.push({ pathname: '/mentor/[id]', params: { id: m.id } })} last={i === Math.min(5, ranked.length) - 1} />
          ))}
        </Group>
      )}
      <SectionFooter>{t('mentors.howMatchingSub')}</SectionFooter>
      <SectionHeader>{t('mentors.howMatching')}</SectionHeader>
      <MatchExplain termsValue={ranked[0]?.fit.terms} />
      {ranked[0] ? <SectionFooter>{`${t('mentors.fit.strong')}: ${pick(ranked[0].m, 'displayName') || ranked[0].m.displayName}`}</SectionFooter> : null}
      <Text style={[type.footnote, { paddingHorizontal: 16, marginTop: 8 }]}>{t('safety.rule2')}</Text>
    </Screen>
  );
}

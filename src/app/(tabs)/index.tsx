/**
 * S-01 Next — one step, a countdown, a named human who already did it.
 * Everything else is one tap away. This is the single most important UI decision in the product.
 */
import { useRouter } from 'expo-router';
import { Text, View } from 'react-native';

import { formatMonthDay } from '@/domain/format';
import { locale, t, tn } from '@/i18n';
import { actions, useAppState } from '@/store/appStore';
import { useCircles, useComingUp, useMentorsWhoDid, useMyMentor, useNextStep, useRoadmap, useTrackProgress } from '@/store/derived';
import { Button, Callout, Cell, Empty, Group, InitialsAvatar, SectionFooter, SectionHeader, Tag } from '@/ui/primitives';
import { HeaderIconButton, Screen } from '@/ui/Screen';
import { NextStepHero, StepRow, TrackProgressList } from '@/ui/step-widgets';
import { colors, type } from '@/ui/theme';

export default function NextScreen() {
  const router = useRouter();
  const profile = useAppState((s) => s.profile);
  const attendance = useAppState((s) => s.attendance);
  const roadmap = useRoadmap();
  const next = useNextStep();
  const coming = useComingUp(4);
  const progress = useTrackProgress();
  const mentorsDid = useMentorsWhoDid(next?.step.key);
  const { match, mentor } = useMyMentor();
  const circles = useCircles();
  const myCircle = circles.find((c) => c.mine) ?? null;
  const done = roadmap.filter((r) => r.state.status === 'done').length;

  if (!profile) return null;

  const noticePending = match?.state === 'confirmed_pending_notice';

  return (
    <Screen
      largeTitle={t('home.title')}
      subtitle={t('home.subtitle', { name: profile.displayName, grade: profile.grade, school: profile.schoolName })}
      status
      headerRight={<HeaderIconButton icon="person" label={t('profile.title')} onPress={() => router.push('/profile')} testID="to-profile" />}
      testID="screen-next">
      <SectionHeader>{t('home.yourNextStep')}</SectionHeader>
      {next ? (
        <NextStepHero
          row={next}
          mentorsDid={mentorsDid}
          hasMentor={!!mentor && match?.state === 'active'}
          onOpen={() => {
            actions.openStep(next.step.key);
            router.push({ pathname: '/step/[id]', params: { id: next.step.key } });
          }}
          onAsk={() => router.push(mentor && match?.state === 'active' ? { pathname: '/chat/[matchId]', params: { matchId: match.id } } : '/mentors')}
        />
      ) : (
        <Empty icon="checkCircle" title={t('home.allDone')} subtitle={t('home.allDoneSub')} />
      )}

      <SectionHeader>{t('home.progress')}</SectionHeader>
      <Group padded>
        <TrackProgressList items={progress} />
        <Text style={[type.footnote, { marginTop: 12 }]}>{t('home.progressLine', { done, total: roadmap.length, weeks: `${attendance.attended}/${attendance.of}` })}</Text>
      </Group>

      {coming.length > 0 ? (
        <>
          <SectionHeader right={<Text style={[type.sectionHeader, { color: colors.tint }]} onPress={() => router.push('/roadmap')}>{t('home.allSteps')} →</Text>}>{t('home.comingUp')}</SectionHeader>
          <Group>
            {coming.map((row, i) => (
              <StepRow
                key={row.step.key}
                row={row}
                last={i === coming.length - 1}
                onPress={() => {
                  actions.openStep(row.step.key);
                  router.push({ pathname: '/step/[id]', params: { id: row.step.key } });
                }}
              />
            ))}
          </Group>
        </>
      ) : null}

      <SectionHeader>{t('home.yourMentor')}</SectionHeader>
      {noticePending ? (
        <Callout tone="tint" icon="family" title={t('home.noticePending')} action={<Button title={t('family.share')} variant="tonal" small onPress={() => router.push('/family')} />}>
          {t('home.noticePendingSub')}
        </Callout>
      ) : mentor && match ? (
        <Group padded>
          <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
            <InitialsAvatar initials={mentor.initials} verified />
            <View style={{ flex: 1 }}>
              <Text style={type.headline}>
                {mentor.displayName} · {mentor.nowStatus.toLowerCase()}
              </Text>
              <Text style={type.footnote}>
                {mentor.schoolOfOriginName ?? ''}
                {mentor.classOf ? ` · ${t('common.of', { a: 'class', b: mentor.classOf })}` : ''} · {mentor.languages.map((l) => l.toUpperCase()).join('/')}
              </Text>
            </View>
          </View>
          {next && mentor.verifiedStepKeys.includes(next.step.key) ? <Text style={[type.subheadline, { marginTop: 10 }]}>“{firstLine(mentor.bio)}”</Text> : null}
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
            <Button title={t('home.message')} small onPress={() => router.push({ pathname: '/chat/[matchId]', params: { matchId: match.id } })} style={{ flex: 1 }} />
            <Button title={t('home.herPath')} small variant="tonal" onPress={() => router.push({ pathname: '/mentor/[id]', params: { id: mentor.id } })} style={{ flex: 1 }} />
          </View>
        </Group>
      ) : (
        <Group>
          <Cell icon="mentor" title={t('home.noMentorTitle')} subtitle={t('home.noMentorSub')} accessory="chevron" onPress={() => router.push('/mentors')} last />
        </Group>
      )}

      {myCircle ? (
        <>
          <SectionHeader>{t('home.circleNear')}</SectionHeader>
          <Group padded>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Tag tone="tint" filled>{`${weekdayName(myCircle.weekday)} ${myCircle.startTime}`}</Tag>
              <Text style={[type.footnote, { marginLeft: 'auto' }]}>{tn(myCircle.weeksRunning, 'circles.weeksRunning')}</Text>
            </View>
            <Text style={[type.headline, { marginTop: 8 }]}>{myCircle.venueName}</Text>
            <Text style={[type.footnote, { marginTop: 2 }]}>
              {t('circles.ledBy', { name: myCircle.leadMentorName })} · {myCircle.languages.map((l) => l.toUpperCase()).join('/')} · {t('circles.going', { joined: myCircle.joined, cap: myCircle.capacity })}
            </Text>
            <Text style={[type.footnote, { marginTop: 2 }]}>{myCircle.transitNote}</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
              <Button title={t('home.imGoing')} small variant="tonal" onPress={() => actions.rsvp(myCircle.id, true)} style={{ flex: 1 }} />
              <Button title={t('home.otherCircles')} small variant="secondary" onPress={() => router.push('/circles')} style={{ flex: 1 }} />
            </View>
          </Group>
        </>
      ) : null}

      <SectionHeader>{t('home.forFamily')}</SectionHeader>
      <Callout tone="tint" icon="family" action={<Button title={t('home.openFamily')} variant="tonal" small onPress={() => router.push('/family')} />}>
        {t('home.familyBlurb')}
      </Callout>
      {next ? <SectionFooter>{t('common.lastChecked', { date: formatMonthDay(Date.parse(`${next.step.lastVerified}T12:00:00Z`), locale()), who: ownerLabel(next.step.ownerRole) })}</SectionFooter> : null}
    </Screen>
  );
}

function firstLine(s: string): string {
  const m = /^[^.!?]+[.!?]/.exec(s);
  return m ? m[0] : s;
}

export function weekdayName(d: number): string {
  const base = new Date(Date.UTC(2027, 1, 7 + d)); // Sun 7 Feb 2027
  return new Intl.DateTimeFormat(locale() === 'es' ? 'es-US' : 'en-US', { weekday: 'long', timeZone: 'UTC' }).format(base).replace(/^./, (c) => c.toUpperCase());
}

export function ownerLabel(role: string): string {
  const map: Record<string, { en: string; es: string }> = {
    coordinator: { en: 'the coordinator', es: 'el coordinador' },
    counselor: { en: 'the counselor', es: 'el consejero' },
    cbo: { en: 'the community partner', es: 'la organización comunitaria' },
    mentor_lead: { en: 'the lead mentor', es: 'el mentor líder' },
    mentor: { en: 'a mentor', es: 'un mentor' },
  };
  return map[role]?.[locale()] ?? role;
}

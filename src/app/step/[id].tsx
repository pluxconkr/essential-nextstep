/**
 * S-03 Step detail — the heart of the product: a definition of done, a document list, a real
 * deadline, resources with a verification date, and the people who already did it.
 */
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Linking, Text, View } from 'react-native';

import { formatMonthDay } from '@/domain/format';
import { locale, pick, pickList, t, tn } from '@/i18n';
import { actions, useAppState } from '@/store/appStore';
import { useMentorsWhoDid, useMyMentor, useRoadmap, useStep } from '@/store/derived';
import { Button, Callout, Cell, Group, SectionFooter, SectionHeader, Tag, TrackPill } from '@/ui/primitives';
import { Screen } from '@/ui/Screen';
import { dueDescriptorFor, dueText, estimateText, statusLabel, trackLabel } from '@/ui/step-widgets';
import { colors, tabular, type } from '@/ui/theme';

import { ownerLabel } from '../(tabs)/index';

export default function StepScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const row = useStep(id);
  const roadmap = useRoadmap();
  const content = useAppState((s) => s.content);
  const mentorsDid = useMentorsWhoDid(id);
  const { match, mentor } = useMyMentor();
  const [ticked, setTicked] = useState<Record<string, boolean>>({});
  const [corrected, setCorrected] = useState(false);
  const [reminded, setReminded] = useState(false);

  if (!row) {
    return (
      <Screen title={t('step.nav')} largeTitle={t('notFound.title')} fallback="/roadmap">
        <Text style={type.subheadline}>{t('notFound.sub')}</Text>
      </Screen>
    );
  }

  const step = row.step;
  const d = dueDescriptorFor(row);
  const showCountdown = d.kind === 'in' && d.days <= 30;
  const resources = content.resources.filter((r) => r.stepKey === step.key);
  const done = row.state.status === 'done';
  const locked = row.state.status === 'locked';
  const docs = pickList(step, 'docs');
  const how = pickList(step, 'how');
  const toggle = (k: string) => setTicked((s) => ({ ...s, [k]: !s[k] }));

  const footer = !done ? (
    <>
      {locked ? (
        <Callout tone="amber" icon="lock" title={t('step.lockedTitle')}>
          {row.blockedBy.length > 0 ? t('step.lockedSub', { steps: row.blockedBy.map((k) => pick(roadmap.find((r) => r.step.key === k)?.step ?? { title: k, titleEs: k }, 'title')).join(', ') }) : t('step.futureGrade', { grade: Math.min(...step.grades) })}
        </Callout>
      ) : (
        <Button title={t('step.finished')} onPress={() => router.push({ pathname: '/step/[id]/done', params: { id: step.key } })} testID="finish-step" />
      )}
      <Button
        title={reminded && d.kind === 'in' ? t('step.reminded', { date: formatMonthDay(d.dueMs, locale()) }) : t('step.remind')}
        variant="ghost"
        small
        disabled={d.kind !== 'in'}
        onPress={() => setReminded(true)}
      />
    </>
  ) : (
    <Button title={t('step.backToRoadmap')} variant="tonal" onPress={() => router.replace('/roadmap')} />
  );

  return (
    <Screen title={t('step.nav')} fallback="/roadmap" footer={footer} testID="screen-step">
      <View style={{ paddingTop: 4, paddingBottom: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <TrackPill track={step.track} label={trackLabel(step.track)} />
          <Text style={type.footnote}>{statusLabel(row.state.status)}</Text>
          {step.reviewStatus === 'pending' ? <Tag tone="amber">{t('common.pendingReview')}</Tag> : null}
        </View>
        <Text style={[type.largeTitle, { marginTop: 8 }]} accessibilityRole="header">
          {pick(step, 'title')}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10, marginTop: 8 }}>
          {showCountdown && d.kind === 'in' ? (
            <Text style={[type.countdown, tabular]} accessibilityLabel={tn(d.days, 'due.daysLeft')}>
              {d.days}
            </Text>
          ) : null}
          <Text style={[type.subheadline, { flex: 1, paddingBottom: showCountdown ? 6 : 0, color: d.kind === 'overdue' ? colors.red : colors.ink2 }]}>
            {showCountdown && d.kind === 'in' ? `${tn(d.days, 'due.daysLeft')} · ${formatMonthDay(d.dueMs, locale())}` : dueText(d)} · {estimateText(step.estMinutes)}
          </Text>
        </View>
      </View>

      <SectionHeader>{t('step.why')}</SectionHeader>
      <Group padded>
        <Text style={type.paragraph}>{pick(step, 'why')}</Text>
      </Group>

      <SectionHeader>{t('step.need')}</SectionHeader>
      <Group>
        {docs.map((doc, i) => (
          <Cell key={doc} icon={ticked[`d${i}`] ? 'checkCircle' : 'circle'} iconColor={ticked[`d${i}`] ? colors.green : colors.ink4} title={doc} onPress={() => toggle(`d${i}`)} accessibilityRole="checkbox" accessibilityState={{ checked: !!ticked[`d${i}`] }} last={i === docs.length - 1} />
        ))}
      </Group>

      <SectionHeader>{t('step.how')}</SectionHeader>
      <Group>
        {how.map((h, i) => (
          <Cell
            key={h}
            leading={
              <Text style={[type.headline, tabular, { width: 22, color: ticked[`h${i}`] ? colors.green : colors.tint }]}>
                {i + 1}.
              </Text>
            }
            title={<Text style={[type.body, ticked[`h${i}`] && { color: colors.ink2 }]}>{h}</Text>}
            onPress={() => toggle(`h${i}`)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: !!ticked[`h${i}`] }}
            accessory={ticked[`h${i}`] ? 'check' : 'none'}
            last={i === how.length - 1}
          />
        ))}
      </Group>

      <SectionHeader>{t('step.resources')}</SectionHeader>
      <Group>
        <Cell icon="link" title={t('step.source')} subtitle={t('step.verifiedBy', { who: ownerLabel(step.ownerRole), date: formatMonthDay(Date.parse(`${step.lastVerified}T12:00:00Z`), locale()) })} accessory="chevron" onPress={() => void Linking.openURL(step.sourceUrl)} last={resources.length === 0} />
        {resources.map((r, i) => (
          <Cell key={r.key} icon="doc" title={pick(r, 'title')} subtitle={t('step.verifiedBy', { who: r.verifiedByName, date: formatMonthDay(Date.parse(`${r.verifiedAt}T12:00:00Z`), locale()) })} accessory="chevron" onPress={() => void Linking.openURL(r.url)} last={i === resources.length - 1} />
        ))}
      </Group>
      <SectionFooter>{t('step.resourcesFooter')}</SectionFooter>
      <View style={{ paddingHorizontal: 0, marginTop: 8 }}>
        <Button
          title={corrected ? t('step.correctionSent') : t('step.somethingWrong')}
          variant="ghost"
          small
          disabled={corrected}
          onPress={() => {
            actions.reportCorrection(step.key, 'reported from the app');
            setCorrected(true);
          }}
        />
      </View>

      <SectionHeader>{mentorsDid > 0 ? tn(mentorsDid, 'step.mentorsDid') : t('home.yourMentor')}</SectionHeader>
      <Group padded tone="tint">
        <Text style={type.subheadline}>{t('step.mentorsDidSub')}</Text>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
          <Button title={mentor && match?.state === 'active' ? t('home.askMentor') : t('home.findMentor')} small onPress={() => router.push(mentor && match?.state === 'active' ? { pathname: '/chat/[matchId]', params: { matchId: match.id } } : '/mentors')} />
          <Button title={t('step.findSomeone')} small variant="tonal" onPress={() => router.push('/mentors')} />
          <Button title={t('step.bringToCircle')} small variant="tonal" onPress={() => router.push('/circles')} />
        </View>
      </Group>
    </Screen>
  );
}

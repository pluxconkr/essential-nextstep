/**
 * S-04 Verification & badge — what separates a badge from a sticker, and what the school
 * can and cannot see, stated at the moment the student is most likely to worry about it.
 */
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Text, View } from 'react-native';

import type { VerificationPath } from '@/domain/types';
import { pick, t } from '@/i18n';
import { useAppState } from '@/store/appStore';
import { useBadgeProgress, useMyMentor, useNextStep, useStep } from '@/store/derived';
import { ContentIcon } from '@/ui/icons';
import { Button, Callout, Cell, Group, SectionHeader, Tag } from '@/ui/primitives';
import { Screen } from '@/ui/Screen';
import { StepRow } from '@/ui/step-widgets';
import { colors, type } from '@/ui/theme';

export default function VerifiedScreen() {
  const { id, path: pathParam, points: pointsParam, badges: badgesParam } = useLocalSearchParams<{ id: string; path?: string; points?: string; badges?: string }>();
  const router = useRouter();
  const row = useStep(id);
  const next = useNextStep();
  const { mentor } = useMyMentor();
  const progress = useBadgeProgress();
  const content = useAppState((s) => s.content);
  const path = (pathParam ?? row?.state.verification ?? 'self') as VerificationPath;
  const points = Number(pointsParam ?? 0);
  const earnedKeys = (badgesParam ?? '').split(',').filter(Boolean);
  const earned = progress.filter((p) => earnedKeys.includes(p.badge.key));
  const related = progress.filter((p) => !p.earned && p.badge.criteria.kind === 'steps_verified' && p.badge.criteria.stepKeys.includes(id ?? '')).slice(0, 2);

  if (!row) return null;
  const title = pick(row.step, 'title');
  const pending = row.state.status === 'pending_verification';
  const tone = path === 'self' ? 'amber' : pending ? 'tint' : 'green';
  const heading = path === 'self' ? t('verified.titleSelf') : pending ? t('verified.titlePending') : t('verified.title');

  return (
    <Screen title={t('verified.nav')} fallback="/roadmap" footer={<Button title={t('step.backToRoadmap')} variant="tonal" onPress={() => router.replace('/roadmap')} />} testID="screen-verified">
      <View style={{ height: 8 }} />
      <Callout tone={tone} icon={path === 'self' ? 'warning' : pending ? 'clock' : 'checkCircle'} title={heading}>
        {t(`verified.sub.${path}` as const, { step: title })}
      </Callout>
      {points > 0 ? <Text style={[type.footnote, { paddingHorizontal: 16, marginTop: 8 }]}>{t('verified.points', { n: points })}</Text> : null}

      <SectionHeader>{t('verified.how')}</SectionHeader>
      <Group>
        {path === 'upload' ? <Cell icon="camera" title={t('verified.evidence')} subtitle={t('verified.evidenceSub')} /> : null}
        {path === 'mentor' || path === 'upload' ? <Cell icon="checkCircle" iconColor={pending ? colors.amber : colors.green} title={t('verified.mentorConfirm')} subtitle={pending ? t('verified.mentorConfirmSub', { name: mentor?.displayName ?? '—' }) : t(`verification.${path}` as const)} /> : null}
        {path === 'staff' ? <Cell icon="shield" iconColor={pending ? colors.amber : colors.green} title={t('verification.staff')} subtitle={t('done.staffSub')} /> : null}
        {path === 'self' ? <Cell icon="warning" iconColor={colors.amber} title={t('verification.self')} subtitle={t('done.selfSub')} /> : null}
        <Cell icon="lock" title={t('verified.schoolSees')} subtitle={t('verified.schoolSeesSub')} last />
      </Group>

      {earned.length > 0 ? (
        <>
          <SectionHeader>{t('verified.badgeEarned')}</SectionHeader>
          <Group>
            {earned.map((p, i) => (
              <Cell
                key={p.badge.key}
                leading={<ContentIcon sf={p.badge.icon} size={26} color={colors.tint} />}
                title={pick(p.badge, 'name')}
                subtitle={pick(p.badge, 'description')}
                trailing={p.earned?.evidenceLevel === 'self' ? <Tag tone="amber">{t('growth.selfReported')}</Tag> : undefined}
                last={i === earned.length - 1}
              />
            ))}
          </Group>
          {earned[0].badge.unlocks.length > 0 ? (
            <>
              <SectionHeader>{t('growth.unlocks')}</SectionHeader>
              <Group>
                {earned[0].badge.unlocks.map((u, i) => (
                  <Cell key={u} icon="starFill" iconColor={colors.amber} title={<Text style={type.subheadline}>{t(`unlock.${u}` as never)}</Text>} last={i === earned[0].badge.unlocks.length - 1} />
                ))}
              </Group>
            </>
          ) : null}
        </>
      ) : related.length > 0 ? (
        <>
          <SectionHeader>{t('verified.badgeProgress')}</SectionHeader>
          <Group>
            {related.map((p, i) => (
              <Cell key={p.badge.key} leading={<ContentIcon sf={p.badge.icon} size={26} color={colors.ink4} />} title={pick(p.badge, 'name')} subtitle={pick(p.badge, 'description')} value={t('common.of', { a: p.have, b: p.need })} last={i === related.length - 1} />
            ))}
          </Group>
        </>
      ) : null}

      {next && next.step.key !== row.step.key ? (
        <>
          <SectionHeader>{t('verified.nextUnlocked')}</SectionHeader>
          <Group>
            <StepRow row={next} last onPress={() => router.replace({ pathname: '/step/[id]', params: { id: next.step.key } })} />
          </Group>
        </>
      ) : null}
      <View style={{ height: 12 }} />
      {content.steps.length > 0 ? <Button title={t('verified.tellCircle')} variant="ghost" small onPress={() => router.replace('/circles')} /> : null}
    </Screen>
  );
}

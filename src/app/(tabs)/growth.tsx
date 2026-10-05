/**
 * S-13 Growth — effort made legible without becoming a ranking. No leaderboard, no classmate
 * comparison; verified badges look different from self-reported ones, always.
 */
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { levelFor, pointsBySource, pointsByWeek, totalPoints } from '@/domain/effort';
import { formatInt } from '@/domain/format';
import { locale, pick, t, tn } from '@/i18n';
import { useAppState } from '@/store/appStore';
import { useBadgeProgress, useNow } from '@/store/derived';
import { ContentIcon } from '@/ui/icons';
import { Callout, Cell, Group, ProgressBar, SectionFooter, SectionHeader, Tag } from '@/ui/primitives';
import { HeaderIconButton, Screen } from '@/ui/Screen';
import { colors, radius, tabular, type } from '@/ui/theme';

export default function GrowthScreen() {
  const router = useRouter();
  const effort = useAppState((s) => s.effort);
  const now = useNow();
  const badges = useBadgeProgress();
  const [open, setOpen] = useState<string | null>(null);
  const points = totalPoints(effort);
  const lvl = levelFor(points);
  const sources = pointsBySource(effort);
  const weeks = pointsByWeek(effort, now);
  const max = Math.max(1, ...weeks);
  const earned = badges.filter((b) => b.earned);
  const locked = badges.filter((b) => !b.earned);
  const mentorReady = badges.find((b) => b.badge.key === 'mentor-ready');
  const away = mentorReady && !mentorReady.earned ? mentorReady.need - mentorReady.have : 0;

  return (
    <Screen largeTitle={t('growth.title')} subtitle={t('growth.subtitle', { points: formatInt(points, locale()), level: lvl.level })} headerRight={<HeaderIconButton icon="person" label={t('profile.title')} onPress={() => router.push('/profile')} />} testID="screen-growth">
      <Callout tone="tint" icon="rosette" title={t('growth.effortNotRanking')}>
        {t('growth.effortSub')}
      </Callout>

      <SectionHeader>{t('growth.sources')}</SectionHeader>
      <Group padded>
        <View style={{ gap: 12 }}>
          {sources.map((s) => (
            <ProgressBar key={s.kind} label={t(`effort.${s.kind}` as const)} done={s.points} total={Math.max(1, points)} valueText={t('effort.pts', { n: s.points })} color={s.kind === 'step_self' ? colors.amber : colors.tint} />
          ))}
        </View>
      </Group>
      <SectionFooter>{t('growth.questionsNote')}</SectionFooter>

      <SectionHeader>{t('growth.thisMonth')}</SectionHeader>
      <Group padded>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10, height: 72 }} accessible accessibilityLabel={weeks.map((w, i) => `week ${i + 1}: ${w} points`).join(', ')}>
          {weeks.map((w, i) => (
            <View key={i} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
              <Text style={[type.caption, tabular]}>{w}</Text>
              <View style={{ width: '100%', height: Math.max(3, Math.round((w / max) * 48)), backgroundColor: colors.tint, borderRadius: 3 }} />
              <Text style={type.caption}>W{i + 1}</Text>
            </View>
          ))}
        </View>
      </Group>

      <SectionHeader right={t('growth.badgesLine', { earned: earned.length, locked: locked.length })}>{t('growth.badges')}</SectionHeader>
      <View style={styles.grid}>
        {badges.map((p) => {
          const isOpen = open === p.badge.key;
          const self = p.earned?.evidenceLevel === 'self';
          return (
            <Pressable key={p.badge.key} onPress={() => setOpen(isOpen ? null : p.badge.key)} accessibilityRole="button" accessibilityState={{ expanded: isOpen }} accessibilityLabel={`${pick(p.badge, 'name')}, ${p.earned ? (self ? t('growth.selfReported') : t('verification.mentor')) : t('growth.notYet')}`} style={({ pressed }) => [styles.tile, pressed && { backgroundColor: colors.fill }]}>
              <ContentIcon sf={p.badge.icon} size={26} color={p.earned ? colors.tint : colors.ink4} />
              <Text style={[type.headline, { marginTop: 8, color: p.earned ? colors.ink : colors.ink2 }]} numberOfLines={2}>
                {pick(p.badge, 'name')}
              </Text>
              <Text style={[type.caption, { marginTop: 2 }]} numberOfLines={2}>
                {p.earned ? (self ? t('growth.selfReported') : pick(p.badge, 'description')) : `${p.have} / ${p.need}`}
              </Text>
              {self ? <Tag tone="amber">{t('growth.selfReported')}</Tag> : null}
            </Pressable>
          );
        })}
      </View>
      {open ? (
        <View style={{ marginTop: 12 }}>
          {badges.filter((p) => p.badge.key === open).map((p) => (
            <Group key={p.badge.key}>
              <Cell leading={<ContentIcon sf={p.badge.icon} size={26} color={colors.tint} />} title={pick(p.badge, 'name')} subtitle={pick(p.badge, 'description')} value={p.earned ? undefined : t('common.of', { a: p.have, b: p.need })} />
              {p.badge.unlocks.map((u, i) => (
                <Cell key={u} icon="starFill" iconColor={colors.amber} title={<Text style={type.subheadline}>{t(`unlock.${u}` as never)}</Text>} last={i === p.badge.unlocks.length - 1} />
              ))}
              {p.badge.unlocks.length === 0 ? <Cell title={t('growth.criteria')} subtitle={pick(p.badge, 'description')} last /> : null}
            </Group>
          ))}
        </View>
      ) : null}

      <SectionHeader>{t('growth.becomingMentor')}</SectionHeader>
      <Group padded>
        <Text style={type.body}>{away > 0 ? tn(away, 'growth.badgesAway') : t('growth.mentorEligible')}</Text>
        <Text style={[type.footnote, { marginTop: 6 }]}>{t('growth.becomingMentorSub')}</Text>
      </Group>
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tile: { width: '31.5%', backgroundColor: colors.surface, borderRadius: radius.group, padding: 12, minHeight: 112 },
});

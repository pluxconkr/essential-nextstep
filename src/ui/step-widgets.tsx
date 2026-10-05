/**
 * Step widgets: the home hero (one step, a countdown, a named human), roadmap rows, track progress.
 * Every date string comes from domain/format through t(); status is never colour alone.
 */
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { describeDue, dueTone, estimateDescriptor, formatMonthDay, type DueDescriptor } from '@/domain/format';
import type { RoadmapStep, StepStatus, TrackKey } from '@/domain/types';
import { locale, pick, t, tn } from '@/i18n';
import type { TrackProgress } from '@/domain/roadmap';

import { Icon } from './icons';
import { Button, Group, ProgressBar, Tag, TrackPill } from './primitives';
import { CELL_PAD, colors, tabular, track as trackColor, type } from './theme';

export function trackLabel(key: TrackKey): string {
  return t(`track.${key}` as const);
}

export function dueDescriptorFor(row: RoadmapStep): DueDescriptor {
  return describeDue({
    status: row.state.status,
    dueMs: row.state.dueAt,
    daysLeft: row.daysLeft,
    rollingWindowDays: row.step.deadline.kind === 'rolling' ? row.step.deadline.windowDays : null,
  });
}

export function dueText(d: DueDescriptor): string {
  switch (d.kind) {
    case 'done':
      return t('due.done');
    case 'overdue':
      return tn(d.days, 'due.overdue');
    case 'today':
      return t('due.today');
    case 'tomorrow':
      return t('due.tomorrow');
    case 'in':
      return t('due.in', { date: formatMonthDay(d.dueMs, locale()), days: tn(d.days, 'due.days') });
    case 'rolling':
      return t('due.rolling', { weeks: tn(Math.max(1, Math.round(d.windowDays / 7)), 'due.weeks') });
    default:
      return t('due.unknown');
  }
}

export function estimateText(minutes: number): string {
  const e = estimateDescriptor(minutes);
  return t('step.estimate', { x: e.unit === 'min' ? tn(e.n, 'common.min') : tn(e.n, 'common.hours') });
}

export function statusLabel(status: StepStatus): string {
  return t(`status.${status}` as const);
}

function toneColorFor(d: DueDescriptor): string {
  const tone = dueTone(d);
  return tone === 'overdue' ? colors.red : tone === 'soon' ? colors.amber : tone === 'done' ? colors.green : colors.ink2;
}

/** Leading node: ✓ done · › do now · ! overdue · · later. Glyph + word + colour, never colour alone. */
export function StatusNode({ row }: { row: RoadmapStep }) {
  const d = dueDescriptorFor(row);
  const s = row.state.status;
  if (s === 'done') return <Icon name="checkCircle" size={22} color={colors.green} />;
  if (s === 'pending_verification') return <Icon name="clock" size={22} color={colors.amber} />;
  if (d.kind === 'overdue') return <Icon name="warning" size={22} color={colors.red} />;
  if (s === 'locked') return <Icon name="circle" size={22} color={colors.ink4} />;
  return <Icon name="chevron" size={22} color={colors.tint} weight="semibold" />;
}

/** The ONE step on the home screen. */
export function NextStepHero({ row, mentorsDid, hasMentor, onOpen, onAsk }: { row: RoadmapStep; mentorsDid: number; hasMentor: boolean; onOpen: () => void; onAsk: () => void }) {
  const d = dueDescriptorFor(row);
  const showCountdown = d.kind === 'in' && d.days <= 30;
  return (
    <Group padded testID="next-step-hero">
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <TrackPill track={row.step.track} label={trackLabel(row.step.track)} />
        <Text style={type.footnote}>{statusLabel(row.state.status)}</Text>
        {row.step.reviewStatus === 'pending' ? <Tag tone="amber">{t('common.pendingReview')}</Tag> : null}
      </View>
      <Text style={[type.title3, { marginTop: 10 }]} accessibilityRole="header">
        {pick(row.step, 'title')}
      </Text>
      <Text style={[type.subheadline, { marginTop: 6 }]}>{firstSentence(pick(row.step, 'why'))}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10, marginTop: 12 }}>
        {showCountdown && d.kind === 'in' ? (
          <Text style={[type.countdown, tabular]} accessibilityLabel={tn(d.days, 'due.daysLeft')}>
            {d.days}
          </Text>
        ) : null}
        <View style={{ flex: 1, paddingBottom: showCountdown ? 6 : 0 }}>
          <Text style={[type.footnote, { color: toneColorFor(d) }]}>
            {showCountdown && d.kind === 'in' ? `${tn(d.days, 'due.daysLeft')} · ${formatMonthDay(d.dueMs, locale())}` : dueText(d)}
          </Text>
          {mentorsDid > 0 ? <Text style={type.footnote}>{tn(mentorsDid, 'home.mentorsDidThis')}</Text> : null}
        </View>
      </View>
      <View style={{ gap: 8, marginTop: 14 }}>
        <Button title={t('home.openStep')} onPress={onOpen} testID="open-step" />
        <Button title={hasMentor ? t('home.askMentor') : t('home.findMentor')} onPress={onAsk} variant="tonal" />
      </View>
    </Group>
  );
}

export function firstSentence(text: string): string {
  const m = /^[^.!?]+[.!?]/.exec(text);
  return m ? m[0].trim() : text;
}

/** A roadmap row inside a Group. */
export function StepRow({ row, onPress, last, testID }: { row: RoadmapStep; onPress: () => void; last?: boolean; testID?: string }) {
  const d = dueDescriptorFor(row);
  const done = row.state.status === 'done';
  return (
    <View testID={testID}>
      <View style={styles.rowOuter}>
        <View style={styles.rowNode}>
          <StatusNode row={row} />
        </View>
        <View style={[styles.rowBody, !last && styles.rowSeparator]}>
          <PressableRow onPress={onPress} label={pick(row.step, 'title')}>
            <Text style={[type.body, done && { color: colors.ink2 }]}>{pick(row.step, 'title')}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
              <TrackPill track={row.step.track} label={trackLabel(row.step.track)} />
              <Text style={[type.footnote, { color: toneColorFor(d) }]}>{dueText(d)}</Text>
              {d.kind === 'overdue' ? <Tag tone="red">{t('section.overdue')}</Tag> : null}
              {row.state.status === 'done' && row.state.verification === 'self' ? <Tag tone="amber">{t('growth.selfReported')}</Tag> : null}
            </View>
            {row.blockedBy.length > 0 && !done ? <Text style={[type.footnote, { marginTop: 2 }]}>{t('roadmap.blockedBy', { steps: row.blockedBy.length })}</Text> : null}
          </PressableRow>
          <Text style={[type.footnote, tabular, { marginLeft: 8 }]}>{estimateText(row.step.estMinutes)}</Text>
          <Icon name="chevron" size={14} color={colors.ink4} weight="semibold" style={{ marginLeft: 6 }} />
        </View>
      </View>
    </View>
  );
}

function PressableRow({ children, onPress, label }: { children: ReactNode; onPress: () => void; label: string }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={({ pressed }) => [{ flex: 1 }, pressed && { opacity: 0.6 }]}>
      {children}
    </Pressable>
  );
}

/** One bar per track the student actually has; never "0 / 0". */
export function TrackProgressList({ items }: { items: TrackProgress[] }) {
  return (
    <View style={{ gap: 12 }}>
      {items.map((p) => (
        <ProgressBar key={p.track} label={trackLabel(p.track)} done={p.done} total={p.total} color={trackColor[p.track]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  rowOuter: { flexDirection: 'row', alignItems: 'stretch', paddingLeft: CELL_PAD },
  rowNode: { width: 34, paddingTop: 13 },
  rowBody: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingVertical: 11, paddingRight: CELL_PAD, minHeight: 56 },
  rowSeparator: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
});

/**
 * S-02 Roadmap — the full path, deadline-ordered, grouped by status. The "why yours differs" card
 * tells the student the roadmap is theirs without ever naming a status.
 */
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';

import type { RoadmapStep, TrackKey } from '@/domain/types';
import { t } from '@/i18n';
import { actions, useAppState } from '@/store/appStore';
import { useRoadmap, useTrackProgress, useWhyDiffers } from '@/store/derived';
import { Button, Cell, Chips, Group, SectionFooter, SectionHeader } from '@/ui/primitives';
import { HeaderIconButton, Screen } from '@/ui/Screen';
import { dueDescriptorFor, StepRow, TrackProgressList, trackLabel } from '@/ui/step-widgets';
import { type } from '@/ui/theme';

type Filter = 'all' | TrackKey;

function groupOf(row: RoadmapStep): 'overdue' | 'doNow' | 'next' | 'later' | 'done' {
  const d = dueDescriptorFor(row);
  if (row.state.status === 'done') return 'done';
  if (d.kind === 'overdue') return 'overdue';
  if (row.state.status === 'open' || row.state.status === 'stalled') return 'doNow';
  if (row.state.status === 'pending_verification') return 'next';
  return row.blockedBy.length > 0 ? 'next' : 'later';
}

const ORDER = ['overdue', 'doNow', 'next', 'later', 'done'] as const;

export default function RoadmapScreen() {
  const router = useRouter();
  const roadmap = useRoadmap();
  const progress = useTrackProgress();
  const why = useWhyDiffers();
  const profile = useAppState((s) => s.profile);
  const [filter, setFilter] = useState<Filter>('all');
  const [rechecked, setRechecked] = useState(false);

  const options = useMemo(() => [{ value: 'all' as Filter, label: t('common.all') }, ...progress.map((p) => ({ value: p.track as Filter, label: trackLabel(p.track) }))], [progress]);
  const rows = useMemo(() => roadmap.filter((r) => filter === 'all' || r.step.track === filter), [roadmap, filter]);
  const groups = useMemo(() => ORDER.map((g) => ({ g, rows: rows.filter((r) => groupOf(r) === g) })).filter((x) => x.rows.length > 0), [rows]);
  const done = roadmap.filter((r) => r.state.status === 'done').length;

  return (
    <Screen largeTitle={t('roadmap.title')} subtitle={t('roadmap.subtitle', { done, total: roadmap.length })} headerRight={<HeaderIconButton icon="person" label={t('profile.title')} onPress={() => router.push('/profile')} />} testID="screen-roadmap">
      <Chips options={options} value={filter} onChange={setFilter} />
      <View style={{ height: 12 }} />
      <Group padded>
        <TrackProgressList items={progress} />
      </Group>
      <SectionFooter>{t('roadmap.builtFrom')}</SectionFooter>

      {groups.map(({ g, rows: list }) => (
        <View key={g}>
          <SectionHeader>{t(`section.${g}` as const)}</SectionHeader>
          <Group>
            {list.map((row, i) => (
              <StepRow
                key={row.step.key}
                row={row}
                last={i === list.length - 1}
                testID={`row-${row.step.key}`}
                onPress={() => {
                  actions.openStep(row.step.key);
                  router.push({ pathname: '/step/[id]', params: { id: row.step.key } });
                }}
              />
            ))}
          </Group>
        </View>
      ))}

      {why.length > 0 && profile ? (
        <>
          <SectionHeader>{t('roadmap.whyDiffers')}</SectionHeader>
          <Group>
            {why.map((w, i) => (
              <Cell key={i} icon="info" title={<Text style={type.subheadline}>{whyText(w)}</Text>} last={i === why.length - 1} />
            ))}
          </Group>
        </>
      ) : null}
      <View style={{ height: 16 }} />
      <Button
        title={t('roadmap.recheck')}
        variant="tonal"
        onPress={() => {
          actions.recheckRoadmap();
          setRechecked(true);
        }}
      />
      {rechecked ? <SectionFooter>{t('roadmap.rechecked')}</SectionFooter> : null}
      <View style={{ height: 8 }} />
      <Button title={t('why.roadmapTitle')} variant="ghost" onPress={() => router.push('/why/roadmap')} />
    </Screen>
  );
}

function whyText(w: ReturnType<typeof useWhyDiffers>[number]): string {
  switch (w.kind) {
    case 'aidPath':
      return t(`roadmap.why.aidPath.${w.aidPath}` as const);
    case 'elStatus':
      return t('roadmap.why.elStatus');
    case 'languageTrack':
      return t('roadmap.why.languageTrack');
    case 'exploration':
      return t('roadmap.why.exploration');
    case 'core':
      return t('roadmap.why.core');
  }
}

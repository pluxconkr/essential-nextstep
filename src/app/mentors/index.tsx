/** S-05 Mentor discovery — filters that matter, cards with verified-step counts, fit as a word. */
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { t } from '@/i18n';
import { useAppState } from '@/store/appStore';
import { useCircles, useMentors, useRoadmap } from '@/store/derived';
import { fitFor, matchStudentFrom, MatchExplain, MentorCard } from '@/ui/mentor-widgets';
import { Chips, Empty, Group, SectionFooter, SectionHeader } from '@/ui/primitives';
import { HeaderIconButton, Screen } from '@/ui/Screen';

type Filter = 'all' | 'es' | 'vi' | 'ar' | 'school' | 'cc' | 'available';

export default function MentorsScreen() {
  const router = useRouter();
  const profile = useAppState((s) => s.profile);
  const mentors = useMentors();
  const roadmap = useRoadmap();
  const circles = useCircles();
  const [filter, setFilter] = useState<Filter>('all');
  const student = useMemo(() => (profile ? matchStudentFrom(profile, roadmap.filter((r) => r.state.status === 'open' || r.state.status === 'stalled').slice(0, 3).map((r) => r.step.key), circles.filter((c) => c.mine).map((c) => c.id)) : null), [profile, roadmap, circles]);
  const list = useMemo(() => {
    if (!student) return [];
    return mentors
      .filter((m) => {
        if (filter === 'all') return true;
        if (filter === 'school') return m.schoolOfOriginId === student.schoolId;
        if (filter === 'cc') return m.pathTags.includes('cc_transfer');
        if (filter === 'available') return m.load < m.capacity;
        return m.languages.includes(filter);
      })
      .map((m) => ({ m, fit: fitFor(student, m) }))
      .sort((a, b) => b.fit.score - a.fit.score);
  }, [mentors, student, filter]);

  const options: { value: Filter; label: string }[] = [
    { value: 'all', label: t('common.all') },
    { value: 'es', label: 'Español' },
    { value: 'vi', label: 'Tiếng Việt' },
    { value: 'ar', label: 'العربية' },
    { value: 'school', label: profile?.schoolName ?? '' },
    { value: 'cc', label: 'CC transfer' },
    { value: 'available', label: t('mentors.fit.good').split(' ')[0] === 'Good' ? 'Available' : 'Con cupo' },
  ];

  return (
    <Screen title={t('mentors.title')} largeTitle={t('mentors.title')} subtitle={t('mentors.subtitle')} fallback="/mentor" headerRight={<HeaderIconButton icon="shield" label={t('safety.title')} onPress={() => router.push('/safety')} />} testID="screen-mentors">
      <Chips options={options} value={filter} onChange={setFilter} />
      <View style={{ height: 12 }} />
      {list.length === 0 ? (
        <Empty icon="mentor" title={t('home.noMentorTitle')} subtitle={mentors.length === 0 ? t('mentors.comingM2') : t('home.noMentorSub')} />
      ) : (
        <Group>
          {list.map(({ m, fit }, i) => (
            <MentorCard key={m.id} mentor={m} fit={fit.score} onPress={() => router.push({ pathname: '/mentor/[id]', params: { id: m.id } })} last={i === list.length - 1} />
          ))}
        </Group>
      )}
      <SectionFooter>{t('mentors.howMatchingSub')}</SectionFooter>
      <SectionHeader>{t('mentors.howMatching')}</SectionHeader>
      <MatchExplain termsValue={list[0]?.fit.terms} />
    </Screen>
  );
}

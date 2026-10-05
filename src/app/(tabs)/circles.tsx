/**
 * S-08 Circles — same place, same weekday, mentor present. Logistics are content: bus route,
 * snacks, whether siblings can come decide attendance more than anything on screen.
 */
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { t, tn } from '@/i18n';
import { actions, useAppState } from '@/store/appStore';
import { useCircles } from '@/store/derived';
import { CircleCard, VenueMap } from '@/ui/circle-widgets';
import { Button, Callout, Chips, Empty, SectionFooter, SectionHeader } from '@/ui/primitives';
import { Screen } from '@/ui/Screen';

type Filter = 'all' | 'es' | 'vi' | 'ar' | 'weekend' | 'siblings' | 'campus';

export default function CirclesTab() {
  const router = useRouter();
  const circles = useCircles();
  const rsvps = useAppState((s) => s.rsvps);
  const profile = useAppState((s) => s.profile);
  const [filter, setFilter] = useState<Filter>('all');
  const list = useMemo(
    () =>
      circles.filter((c) => {
        if (filter === 'all') return true;
        if (filter === 'weekend') return c.weekday === 0 || c.weekday === 6;
        if (filter === 'siblings') return c.siblingsOk;
        if (filter === 'campus') return c.onCampus;
        return c.languages.includes(filter);
      }),
    [circles, filter],
  );
  const mine = circles.find((c) => c.mine);

  return (
    <Screen largeTitle={t('circles.title')} subtitle={circles.length ? tn(circles.length, 'circles.subtitle') : undefined} testID="screen-circles">
      <Callout tone="tint" icon="circles">
        {t('circles.blurb')}
      </Callout>
      <View style={{ height: 12 }} />
      <Chips
        options={[
          { value: 'all', label: t('common.all') },
          { value: 'es', label: 'Español' },
          { value: 'vi', label: 'Tiếng Việt' },
          { value: 'ar', label: 'العربية' },
          { value: 'weekend', label: t('tab.next') === 'Next' ? 'Weekends' : 'Fines de semana' },
          { value: 'siblings', label: t('tab.next') === 'Next' ? 'Siblings ok' : 'Con hermanos' },
          { value: 'campus', label: t('tab.next') === 'Next' ? 'On campus' : 'En la escuela' },
        ]}
        value={filter}
        onChange={setFilter}
      />
      <View style={{ height: 12 }} />
      {list.length === 0 ? (
        <Empty icon="circles" title={t('circles.title')} subtitle={circles.length === 0 ? t('circles.comingM3') : t('circles.request')} />
      ) : (
        <>
          <VenueMap circles={list} schoolLabel={profile?.schoolName ?? ''} onPick={(id) => router.push({ pathname: '/circle/[id]', params: { id } })} />
          <View style={{ height: 12, }} />
          <View style={{ gap: 12 }}>
            {list.map((c) => (
              <CircleCard key={c.id} circle={c} going={rsvps[c.id] ?? c.mine} onGoing={() => actions.rsvp(c.id, true)} onPress={() => router.push({ pathname: '/circle/[id]', params: { id: c.id } })} />
            ))}
          </View>
        </>
      )}
      <SectionHeader>{t('circles.request')}</SectionHeader>
      <Button title={t('circles.request')} variant="tonal" icon="plus" onPress={() => router.push('/circles/request')} />
      <SectionFooter>{mine ? `${t('circles.yours')}: ${mine.venueName}` : t('home.noMentorSub')}</SectionFooter>
    </Screen>
  );
}

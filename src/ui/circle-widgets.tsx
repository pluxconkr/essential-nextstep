/**
 * Circle widgets: the card (weekday, venue, lead mentor, logistics) and a schematic venue map —
 * streets as lines, the school as a block, pins on a 0–100 grid from content. No GPS, no tiles.
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle as SvgCircle, Line, Rect, Text as SvgText } from 'react-native-svg';

import type { Circle } from '@/domain/types';
import { locale, t, tn } from '@/i18n';

import { Button, Group, Tag } from './primitives';
import { colors, mapColors, radius, type } from './theme';

export function weekdayShort(d: number): string {
  const base = new Date(Date.UTC(2027, 1, 7 + d));
  return new Intl.DateTimeFormat(locale() === 'es' ? 'es-US' : 'en-US', { weekday: 'long', timeZone: 'UTC' }).format(base).replace(/^./, (c) => c.toUpperCase());
}

export function timeRange(c: Circle): string {
  const f = (hm: string) => {
    const [h, m] = hm.split(':').map(Number);
    return new Intl.DateTimeFormat(locale() === 'es' ? 'es-US' : 'en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'UTC' }).format(new Date(Date.UTC(2027, 0, 1, h, m)));
  };
  return `${f(c.startTime)}–${f(c.endTime)}`;
}

export function CircleCard({ circle, onPress, onGoing, going }: { circle: Circle; onPress: () => void; onGoing?: () => void; going?: boolean }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${circle.venueName}, ${weekdayShort(circle.weekday)} ${timeRange(circle)}`} style={({ pressed }) => [pressed && { opacity: 0.7 }]}>
      <Group padded>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <Tag tone="tint" filled>{`${weekdayShort(circle.weekday)} ${timeRange(circle)}`}</Tag>
          {going ?? circle.mine ? <Tag tone="green">{t('circles.yours')}</Tag> : null}
          <Text style={[type.footnote, { marginLeft: 'auto' }]}>{tn(circle.weeksRunning, 'circles.weeksRunning')}</Text>
        </View>
        <Text style={[type.headline, { marginTop: 8 }]}>{circle.venueName}</Text>
        <Text style={[type.footnote, { marginTop: 2 }]}>
          {t('circles.ledBy', { name: circle.leadMentorName })} · {circle.languages.map((l) => l.toUpperCase()).join('/')} · {t('circles.going', { joined: circle.joined, cap: circle.capacity })}
        </Text>
        <Text style={[type.footnote, { marginTop: 2 }]}>
          {circle.siblingsOk ? t('circles.siblingsOk') : t('circles.siblingsNo')} · {circle.foodNote}
        </Text>
        {onGoing ? (
          <View style={{ marginTop: 10 }}>
            <Button title={going ? t('circles.onList') : t('home.imGoing')} small variant={going ? 'secondary' : 'tonal'} onPress={onGoing} disabled={going} />
          </View>
        ) : null}
      </Group>
    </Pressable>
  );
}

/** Schematic map: not geography, a sketch so a nervous first-timer sees "near the school, by the library". */
export function VenueMap({ circles, onPick, schoolLabel }: { circles: Circle[]; onPick: (id: string) => void; schoolLabel: string }) {
  const W = 100;
  const H = 62;
  return (
    <View style={styles.map} accessible accessibilityLabel={circles.map((c) => c.venueName).join(', ')}>
      <Svg viewBox={`0 0 ${W} ${H}`} width="100%" height={200}>
        <Rect x={0} y={0} width={W} height={H} fill={mapColors.ground} />
        <Rect x={6} y={44} width={24} height={12} rx={2} fill={mapColors.park} />
        <Rect x={50} y={12} width={18} height={9} rx={1.5} fill={mapColors.school} />
        <Line x1={0} y1={22} x2={W} y2={22} stroke={mapColors.road} strokeWidth={3} />
        <Line x1={0} y1={40} x2={W} y2={40} stroke={mapColors.road} strokeWidth={2.4} />
        <Line x1={30} y1={0} x2={30} y2={H} stroke={mapColors.road} strokeWidth={3} />
        <Line x1={66} y1={0} x2={66} y2={H} stroke={mapColors.road} strokeWidth={2.4} />
        <SvgText x={52} y={18.5} fontSize={type.mapLabel.fontSize} fontWeight={type.mapLabel.fontWeight} fill={colors.ink2}>
          {schoolLabel}
        </SvgText>
        <SvgText x={7} y={50} fontSize={type.mapLabel.fontSize} fontWeight={type.mapLabel.fontWeight} fill={colors.ink2}>
          Park
        </SvgText>
        {circles.map((c) => {
          const x = (c.mapX / 100) * W;
          const y = (c.mapY / 100) * H;
          return (
            <SvgCircle key={c.id} cx={x} cy={y} r={c.mine ? 4.2 : 3.4} fill={c.mine ? colors.tint : colors.ink2} stroke={mapColors.pinStroke} strokeWidth={1.2} onPress={() => onPick(c.id)} />
          );
        })}
      </Svg>
      <View style={styles.legend}>
        <View style={[styles.dot, { backgroundColor: colors.tint }]} />
        <Text style={type.legend}>{t('circles.yours')}</Text>
        <View style={[styles.dot, { backgroundColor: colors.ink2, marginLeft: 12 }]} />
        <Text style={type.legend}>{t('circles.title')}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  map: { backgroundColor: colors.surface, borderRadius: radius.group, overflow: 'hidden' },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
});

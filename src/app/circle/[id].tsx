/**
 * S-09 Circle detail — everything a nervous first-timer needs: what happens, who leads it, how to
 * get there, whether a little brother can come. Check-in with the lead mentor's code earns points.
 */
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { localParts, nowMs } from '@/domain/time';
import { pick, t } from '@/i18n';
import { actions, useAppState } from '@/store/appStore';
import { useCircles, useDemoActive } from '@/store/derived';
import { timeRange, weekdayShort } from '@/ui/circle-widgets';
import { Button, Callout, Field, Group, InitialsAvatar, KeyValue, SectionFooter, SectionHeader, Tag } from '@/ui/primitives';
import { HeaderIconButton, Screen } from '@/ui/Screen';
import { colors, type } from '@/ui/theme';

/** Demo-only: the code the lead mentor shows in the room. The server issues real session codes. */
const DEMO_CODE = '482913';

export default function CircleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const circle = useCircles().find((c) => c.id === id) ?? null;
  const rsvps = useAppState((s) => s.rsvps);
  const attendance = useAppState((s) => s.attendance);
  const demo = useDemoActive();
  const [code, setCode] = useState('');
  const [checked, setChecked] = useState(false);
  const [wrong, setWrong] = useState(false);

  if (!circle) return null;
  const going = rsvps[circle.id] ?? circle.mine;
  const isToday = localParts(nowMs()).weekday === circle.weekday;
  const en = t('tab.next') === 'Next';

  const checkIn = () => {
    if (!demo || code.trim() !== DEMO_CODE) {
      setWrong(true);
      return;
    }
    actions.addEffort('circle_attended', circle.id);
    actions.setAttendance({ attended: attendance.attended + 1, of: attendance.of + 1 });
    setChecked(true);
  };

  return (
    <Screen
      title={t('circles.title')}
      fallback="/circles"
      headerRight={<HeaderIconButton icon="flag" label={t('safety.report')} onPress={() => router.push('/safety')} />}
      footer={
        <>
          <Button title={going ? t('circles.onList') : `${t('home.imGoing')} · ${weekdayShort(circle.weekday)}`} disabled={going} onPress={() => actions.rsvp(circle.id, true)} testID="rsvp" />
          <Button title={t('home.otherCircles')} variant="ghost" small onPress={() => router.replace('/circles')} />
        </>
      }
      testID="screen-circle">
      <View style={{ height: 8 }} />
      <Group padded>
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          <Tag tone="tint" filled>{`${weekdayShort(circle.weekday)} · ${timeRange(circle)}`}</Tag>
          {going ? <Tag tone="green">{t('circles.yours')}</Tag> : null}
        </View>
        <Text style={[type.title3, { marginTop: 8 }]} accessibilityRole="header">
          {circle.venueName}
        </Text>
        <Text style={[type.footnote, { marginTop: 2 }]}>
          {t('circles.ledBy', { name: circle.leadMentorName })} · {circle.languages.map((l) => l.toUpperCase()).join('/')}
        </Text>
      </Group>

      <SectionHeader>{en ? 'What happens here' : 'Qué pasa aquí'}</SectionHeader>
      <Group padded>
        <Text style={type.body}>{pick(circle, 'what')}</Text>
      </Group>

      <SectionHeader>{en ? 'Practical' : 'Práctico'}</SectionHeader>
      <Group padded>
        <KeyValue
          rows={[
            { label: en ? 'Getting there' : 'Cómo llegar', value: circle.transitNote },
            { label: en ? 'Food' : 'Comida', value: circle.foodNote },
            { label: en ? 'Siblings' : 'Hermanos', value: circle.siblingsOk ? t('circles.siblingsOk') : t('circles.siblingsNo') },
            { label: en ? 'Language' : 'Idioma', value: circle.languages.map((l) => l.toUpperCase()).join(' / ') },
            { label: en ? 'Space' : 'Cupo', value: `${circle.joined} / ${circle.capacity}` },
            { label: en ? 'Adult present' : 'Adulto presente', value: en ? 'Yes — required for every circle' : 'Sí, obligatorio en cada círculo' },
          ]}
        />
      </Group>
      <SectionFooter>{en ? 'Bring your next step and whatever it needs. You do not have to talk to anyone to belong here.' : 'Trae tu siguiente paso y lo que necesite. No tienes que hablar con nadie para pertenecer aquí.'}</SectionFooter>

      <SectionHeader>{en ? 'Who else is coming' : 'Quién más viene'}</SectionHeader>
      <Group padded>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ flexDirection: 'row' }}>
            {['A', 'S', 'J', 'M'].map((i, k) => (
              <View key={i} style={{ marginLeft: k === 0 ? 0 : -8 }}>
                <InitialsAvatar initials={i} size={32} color={colors.ink2} />
              </View>
            ))}
          </View>
          <Text style={type.footnote}>{t('circles.going', { joined: circle.joined, cap: circle.capacity })}</Text>
        </View>
        <Text style={[type.footnote, { marginTop: 8 }]}>{t('safety.rule4')}</Text>
      </Group>

      {going ? (
        <>
          <SectionHeader>{en ? 'Check in' : 'Registrarse'}</SectionHeader>
          {checked ? (
            <Callout tone="green" icon="checkCircle" title={en ? 'Checked in' : 'Registrado'}>
              {t('verified.points', { n: 25 })}
            </Callout>
          ) : (
            <Group padded>
              <Text style={type.subheadline}>{isToday ? (en ? 'Enter the 6-digit code the lead mentor shows in the room.' : 'Escribe el código de 6 dígitos que muestra el mentor líder en el salón.') : en ? 'Check-in opens on the day of the circle.' : 'El registro se abre el día del círculo.'}</Text>
              <View style={{ marginTop: 10, gap: 8 }}>
                <Field value={code} onChangeText={(v) => { setCode(v.replace(/\D/g, '').slice(0, 6)); setWrong(false); }} keyboardType="number-pad" placeholder="000000" style={[type.code, { textAlign: 'center' }]} editable={isToday} />
                <Button title={en ? 'Check in' : 'Registrarme'} variant="tonal" disabled={!isToday || code.length !== 6} onPress={checkIn} haptic="success" />
                {wrong ? <Text style={[type.footnote, { color: colors.red }]}>{en ? 'That code does not match today’s session. Ask the lead mentor.' : 'Ese código no coincide con la sesión de hoy. Pregunta al mentor líder.'}</Text> : null}
              </View>
            </Group>
          )}
        </>
      ) : null}
    </Screen>
  );
}

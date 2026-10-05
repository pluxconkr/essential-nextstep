/** Ask for a circle in my area — routes to the coordinator, who needs a mentor and a venue. */
import { useState } from 'react';
import { Text, View } from 'react-native';

import { t } from '@/i18n';
import { Button, Callout, Cell, Field, Group, SectionFooter, SectionHeader } from '@/ui/primitives';
import { Screen } from '@/ui/Screen';
import { type } from '@/ui/theme';

import { weekdayShort } from '@/ui/circle-widgets';

export default function CircleRequestScreen() {
  const en = t('tab.next') === 'Next';
  const [area, setArea] = useState('');
  const [days, setDays] = useState<number[]>([]);
  const [sent, setSent] = useState(false);
  const toggle = (d: number) => setDays((v) => (v.includes(d) ? v.filter((x) => x !== d) : [...v, d]));

  return (
    <Screen title={t('circles.request')} largeTitle={t('circles.request')} fallback="/circles" footer={<Button title={sent ? t('family.requestSent') : t('common.continue')} disabled={sent || area.trim().length < 3 || days.length === 0} onPress={() => setSent(true)} />}>
      {sent ? (
        <Callout tone="green" icon="checkCircle">
          {en ? 'Sent to the coordinator. A circle needs a mentor and a venue; you will hear back in the app.' : 'Enviado al coordinador. Un círculo necesita un mentor y un lugar; te avisaremos en la app.'}
        </Callout>
      ) : null}
      <SectionHeader>{en ? 'Where' : 'Dónde'}</SectionHeader>
      <Group padded>
        <Field value={area} onChangeText={setArea} placeholder={en ? 'Neighbourhood, library or school' : 'Colonia, biblioteca o escuela'} />
      </Group>
      <SectionHeader>{en ? 'Which days work' : 'Qué días te sirven'}</SectionHeader>
      <Group>
        {[1, 2, 3, 4, 5, 6].map((d, i) => (
          <Cell key={d} title={weekdayShort(d)} accessory={days.includes(d) ? 'check' : 'none'} onPress={() => toggle(d)} accessibilityRole="checkbox" accessibilityState={{ checked: days.includes(d) }} last={i === 5} />
        ))}
      </Group>
      <SectionFooter>
        <Text style={type.footnote}>{en ? 'The coordinator sees requests by area and weekday, and recruits a mentor against them.' : 'El coordinador ve las solicitudes por zona y día, y busca un mentor para ellas.'}</Text>
      </SectionFooter>
      <View style={{ height: 8 }} />
    </Screen>
  );
}

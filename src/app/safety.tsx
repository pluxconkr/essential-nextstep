/**
 * S-15 Safety & privacy — the product's licence to operate with minors and immigrant families.
 * Report / Block actions arrive with mentors (M2); the rules and the data stance are here from day one.
 */
import { Text, View } from 'react-native';

import { t } from '@/i18n';
import { useAppState } from '@/store/appStore';
import { Button, Cell, Group, SectionFooter, SectionHeader } from '@/ui/primitives';
import { Screen } from '@/ui/Screen';
import { colors, type } from '@/ui/theme';

export default function SafetyScreen() {
  const hasMatch = useAppState((s) => s.matches.some((m) => m.state === 'active'));
  return (
    <Screen title={t('safety.title')} largeTitle={t('safety.title')} subtitle={t('safety.subtitle')} fallback="/" testID="screen-safety">
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Button title={t('safety.report')} variant="red" icon="flag" disabled={!hasMatch} onPress={() => {}} style={{ flex: 1 }} />
        <Button title={t('safety.block')} variant="red" icon="block" disabled={!hasMatch} onPress={() => {}} style={{ flex: 1 }} />
      </View>
      <SectionFooter>{hasMatch ? t('safety.twoTapsSub') : t('safety.comingM2')}</SectionFooter>

      <SectionHeader>{t('safety.twoTaps')}</SectionHeader>
      <Group padded>
        <Text style={type.subheadline}>{t('safety.twoTapsSub')}</Text>
      </Group>

      <SectionHeader>{t('safety.after')}</SectionHeader>
      <Group>
        {[1, 2, 3, 4].map((n, i) => (
          <Cell
            key={n}
            leading={
              <Text style={[type.headline, { width: 22, color: colors.tint }]}>{n}</Text>
            }
            title={t(`safety.after${n}` as never)}
            subtitle={t(`safety.after${n}Sub` as never)}
            last={i === 3}
          />
        ))}
      </Group>

      <SectionHeader>{t('safety.rules')}</SectionHeader>
      <Group>
        {[1, 2, 3, 4, 5].map((n, i) => (
          <Cell key={n} icon="shield" title={<Text style={type.subheadline}>{t(`safety.rule${n}` as never)}</Text>} last={i === 4} />
        ))}
      </Group>

      <SectionHeader>{t('safety.immigration')}</SectionHeader>
      <Group>
        {[1, 2, 3, 4, 5].map((n, i) => (
          <Cell key={n} icon="lock" title={<Text style={type.subheadline}>{t(`safety.imm${n}` as never)}</Text>} last={i === 4} />
        ))}
      </Group>
      <SectionFooter>{t('safety.footer')}</SectionFooter>
    </Screen>
  );
}

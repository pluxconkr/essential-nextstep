/**
 * S-12 Offline data — what is saved on this phone and when, the queue of writes waiting to send,
 * demo scenarios (labelled), "simulate no signal", reset.
 */
import { useRouter } from 'expo-router';
import { Alert, Platform, Text, View } from 'react-native';

import type { DemoScenario } from '@/data/repos';
import { t } from '@/i18n';
import { applyDemoScenario } from '@/services/demo';
import { actions, useAppState } from '@/store/appStore';
import { Button, Cell, Group, SectionFooter, SectionHeader, Toggle } from '@/ui/primitives';
import { Screen } from '@/ui/Screen';
import { colors, type } from '@/ui/theme';

const SCENARIOS: DemoScenario[] = ['none', 'spring', 'deadline-week', 'verified'];

export default function DataScreen() {
  const router = useRouter();
  const content = useAppState((s) => s.content);
  const source = useAppState((s) => s.contentSource);
  const progress = useAppState((s) => s.progress);
  const mutations = useAppState((s) => s.mutations);
  const settings = useAppState((s) => s.settings);
  const notice = useAppState((s) => s.storageNotice);

  const reset = () => {
    const doIt = () => {
      actions.resetAll();
      router.replace('/onboarding');
    };
    if (Platform.OS === 'web') doIt();
    else Alert.alert(t('data.reset'), t('data.resetConfirm'), [{ text: t('common.cancel'), style: 'cancel' }, { text: t('data.reset'), style: 'destructive', onPress: doIt }]);
  };

  return (
    <Screen title={t('data.title')} largeTitle={t('data.title')} subtitle={t('data.subtitle')} fallback="/" testID="screen-data">
      {notice ? (
        <Group padded tone="amber">
          <Text style={type.subheadline}>{t('data.storageNotice', { what: notice.dropped.join(', ') })}</Text>
          <View style={{ marginTop: 8 }}>
            <Button title={t('common.done')} small variant="tonal" onPress={() => actions.clearStorageNotice()} />
          </View>
        </Group>
      ) : null}
      <SectionHeader>{t('data.title')}</SectionHeader>
      <Group>
        <Cell icon="doc" title={t('data.content')} subtitle={`${content.steps.length} steps · ${source === 'bundle' ? t('data.contentBundled') : 'downloaded'}`} value={t('data.contentVersion', { v: content.version })} />
        <Cell icon="roadmap" title={t('data.roadmap')} subtitle={`${progress.length} rows`} last />
      </Group>

      <SectionHeader>{t('data.queued')}</SectionHeader>
      <Group>
        {mutations.length === 0 ? (
          <Cell icon="checkCircle" iconColor={colors.green} title={t('data.queuedNone')} last />
        ) : (
          mutations.map((m, i) => <Cell key={m.id} icon={m.status === 'failed' ? 'warning' : 'clock'} iconColor={m.status === 'failed' ? colors.red : colors.amber} title={m.kind} subtitle={m.failReason ?? t('queued.sendsWhenOnline')} last={i === mutations.length - 1} />)
        )}
      </Group>

      <SectionHeader>{t('data.demo')}</SectionHeader>
      <Group>
        {SCENARIOS.map((s, i) => (
          <Cell key={s} title={t(`data.demo.${s}` as const)} accessory={settings.demoScenario === s ? 'check' : 'none'} onPress={() => applyDemoScenario(s)} accessibilityRole="radio" accessibilityState={{ selected: settings.demoScenario === s }} testID={`demo-${s}`} last={i === SCENARIOS.length - 1} />
        ))}
      </Group>
      <SectionFooter>{t('data.demoSub')}</SectionFooter>
      <Group style={{ marginTop: 12 }}>
        <Cell title={t('data.simulateOffline')} trailing={<Toggle value={settings.simulateOffline} onChange={(v) => actions.patchSettings({ simulateOffline: v })} label={t('data.simulateOffline')} />} last />
      </Group>

      <View style={{ height: 24 }} />
      <Button title={t('data.reset')} variant="red" onPress={reset} />
    </Screen>
  );
}

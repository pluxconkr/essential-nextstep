/**
 * Screen scaffolds in the iOS idiom.
 *  - OFFLINE banner: never hidden while offline.
 *  - Tab screens: large title with a one-line status under it (and the demo note when a scenario is on).
 *  - Sub screens: compact nav bar with back chevron; optional large title below.
 */
import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { relativeAgo } from '@/domain/time';
import { t, tn } from '@/i18n';
import { demoFrameLabel } from '@/services/demo';
import { isOfflineNow, useAppState } from '@/store/appStore';
import { useRealNow } from '@/store/derived';

import { Icon } from './icons';
import { GUTTER, MIN_TAP, colors, type } from './theme';

type Router = ReturnType<typeof useRouter>;
export type Fallback = '/' | '/roadmap' | '/mentor' | '/circles' | '/growth';

/** Go back if there is history; otherwise replace with a sensible fallback (deep links, tests). */
export function goBackOr(router: Router, fallback: Fallback = '/') {
  if (router.canGoBack()) router.back();
  else router.replace(fallback);
}

export function OfflineBanner() {
  const offline = useAppState((s) => isOfflineNow(s));
  const simulated = useAppState((s) => s.settings.simulateOffline);
  if (!offline) return null;
  return (
    <View style={styles.offline} accessibilityRole="alert" accessibilityLiveRegion="polite">
      <Icon name="offline" size={14} color={colors.offlineText} weight="semibold" />
      <Text maxFontSizeMultiplier={1.4} style={styles.offlineText}>
        {t('offline.banner')}
        {simulated ? t('offline.simulated') : ''}
      </Text>
    </View>
  );
}

export function agoText(thenMs: number, now: number): string {
  const r = relativeAgo(thenMs, now);
  if (r.unit === 'now') return t('ago.now');
  if (r.unit === 'min') return tn(r.n, 'ago.min');
  if (r.unit === 'h') return tn(r.n, 'ago.h');
  return tn(r.n, 'ago.d');
}

/** One-line status under a tab title: offline, or when the content was last checked. */
export function StatusLine() {
  const offline = useAppState((s) => isOfflineNow(s));
  const checked = useAppState((s) => s.cacheMeta.content?.fetchedAt ?? null);
  const source = useAppState((s) => s.contentSource);
  const realNow = useRealNow();
  const text = offline ? t('status.offline') : checked ? t('status.checked', { ago: agoText(checked, realNow) }) : source === 'bundle' ? t('data.contentBundled') : t('status.notYet');
  return (
    <Text style={styles.status} accessibilityLiveRegion="polite">
      {text}
    </Text>
  );
}

/** "Demo · clock set to Fri 7 Feb 4:12 PM" — the only visual change a demo scenario makes to a screen. */
export function DemoNote() {
  const scenario = useAppState((s) => s.settings.demoScenario);
  const label = demoFrameLabel(scenario);
  if (!label) return null;
  return <Text style={styles.status}>{t('common.demoNote', { when: label })}</Text>;
}

export function BackHeader({ title, right, fallback = '/' }: { title: string; right?: ReactNode; fallback?: Fallback }) {
  const router = useRouter();
  return (
    <View style={styles.navBar}>
      <Pressable onPress={() => goBackOr(router, fallback)} accessibilityRole="button" accessibilityLabel={t('common.back')} hitSlop={8} style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.5 }]}>
        <Icon name="back" size={22} color={colors.tint} weight="semibold" />
        <Text maxFontSizeMultiplier={1.3} style={styles.backText}>
          {t('common.back')}
        </Text>
      </Pressable>
      <Text maxFontSizeMultiplier={1.3} style={styles.navTitle} numberOfLines={1}>
        {title}
      </Text>
      <View style={styles.navRight}>{right}</View>
    </View>
  );
}

export function HeaderIconButton({ icon, label, onPress, testID }: { icon: Parameters<typeof Icon>[0]['name']; label: string; onPress: () => void; testID?: string }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} hitSlop={8} testID={testID} style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.5 }]}>
      <Icon name={icon} size={24} color={colors.tint} />
    </Pressable>
  );
}

export function Screen({
  children,
  title,
  largeTitle,
  subtitle,
  status,
  demo = true,
  header,
  headerRight,
  footer,
  contentStyle,
  padded = true,
  scroll = true,
  testID,
  fallback,
  onRefresh,
  refreshing = false,
}: {
  children: ReactNode;
  /** Sub-screen nav bar title (renders a back button). */
  title?: string;
  /** Large page title (tab screens or sub-screens). */
  largeTitle?: string;
  subtitle?: string;
  /** Show the content status line under the large title. */
  status?: boolean;
  /** Show the demo note under the large title when a scenario is on (default on). */
  demo?: boolean;
  /** Full-bleed element rendered above the body. */
  header?: ReactNode;
  headerRight?: ReactNode;
  /** Pinned bottom bar (CTA). */
  footer?: ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
  padded?: boolean;
  scroll?: boolean;
  testID?: string;
  fallback?: Fallback;
  onRefresh?: () => void;
  refreshing?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const pageHeader = largeTitle ? (
    <View style={[styles.pageHeader, !title && { paddingTop: 8 }]}>
      <View style={{ flex: 1 }}>
        <Text maxFontSizeMultiplier={1.5} style={type.largeTitle} accessibilityRole="header">
          {largeTitle}
        </Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        {demo ? <DemoNote /> : null}
        {status ? <StatusLine /> : null}
      </View>
      {headerRight ? <View style={{ paddingBottom: 6 }}>{headerRight}</View> : null}
    </View>
  ) : null;
  const body = <View style={[padded && styles.padded, contentStyle]}>{children}</View>;
  return (
    <View style={[styles.root, { paddingTop: insets.top }]} testID={testID}>
      <OfflineBanner />
      {title ? <BackHeader title={largeTitle === title ? '' : title} fallback={fallback} right={!largeTitle ? headerRight : undefined} /> : null}
      {scroll ? (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={{ paddingBottom: insets.bottom + (footer ? 110 : 32) }}
          keyboardShouldPersistTaps="handled"
          contentInsetAdjustmentBehavior="never"
          refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.ink2} /> : undefined}>
          {header}
          {pageHeader}
          {body}
        </ScrollView>
      ) : (
        <View style={styles.scroll}>
          {header}
          {pageHeader}
          {body}
        </View>
      )}
      {footer ? <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>{footer}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  scroll: { flex: 1 },
  padded: { paddingHorizontal: GUTTER },
  offline: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: colors.offlineBar, paddingVertical: 7, paddingHorizontal: 12 },
  offlineText: { ...type.caption, color: colors.offlineText, fontWeight: type.headline.fontWeight },
  pageHeader: { flexDirection: 'row', alignItems: 'flex-end', gap: 12, paddingHorizontal: GUTTER, paddingTop: 2, paddingBottom: 8 },
  subtitle: { ...type.subheadline, marginTop: 4 },
  status: { ...type.footnote, marginTop: 3 },
  navBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, minHeight: MIN_TAP },
  backBtn: { flexDirection: 'row', alignItems: 'center', minHeight: MIN_TAP, paddingRight: 8, minWidth: 84, gap: 2 },
  backText: { ...type.body, color: colors.tint },
  navTitle: { flex: 1, textAlign: 'center', ...type.headline },
  navRight: { minWidth: 84, alignItems: 'flex-end', paddingRight: 8, flexDirection: 'row', justifyContent: 'flex-end' },
  iconBtn: { minWidth: MIN_TAP, minHeight: MIN_TAP, alignItems: 'center', justifyContent: 'center' },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: GUTTER, paddingTop: 12, backgroundColor: colors.bg, gap: 8 },
});

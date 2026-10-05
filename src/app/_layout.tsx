import { getLocales } from 'expo-localization';
import { DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';
import { Platform, useWindowDimensions } from 'react-native';

import { setLocale } from '@/i18n';
import { restoreDemoScenario } from '@/services/demo';
import { startNetworkWatch } from '@/services/network';
import { hydrate, useAppState } from '@/store/appStore';
import { colors } from '@/ui/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

// Device language first (iOS per-app language setting respected), then synchronous hydration. No network, no waiting.
try {
  setLocale(getLocales()[0]?.languageTag);
} catch {
  /* stays English */
}
hydrate();
restoreDemoScenario();

export const unstable_settings = {
  anchor: '(tabs)',
};

const theme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: colors.bg, card: colors.surface, primary: colors.tint, text: colors.ink, border: colors.line },
};

export default function RootLayout() {
  const onboarded = useAppState((s) => s.onboarded);
  // Mounted text keeps its old measurements when the user changes text size; remounting fixes it.
  const { fontScale } = useWindowDimensions();
  const booted = useRef(false);

  useEffect(() => {
    SplashScreen.hide();
    if (booted.current) return;
    booted.current = true;
    const stopNet = startNetworkWatch();
    return () => stopNet();
  }, []);

  return (
    <ThemeProvider value={theme}>
      <StatusBar style={Platform.OS === 'ios' ? 'dark' : 'auto'} />
      <Stack key={`fs-${fontScale}`} screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
        <Stack.Protected guard={!onboarded}>
          <Stack.Screen name="onboarding" />
        </Stack.Protected>
        <Stack.Protected guard={onboarded}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="step/[id]" />
          <Stack.Screen name="step/[id]/done" options={{ presentation: 'modal' }} />
          <Stack.Screen name="verified/[id]" />
          <Stack.Screen name="mentors/index" />
          <Stack.Screen name="mentor/[id]" />
          <Stack.Screen name="chat/[matchId]" />
          <Stack.Screen name="circle/[id]" />
          <Stack.Screen name="circles/request" />
          <Stack.Screen name="profile" />
          <Stack.Screen name="safety" />
          <Stack.Screen name="family" />
          <Stack.Screen name="why/roadmap" options={{ presentation: 'modal' }} />
        </Stack.Protected>
        <Stack.Screen name="data" />
        <Stack.Screen name="privacy" />
        <Stack.Screen name="terms" />
      </Stack>
    </ThemeProvider>
  );
}

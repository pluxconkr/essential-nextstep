import { Tabs } from 'expo-router/js-tabs';
import { Platform, StyleSheet, View } from 'react-native';

import { t } from '@/i18n';
import { useAppState } from '@/store/appStore';
import { Icon, type IconName } from '@/ui/icons';
import { colors, type } from '@/ui/theme';

function TabIcon({ name, color }: { name: IconName; color: string }) {
  return <Icon name={name} size={24} color={color} weight="medium" />;
}

export default function TabLayout() {
  const unread = useAppState((s) => s.matches.reduce((n, m) => n + m.unread, 0) > 0);
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.tint,
        tabBarInactiveTintColor: colors.ink2,
        tabBarStyle: styles.bar,
        tabBarLabelStyle: styles.label,
        // Like UIKit tab bars: labels stay put at large text sizes; everything above the bar scales.
        tabBarAllowFontScaling: false,
        lazy: false,
        sceneStyle: { backgroundColor: colors.bg },
      }}>
      <Tabs.Screen name="index" options={{ title: t('tab.next'), tabBarIcon: ({ color, focused }) => <TabIcon name={focused ? 'next' : 'nextOutline'} color={String(color)} /> }} />
      <Tabs.Screen name="roadmap" options={{ title: t('tab.roadmap'), tabBarIcon: ({ color, focused }) => <TabIcon name={focused ? 'roadmap' : 'roadmapOutline'} color={String(color)} /> }} />
      <Tabs.Screen
        name="mentor"
        options={{
          title: t('tab.mentor'),
          tabBarIcon: ({ color, focused }) => (
            <View>
              <TabIcon name={focused ? 'mentor' : 'mentorOutline'} color={String(color)} />
              {unread ? <View style={styles.dot} /> : null}
            </View>
          ),
        }}
      />
      <Tabs.Screen name="circles" options={{ title: t('tab.circles'), tabBarIcon: ({ color, focused }) => <TabIcon name={focused ? 'circles' : 'circlesOutline'} color={String(color)} /> }} />
      <Tabs.Screen name="growth" options={{ title: t('tab.growth'), tabBarIcon: ({ color, focused }) => <TabIcon name={focused ? 'growth' : 'growthOutline'} color={String(color)} /> }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: { backgroundColor: colors.tabBar, borderTopColor: colors.line, borderTopWidth: StyleSheet.hairlineWidth, height: Platform.OS === 'ios' ? 84 : 64, paddingTop: 6 },
  label: { ...type.tabLabel, marginTop: 1 },
  dot: { position: 'absolute', top: -1, right: -4, width: 8, height: 8, borderRadius: 4, backgroundColor: colors.tint, borderWidth: 1.5, borderColor: colors.tabBarEdge },
});

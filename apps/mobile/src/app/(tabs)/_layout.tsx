import { StyleSheet, Text } from 'react-native';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  CalendarBlank,
  Compass,
  House,
  Stack,
  Trophy,
  User,
  type Icon,
} from 'phosphor-react-native';

import { Palette } from '@/constants/theme';
import { fonts } from '@/theme/tokens';

// 목업 .m-tabbar 문법 (mobile-light-mockup.html + collections-mockup 5-0 A안 6탭):
// surface 바탕 + line 상단 보더, 활성 = accent 아이콘(fill) + ink 라벨(600).
function tabOptions(label: string, IconComponent: Icon) {
  return {
    title: label,
    tabBarIcon: ({ focused }: { focused: boolean }) => (
      <IconComponent
        size={23}
        color={focused ? Palette.accent : Palette.ink3}
        weight={focused ? 'fill' : 'regular'}
      />
    ),
    tabBarLabel: ({ focused }: { focused: boolean }) => (
      <Text style={[styles.label, focused && styles.labelActive]}>{label}</Text>
    ),
  };
}

export default function TabLayout() {
  // edge-to-edge(SDK 57 기본)에서 시스템 내비바와 겹치지 않도록
  // 고정 높이 대신 하단 safe-area를 더한다.
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Palette.surface,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: Palette.line,
          height: 64 + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: 8,
        },
        tabBarActiveTintColor: Palette.accent,
        tabBarInactiveTintColor: Palette.ink3,
      }}>
      <Tabs.Screen name="index" options={tabOptions('홈', House)} />
      <Tabs.Screen name="explore" options={tabOptions('탐색', Compass)} />
      <Tabs.Screen name="collections" options={tabOptions('컬렉션', Stack)} />
      <Tabs.Screen name="ranking" options={tabOptions('랭킹', Trophy)} />
      <Tabs.Screen name="new" options={tabOptions('신작', CalendarBlank)} />
      <Tabs.Screen name="profile" options={tabOptions('프로필', User)} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 11,
    lineHeight: 14,
    marginTop: 3,
    fontFamily: fonts.regular,
    color: Palette.ink3,
  },
  labelActive: {
    fontFamily: fonts.semiBold,
    color: Palette.ink,
  },
});

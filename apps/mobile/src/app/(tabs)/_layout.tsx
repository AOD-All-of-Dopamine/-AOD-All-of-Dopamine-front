import { Tabs } from 'expo-router';

import {
  CalendarTabIcon,
  ExploreTabIcon,
  HomeTabIcon,
  MyTabIcon,
  RankingTabIcon,
} from '@/components/tab-icons';
import { colors, fonts } from '@/theme/tokens';

// 웹 NavigationBar 미러: bg #242424, 활성 white / 비활성 gray, 아이콘+라벨 세로.
// (NativeTabs는 png만 지원해 웹 svg 아이콘을 쓰기 위해 JS 탭바로 전환)
export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopWidth: 0,
          height: 72,
          paddingTop: 8,
        },
        tabBarActiveTintColor: '#FFFFFF',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarLabelStyle: {
          fontSize: 12,
          fontFamily: fonts.regular,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: '홈',
          tabBarIcon: ({ color }) => <HomeTabIcon color={color} size={20} />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: '탐색',
          tabBarIcon: ({ color }) => <ExploreTabIcon color={color} size={22} />,
        }}
      />
      <Tabs.Screen
        name="ranking"
        options={{
          title: '랭킹',
          tabBarIcon: ({ color }) => <RankingTabIcon color={color} size={22} />,
        }}
      />
      <Tabs.Screen
        name="new"
        options={{
          title: '신작',
          tabBarIcon: ({ color }) => <CalendarTabIcon color={color} size={22} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: '프로필',
          tabBarIcon: ({ color }) => <MyTabIcon color={color} size={22} />,
        }}
      />
    </Tabs>
  );
}

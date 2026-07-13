import { DarkTheme, ThemeProvider, Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { QueryClientProvider } from '@tanstack/react-query';
import { ApiProvider } from '@aod/shared/hooks';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { AuthProvider } from '@/auth/AuthContext';
import { apis } from '@/lib/api';
import { queryClient } from '@/lib/queryClient';
import { colors } from '@/theme/tokens';

SplashScreen.preventAutoHideAsync();

// 웹과 동일한 다크 고정 테마 (#242424 배경, #855BFF 액센트)
const AodTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: colors.accent,
    background: colors.background,
    card: colors.background,
    text: colors.textPrimary,
    border: colors.border,
  },
};

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    'Pretendard-Regular': require('@/assets/fonts/Pretendard-Regular.otf'),
    'Pretendard-Medium': require('@/assets/fonts/Pretendard-Medium.otf'),
    'Pretendard-SemiBold': require('@/assets/fonts/Pretendard-SemiBold.otf'),
    'Pretendard-Bold': require('@/assets/fonts/Pretendard-Bold.otf'),
  });

  if (!fontsLoaded) {
    return null; // 스플래시 유지
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ApiProvider apis={apis}>
        <AuthProvider>
          <ThemeProvider value={AodTheme}>
            <AnimatedSplashOverlay />
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="(auth)" />
            </Stack>
          </ThemeProvider>
        </AuthProvider>
      </ApiProvider>
    </QueryClientProvider>
  );
}

import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'phosphor-react-native';

import { AppHeader } from '@/components/ui/AppHeader';
import { ThemedText } from '@/components/themed-text';
import { Palette } from '@/constants/theme';

// 컬렉션 탭 라우트 스텁 - 실화면(발견/상세/생성·편집/담기 시트)은 M-C에서 교체한다.
export default function CollectionsScreen() {
  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <AppHeader />
      <View style={styles.empty}>
        <Stack size={40} color={Palette.ink3} />
        <ThemedText style={styles.title}>컬렉션 준비 중</ThemedText>
        <ThemedText style={styles.sub}>
          취향이 담긴 작품 묶음을 만들고 모아보는 공간이 곧 열려요.
        </ThemedText>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Palette.canvas,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 32,
    paddingBottom: 56,
  },
  title: {
    marginTop: 4,
    fontSize: 16,
    fontWeight: 700,
    color: Palette.ink,
  },
  sub: {
    fontSize: 13.5,
    lineHeight: 20,
    fontWeight: 400,
    color: Palette.ink2,
    textAlign: 'center',
  },
});

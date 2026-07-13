import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { colors, spacing } from '@/theme/tokens';

// F3에서 웹 ranking-page(외부/내부 상단 탭)를 이식한다.
export default function RankingScreen() {
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="title">랭킹</ThemedText>
        <ThemedText type="small" style={styles.hint}>
          준비 중 — F3에서 구현 예정
        </ThemedText>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    gap: spacing.md,
  },
  hint: {
    color: colors.textMuted,
  },
});

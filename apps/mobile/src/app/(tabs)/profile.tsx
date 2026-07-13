import { Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/auth/AuthContext';
import { colors, spacing, radius } from '@/theme/tokens';

export default function ProfileScreen() {
  const { state, logout } = useAuth();

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="title" style={styles.title}>
          프로필
        </ThemedText>

        {state.status === 'loading' && (
          <ThemedText type="small">세션 확인 중…</ThemedText>
        )}

        {state.status === 'authenticated' && (
          <ThemedView type="backgroundElement" style={styles.card}>
            <ThemedText style={styles.username}>
              {state.user.username} 님
            </ThemedText>
            <Pressable style={styles.button} onPress={logout}>
              <ThemedText style={styles.buttonText}>로그아웃</ThemedText>
            </Pressable>
          </ThemedView>
        )}

        {state.status === 'unauthenticated' && (
          <ThemedView type="backgroundElement" style={styles.card}>
            <ThemedText type="small" style={styles.hint}>
              로그인하고 리뷰·북마크를 관리하세요
            </ThemedText>
            <Link href="/login" asChild>
              <Pressable style={styles.button}>
                <ThemedText style={styles.buttonText}>로그인</ThemedText>
              </Pressable>
            </Link>
          </ThemedView>
        )}

        <ThemedText type="small" style={styles.todo}>
          내 리뷰·북마크·좋아요는 F4에서 구현 예정
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
    gap: spacing.lg,
  },
  title: {
    marginBottom: spacing.sm,
  },
  card: {
    borderRadius: radius.lg,
    padding: spacing.xl,
    gap: spacing.lg,
  },
  username: {
    fontSize: 18,
    fontWeight: '600',
  },
  hint: {
    color: colors.textMuted,
  },
  button: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  buttonText: {
    color: colors.textPrimary,
    fontWeight: '600',
  },
  todo: {
    color: colors.textFaint,
    textAlign: 'center',
    marginTop: 'auto',
    marginBottom: spacing.xxl,
  },
});

import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Stack, router } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { colors, spacing, radius } from '@/theme/tokens';

// ── 웹 onboarding-page.tsx 미러 (장르 선택 — API 저장은 웹도 미구현) ──
const GENRES = [
  '액션', 'SF', '스릴러', '로맨스', '코미디', '드라마',
  '판타지', '모험', '가족', '공포', '미스터리', '범죄',
  '다큐', '역사', '전쟁', '애니메이션', '음악', '무협',
];

export default function OnboardingScreen() {
  const [selected, setSelected] = useState<string[]>([]);

  const toggleGenre = (genre: string) => {
    setSelected((prev) => {
      if (prev.includes(genre)) return prev.filter((g) => g !== genre);
      if (prev.length >= 5) return prev;
      return [...prev, genre];
    });
  };

  const isValid = selected.length >= 1 && selected.length <= 5;

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ headerShown: true, title: '' }} />
      <ScrollView contentContainerStyle={styles.content}>
        <ThemedText style={styles.title}>
          좋아하는 장르를 골라주세요{'\n'}취향에 맞는 콘텐츠를 추천해드려요
        </ThemedText>
        <ThemedText type="small" style={styles.hint}>
          최대 5개 선택 가능해요
        </ThemedText>

        <View style={styles.chips}>
          {GENRES.map((genre) => {
            const active = selected.includes(genre);
            return (
              <Pressable
                key={genre}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => toggleGenre(genre)}>
                <ThemedText
                  type="small"
                  style={[styles.chipText, active && styles.chipTextActive]}>
                  {genre}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <View style={styles.bottomBar}>
        <Pressable
          style={[styles.nextButton, !isValid && styles.nextButtonDisabled]}
          disabled={!isValid}
          onPress={() => router.replace('/')}>
          <ThemedText style={styles.nextButtonText}>다음</ThemedText>
        </Pressable>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: spacing.xxl,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 24,
    marginBottom: spacing.sm,
  },
  hint: {
    color: colors.textMuted,
    marginBottom: spacing.xxl,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    backgroundColor: '#2F2F32',
    borderRadius: radius.full,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  chipActive: {
    backgroundColor: colors.accent,
  },
  chipText: {
    color: colors.textBright,
    fontWeight: '500',
  },
  chipTextActive: {
    color: colors.textPrimary,
  },
  bottomBar: {
    padding: spacing.xl,
  },
  nextButton: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  nextButtonDisabled: {
    opacity: 0.5,
  },
  nextButtonText: {
    color: colors.textPrimary,
    fontWeight: '600',
  },
});

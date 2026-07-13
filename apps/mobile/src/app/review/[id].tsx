import { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/auth/AuthContext';
import { useCreateReview } from '@aod/shared/hooks';
import { colors, spacing, radius, fonts } from '@/theme/tokens';

// ── 웹 review-page.tsx 미러 (리뷰 작성 — id = 작품 contentId) ──
export default function ReviewWriteScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const contentId = id ? Number(id) : 0;
  const { state } = useAuth();
  const isAuthenticated = state.status === 'authenticated';

  const [selectedRating, setSelectedRating] = useState(0);
  const [content, setContent] = useState('');

  const createReviewMutation = useCreateReview(contentId);
  const isSaveDisabled =
    selectedRating === 0 || content.trim().length === 0 ||
    createReviewMutation.isPending;

  const handleSubmit = () => {
    if (!isAuthenticated) {
      Alert.alert('로그인이 필요합니다.');
      return;
    }
    if (!contentId || Number.isNaN(contentId)) {
      Alert.alert('유효하지 않은 콘텐츠입니다.');
      return;
    }
    createReviewMutation.mutate(
      { rating: selectedRating, content: content.trim() },
      {
        onSuccess: () => {
          Alert.alert('리뷰가 작성되었습니다.', undefined, [
            { text: '확인', onPress: () => router.back() },
          ]);
        },
        onError: (error) => {
          const msg = (error as { response?: { data?: { error?: string } } })
            ?.response?.data?.error;
          Alert.alert(msg ?? '리뷰 작성에 실패했습니다.');
        },
      },
    );
  };

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ headerShown: true, title: '리뷰 작성하기' }} />
      <ScrollView contentContainerStyle={styles.content}>
        {/* 별점 */}
        <ThemedText type="small" style={styles.label}>
          별점
        </ThemedText>
        <View style={styles.stars}>
          {[1, 2, 3, 4, 5].map((rating) => (
            <Pressable key={rating} onPress={() => setSelectedRating(rating)}>
              <ThemedText
                style={[
                  styles.star,
                  {
                    color:
                      selectedRating >= rating ? colors.accent : colors.border,
                  },
                ]}>
                ★
              </ThemedText>
            </Pressable>
          ))}
        </View>

        {/* 한줄평 */}
        <View style={styles.reviewLabelRow}>
          <ThemedText type="small" style={styles.label}>
            리뷰 한줄평
          </ThemedText>
          <ThemedText type="small" style={styles.counter}>
            {content.length}/300
          </ThemedText>
        </View>
        <TextInput
          style={styles.textarea}
          placeholder="작품에 대한 한줄평을 작성해주세요."
          placeholderTextColor={colors.textMuted}
          multiline
          maxLength={300}
          value={content}
          onChangeText={setContent}
        />
      </ScrollView>

      {/* 하단 저장 버튼 (웹 BottomButton 미러) */}
      <View style={styles.bottomBar}>
        <Pressable
          style={[styles.saveButton, isSaveDisabled && styles.saveButtonDisabled]}
          disabled={isSaveDisabled}
          onPress={handleSubmit}>
          <ThemedText style={styles.saveButtonText}>저장</ThemedText>
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
    padding: spacing.xl,
  },
  label: {
    color: colors.textPrimary,
  },
  stars: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xxl,
    marginVertical: spacing.lg,
  },
  star: {
    fontSize: 32,
    lineHeight: 36,
  },
  reviewLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  counter: {
    color: colors.textMuted,
    fontSize: 12,
  },
  textarea: {
    minHeight: 100,
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    padding: spacing.md,
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.textPrimary,
    textAlignVertical: 'top',
  },
  bottomBar: {
    padding: spacing.xl,
  },
  saveButton: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: colors.textPrimary,
    fontWeight: '600',
  },
});

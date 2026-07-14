import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { SvgXml } from 'react-native-svg';

import { MORE } from '@/components/svg-assets';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useMyReviews, useDeleteReview } from '@aod/shared/hooks';
import { colors, spacing, radius } from '@/theme/tokens';

// ── 웹 my-reviews-page.tsx 미러 ──

function Stars({ rating }: { rating: number }) {
  return (
    <View style={styles.stars}>
      {[1, 2, 3, 4, 5].map((star) => (
        <ThemedText
          key={star}
          style={[
            styles.star,
            { color: star <= Math.round(rating) ? colors.accent : colors.border },
          ]}>
          ★
        </ThemedText>
      ))}
    </View>
  );
}

export default function MyReviewsScreen() {
  const [page, setPage] = useState(0);
  const { data, isLoading } = useMyReviews(page, 20);
  const deleteReviewMutation = useDeleteReview(0);

  const handleOptions = (reviewId: number) => {
    Alert.alert('리뷰', undefined, [
      // 웹 my-reviews의 수정하기도 미구현 상태 — 동일하게 준비중 처리
      { text: '수정하기', onPress: () => Alert.alert('준비 중', '리뷰 수정은 곧 지원됩니다.') },
      {
        text: '삭제하기',
        style: 'destructive',
        onPress: () =>
          Alert.alert('리뷰 삭제', '리뷰를 삭제하시겠습니까?', [
            { text: '취소', style: 'cancel' },
            {
              text: '삭제',
              style: 'destructive',
              onPress: () => deleteReviewMutation.mutate(reviewId),
            },
          ]),
      },
      { text: '취소', style: 'cancel' },
    ]);
  };

  const sorted = [...(data?.content ?? [])].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ headerShown: true, title: '내가 리뷰한 작품' }} />
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : sorted.length === 0 ? (
        <View style={styles.center}>
          <ThemedText style={styles.emptyText}>
            아직 작성한 리뷰가 없습니다.
          </ThemedText>
          <Pressable
            style={styles.emptyButton}
            onPress={() => router.push('/explore')}>
            <ThemedText style={styles.emptyButtonText}>작품 둘러보기</ThemedText>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={sorted}
          keyExtractor={(review) => String(review.reviewId)}
          contentContainerStyle={styles.listContent}
          renderItem={({ item: review }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Pressable
                  style={styles.cardTitleWrap}
                  onPress={() =>
                    router.push({
                      pathname: '/work/[id]',
                      params: { id: String(review.contentId) },
                    })
                  }>
                  <ThemedText style={styles.cardTitle} numberOfLines={1}>
                    {review.contentTitle}
                  </ThemedText>
                </Pressable>
                <Pressable onPress={() => handleOptions(review.reviewId)} hitSlop={12}>
                  <SvgXml xml={MORE} width={4} height={16} />
                </Pressable>
              </View>
              <Stars rating={review.rating} />
              <ThemedText type="small" style={styles.date}>
                {new Date(review.createdAt).toLocaleDateString()}
              </ThemedText>
              {!!review.title && (
                <ThemedText style={styles.reviewTitle}>{review.title}</ThemedText>
              )}
              <ThemedText type="small" style={styles.reviewContent}>
                {review.content}
              </ThemedText>
            </View>
          )}
          ListFooterComponent={
            data && data.totalPages > 1 ? (
              <View style={styles.pagination}>
                <Pressable
                  disabled={page === 0}
                  style={[styles.pageButton, page === 0 && styles.pageButtonDisabled]}
                  onPress={() => setPage((p) => p - 1)}>
                  <ThemedText type="small" style={styles.pageButtonText}>
                    이전
                  </ThemedText>
                </Pressable>
                <ThemedText type="small" style={styles.pageInfo}>
                  {page + 1} / {data.totalPages}
                </ThemedText>
                <Pressable
                  disabled={page >= data.totalPages - 1}
                  style={[
                    styles.pageButton,
                    page >= data.totalPages - 1 && styles.pageButtonDisabled,
                  ]}
                  onPress={() => setPage((p) => p + 1)}>
                  <ThemedText type="small" style={styles.pageButtonText}>
                    다음
                  </ThemedText>
                </Pressable>
              </View>
            ) : null
          }
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
  },
  emptyText: {
    color: colors.textFaint,
  },
  emptyButton: {
    backgroundColor: colors.accent,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  emptyButtonText: {
    color: colors.textPrimary,
    fontWeight: '600',
  },
  listContent: {
    padding: spacing.xl,
    gap: spacing.lg,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitleWrap: {
    flex: 1,
  },
  cardTitle: {
    fontWeight: '500',
  },
  moreIcon: {
    fontSize: 18,
    color: colors.textMuted,
  },
  stars: {
    flexDirection: 'row',
    gap: 2,
  },
  star: {
    fontSize: 14,
  },
  date: {
    color: colors.textBright,
    fontSize: 12,
  },
  reviewTitle: {
    fontWeight: '600',
    fontSize: 14,
    marginTop: spacing.sm,
  },
  reviewContent: {
    lineHeight: 24,
    marginTop: spacing.xs,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.lg,
    marginTop: spacing.xl,
  },
  pageButton: {
    backgroundColor: colors.accent,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  pageButtonDisabled: {
    backgroundColor: '#444444',
  },
  pageButtonText: {
    color: colors.textPrimary,
    fontWeight: '600',
  },
  pageInfo: {
    fontWeight: '600',
  },
});

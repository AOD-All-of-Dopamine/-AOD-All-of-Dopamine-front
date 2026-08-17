import { useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  ChatCircleText,
  DotsThreeVertical,
  Star,
  WarningCircle,
} from 'phosphor-react-native';

import { DetailTopBar } from '@/components/ui/DetailTopBar';
import { EmptyState, EmptyStateAction } from '@/components/ui/EmptyState';
import { SkeletonBlock, SkeletonPulse } from '@/components/ui/Skeleton';
import { ThemedText } from '@/components/themed-text';
import { useDeleteReview, useMyReviews } from '@aod/shared/hooks';
import { Palette, Radius } from '@/constants/theme';

/**
 * 프로필 > 내가 리뷰한 작품 - 웹 my-reviews-page 문법 이식.
 * 기존 구조(리뷰 카드 리스트 + 더보기 메뉴 + 페이지네이션) 유지 + 토큰 재스킨.
 * 별점은 Phosphor Star(star 토큰), 더보기 메뉴는 Alert 액션시트(모바일 관례).
 * 수정하기는 웹과 동일하게 미구현 준비 중 안내, 삭제만 danger.
 */

const PAGE_SIZE = 20;

function Stars({ rating }: { rating: number }) {
  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={`평점 ${rating}점`}
      style={styles.stars}>
      {[1, 2, 3, 4, 5].map((star) => {
        const active = star <= Math.round(rating);
        return (
          <Star
            key={star}
            size={15}
            weight={active ? 'fill' : 'regular'}
            color={active ? Palette.star : Palette.lineStrong}
          />
        );
      })}
    </View>
  );
}

export default function MyReviewsScreen() {
  const [page, setPage] = useState(0);
  const { data, isLoading, isError, refetch } = useMyReviews(page, PAGE_SIZE);
  const deleteReviewMutation = useDeleteReview(0);

  const handleOptions = (reviewId: number) => {
    Alert.alert('리뷰', undefined, [
      {
        text: '수정하기',
        onPress: () => Alert.alert('준비 중', '리뷰 수정은 곧 지원됩니다.'),
      },
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
    <View style={styles.screen}>
      <SafeAreaView edges={['top']} style={styles.top}>
        <DetailTopBar title="내가 리뷰한 작품" />
      </SafeAreaView>

      <FlatList
        style={styles.list}
        data={isLoading || isError ? [] : sorted}
        keyExtractor={(review) => String(review.reviewId)}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item: review }) => (
          <View style={styles.card}>
            <View style={styles.cardHead}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${review.contentTitle} 상세로 이동`}
                onPress={() =>
                  router.push({
                    pathname: '/work/[id]',
                    params: { id: String(review.contentId) },
                  })
                }
                style={({ pressed }) => [
                  styles.cardTitleWrap,
                  pressed && styles.pressedDim,
                ]}>
                <ThemedText numberOfLines={1} style={styles.cardTitle}>
                  {review.contentTitle}
                </ThemedText>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="리뷰 관리 메뉴"
                onPress={() => handleOptions(review.reviewId)}
                hitSlop={8}
                style={({ pressed }) => [
                  styles.moreBtn,
                  pressed && styles.pressedDim,
                ]}>
                <DotsThreeVertical size={18} weight="bold" color={Palette.ink3} />
              </Pressable>
            </View>
            <Stars rating={review.rating} />
            <ThemedText style={styles.date}>
              {new Date(review.createdAt).toLocaleDateString()}
            </ThemedText>
            {!!review.title && (
              <ThemedText style={styles.reviewTitle}>{review.title}</ThemedText>
            )}
            <ThemedText style={styles.reviewContent}>
              {review.content}
            </ThemedText>
          </View>
        )}
        ListEmptyComponent={
          isLoading ? (
            <SkeletonPulse style={styles.skeletonList}>
              {Array.from({ length: 3 }, (_, i) => (
                <SkeletonBlock
                  key={i}
                  height={128}
                  radius={Radius.panel}
                  style={styles.skeletonCard}
                />
              ))}
            </SkeletonPulse>
          ) : isError ? (
            <EmptyState
              icon={<WarningCircle size={44} color={Palette.ink3} />}
              title="리뷰를 불러오지 못했어요"
              description="네트워크 상태를 확인한 뒤 다시 시도해 주세요."
              action={
                <EmptyStateAction label="다시 시도" onPress={() => refetch()} />
              }
            />
          ) : (
            <EmptyState
              icon={<ChatCircleText size={44} color={Palette.ink3} />}
              title="아직 작성한 리뷰가 없어요"
              description="마음에 남은 작품에 첫 리뷰를 남겨보세요."
              action={
                <EmptyStateAction
                  label="작품 둘러보기"
                  onPress={() => router.push('/(tabs)/explore')}
                />
              }
            />
          )
        }
        ListFooterComponent={
          data && data.totalPages > 1 ? (
            <View style={styles.pagination}>
              <Pressable
                accessibilityRole="button"
                disabled={page === 0}
                onPress={() => setPage((p) => p - 1)}
                style={({ pressed }) => [
                  styles.pageBtn,
                  page === 0 && styles.pageBtnDisabled,
                  pressed && styles.pressedDim,
                ]}>
                <ThemedText style={styles.pageBtnText}>이전</ThemedText>
              </Pressable>
              <ThemedText style={styles.pageInfo}>
                {page + 1} / {data.totalPages}
              </ThemedText>
              <Pressable
                accessibilityRole="button"
                disabled={page >= data.totalPages - 1}
                onPress={() => setPage((p) => p + 1)}
                style={({ pressed }) => [
                  styles.pageBtn,
                  page >= data.totalPages - 1 && styles.pageBtnDisabled,
                  pressed && styles.pressedDim,
                ]}>
                <ThemedText style={styles.pageBtnText}>다음</ThemedText>
              </Pressable>
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Palette.canvas,
  },
  top: {
    backgroundColor: Palette.surface,
  },
  pressedDim: {
    opacity: 0.8,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingTop: 12,
    paddingBottom: 28,
  },
  card: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.line,
    borderRadius: Radius.panel,
    // 목업 shadow-card 근사
    shadowColor: Palette.shadowInk,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitleWrap: {
    flex: 1,
    minWidth: 0,
  },
  cardTitle: {
    fontSize: 15.5,
    lineHeight: 20,
    fontWeight: 700,
    color: Palette.ink,
  },
  moreBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.pill,
  },
  stars: {
    flexDirection: 'row',
    gap: 2,
    marginTop: 6,
  },
  date: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: 400,
    color: Palette.ink3,
  },
  reviewTitle: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: 600,
    color: Palette.ink,
  },
  reviewContent: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 22,
    fontWeight: 400,
    color: Palette.ink2,
  },
  skeletonList: {
    paddingHorizontal: 16,
  },
  skeletonCard: {
    marginBottom: 12,
  },
  pagination: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginTop: 8,
  },
  pageBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Palette.lineStrong,
    backgroundColor: Palette.surface,
  },
  pageBtnDisabled: {
    opacity: 0.4,
  },
  pageBtnText: {
    fontSize: 13.5,
    lineHeight: 18,
    fontWeight: 600,
    color: Palette.ink,
  },
  pageInfo: {
    fontSize: 13.5,
    lineHeight: 18,
    fontWeight: 600,
    color: Palette.ink2,
    fontVariant: ['tabular-nums'],
  },
});

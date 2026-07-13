import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/auth/AuthContext';
import {
  useWorkDetail,
  useReviews,
  useDeleteReview,
  useLikeStats,
  useToggleLike,
  useToggleDislike,
  useBookmarkStatus,
  useToggleBookmark,
} from '@aod/shared/hooks';
import { DOMAIN_LABEL_MAP, PLATFORM_LABELS } from '@aod/shared/constants';
import { colors, spacing, radius } from '@/theme/tokens';

type TabType = 'info' | 'reviews';

// 웹 imageAspectMap 미러 (도메인별 포스터 비율)
const ASPECT_MAP: Record<string, number> = {
  MOVIE: 2 / 3,
  TV: 2 / 3,
  GAME: 21.5 / 10,
  WEBTOON: 19 / 25,
  WEBNOVEL: 17 / 25,
};

const POSTER_WIDTH = Math.min(Dimensions.get('window').width * 0.45, 200);

export default function WorkDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const contentId = id ? Number(id) : 0;
  const { state: authState } = useAuth();
  const isAuthenticated = authState.status === 'authenticated';

  const [activeTab, setActiveTab] = useState<TabType>('info');
  const [isSynopsisExpanded, setIsSynopsisExpanded] = useState(false);

  const { data: work, isLoading: workLoading } = useWorkDetail(contentId);
  const { data: reviewsData } = useReviews(contentId);
  const { data: likeStats } = useLikeStats(contentId);
  const { data: bookmarkStatus } = useBookmarkStatus(contentId);

  const deleteReviewMutation = useDeleteReview(contentId);
  const toggleLikeMutation = useToggleLike(contentId);
  const toggleDislikeMutation = useToggleDislike(contentId);
  const toggleBookmarkMutation = useToggleBookmark(contentId);

  const requireLogin = () =>
    Alert.alert('로그인이 필요한 기능입니다.', '로그인 후 이용해 주세요.', [
      { text: '취소', style: 'cancel' },
      { text: '로그인', onPress: () => router.push('/login') },
    ]);

  // 웹 handleRatingAction 미러 — 좋아요/싫어요 상호 배타
  const handleRating = (type: 'like' | 'dislike') => {
    if (!isAuthenticated) {
      requireLogin();
      return;
    }
    if (type === 'like') {
      if (likeStats?.disliked) toggleDislikeMutation.mutate();
      toggleLikeMutation.mutate();
    } else {
      if (likeStats?.liked) toggleLikeMutation.mutate();
      toggleDislikeMutation.mutate();
    }
  };

  const handleBookmark = () => {
    if (!isAuthenticated) {
      requireLogin();
      return;
    }
    toggleBookmarkMutation.mutate();
  };

  const handleDeleteReview = (reviewId: number) => {
    Alert.alert('리뷰 삭제', '리뷰를 삭제하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: () => deleteReviewMutation.mutate(reviewId),
      },
    ]);
  };

  if (workLoading) {
    return (
      <ThemedView style={styles.center}>
        <Stack.Screen options={{ title: '' }} />
        <ActivityIndicator color={colors.accent} />
      </ThemedView>
    );
  }

  if (!work) {
    return (
      <ThemedView style={styles.center}>
        <Stack.Screen options={{ title: '' }} />
        <ThemedText style={styles.muted}>작품을 찾을 수 없습니다.</ThemedText>
      </ThemedView>
    );
  }

  const reviewCount = reviewsData?.totalElements ?? 0;
  const reviews = reviewsData?.content ?? [];
  const aspect = ASPECT_MAP[work.domain] ?? 2 / 3;
  const platformKeys = Object.keys(work.platformInfo ?? {});

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: work.title }} />
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* 헤더: 포스터 + 기본 정보 */}
        <View style={styles.hero}>
          <Image
            source={work.thumbnail ? { uri: work.thumbnail } : undefined}
            style={{
              width: POSTER_WIDTH,
              height: POSTER_WIDTH / aspect,
              borderRadius: radius.md,
              backgroundColor: colors.surface,
            }}
            contentFit="cover"
          />
          <View style={styles.heroInfo}>
            <ThemedText style={styles.title}>{work.title}</ThemedText>
            {work.originalTitle && work.originalTitle !== work.title && (
              <ThemedText type="small" style={styles.muted}>
                {work.originalTitle}
              </ThemedText>
            )}
            <ThemedText type="small" style={styles.muted}>
              {DOMAIN_LABEL_MAP[work.domain] ?? work.domain}
              {work.releaseDate
                ? ` • ${new Date(work.releaseDate).getFullYear()}`
                : ''}
            </ThemedText>
            <ThemedText style={styles.score}>
              ★ {(work.score || 0).toFixed(1)}{' '}
              <ThemedText type="small" style={styles.muted}>
                리뷰 {reviewCount}
              </ThemedText>
            </ThemedText>
          </View>
        </View>

        {/* 액션 행: 좋아요 / 싫어요 / 북마크 */}
        <View style={styles.actions}>
          <Pressable
            style={[styles.actionButton, likeStats?.liked && styles.actionActive]}
            onPress={() => handleRating('like')}>
            <ThemedText type="small" style={styles.actionText}>
              👍 {likeStats?.likeCount ?? 0}
            </ThemedText>
          </Pressable>
          <Pressable
            style={[
              styles.actionButton,
              likeStats?.disliked && styles.actionActive,
            ]}
            onPress={() => handleRating('dislike')}>
            <ThemedText type="small" style={styles.actionText}>
              👎 {likeStats?.dislikeCount ?? 0}
            </ThemedText>
          </Pressable>
          <Pressable
            style={[
              styles.actionButton,
              bookmarkStatus?.bookmarked && styles.actionActive,
            ]}
            onPress={handleBookmark}>
            <ThemedText type="small" style={styles.actionText}>
              🔖 {bookmarkStatus?.bookmarked ? '저장됨' : '북마크'}
            </ThemedText>
          </Pressable>
        </View>

        {/* 탭 */}
        <View style={styles.tabs}>
          {(
            [
              ['info', '작품 정보'],
              ['reviews', `리뷰 ${reviewCount}`],
            ] as [TabType, string][]
          ).map(([key, label]) => (
            <Pressable
              key={key}
              style={[styles.tab, activeTab === key && styles.tabActive]}
              onPress={() => setActiveTab(key)}>
              <ThemedText
                style={[styles.tabText, activeTab === key && styles.tabTextActive]}>
                {label}
              </ThemedText>
            </Pressable>
          ))}
        </View>

        {activeTab === 'info' ? (
          <View style={styles.section}>
            {/* 줄거리 */}
            {!!work.synopsis && (
              <>
                <ThemedText style={styles.sectionTitle}>줄거리</ThemedText>
                <Pressable
                  onPress={() => setIsSynopsisExpanded((v) => !v)}>
                  <ThemedText
                    type="small"
                    style={styles.synopsis}
                    numberOfLines={isSynopsisExpanded ? undefined : 4}>
                    {work.synopsis.replace(/<[^>]+>/g, '')}
                  </ThemedText>
                  <ThemedText type="small" style={styles.expandHint}>
                    {isSynopsisExpanded ? '접기' : '더보기'}
                  </ThemedText>
                </Pressable>
              </>
            )}

            {/* 플랫폼 */}
            {platformKeys.length > 0 && (
              <>
                <ThemedText style={styles.sectionTitle}>볼 수 있는 곳</ThemedText>
                <View style={styles.chipRow}>
                  {platformKeys.map((key) => (
                    <View key={key} style={styles.chip}>
                      <ThemedText type="small" style={styles.chipText}>
                        {PLATFORM_LABELS[key] ?? key}
                      </ThemedText>
                    </View>
                  ))}
                </View>
              </>
            )}
            <ThemedText type="small" style={styles.todo}>
              상세 정보 표는 F4에서 확장 예정
            </ThemedText>
          </View>
        ) : (
          <View style={styles.section}>
            {reviews.length === 0 ? (
              <ThemedText type="small" style={styles.muted}>
                아직 리뷰가 없습니다.
              </ThemedText>
            ) : (
              reviews.map((review) => (
                <View
                  key={review.reviewId}
                  style={[
                    styles.reviewCard,
                    review.isMyReview && styles.myReviewCard,
                  ]}>
                  <View style={styles.reviewHeader}>
                    <ThemedText type="small" style={styles.reviewAuthor}>
                      {review.username}
                      {review.isMyReview ? ' (내 리뷰)' : ''}
                    </ThemedText>
                    <ThemedText type="small" style={styles.score}>
                      ★ {review.rating.toFixed(1)}
                    </ThemedText>
                  </View>
                  {!!review.title && (
                    <ThemedText style={styles.reviewTitle}>
                      {review.title}
                    </ThemedText>
                  )}
                  <ThemedText type="small" style={styles.reviewContent}>
                    {review.content}
                  </ThemedText>
                  {review.isMyReview && (
                    <Pressable
                      onPress={() => handleDeleteReview(review.reviewId)}>
                      <ThemedText type="small" style={styles.deleteText}>
                        삭제
                      </ThemedText>
                    </Pressable>
                  )}
                </View>
              ))
            )}
            <ThemedText type="small" style={styles.todo}>
              리뷰 작성은 F4에서 지원 예정
            </ThemedText>
          </View>
        )}
      </ScrollView>
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
  },
  hero: {
    flexDirection: 'row',
    gap: spacing.lg,
    padding: spacing.xl,
  },
  heroInfo: {
    flex: 1,
    gap: spacing.sm,
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  muted: {
    color: colors.textMuted,
  },
  score: {
    color: colors.accent,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.lg,
  },
  actionButton: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  actionActive: {
    backgroundColor: colors.accent,
  },
  actionText: {
    color: colors.textPrimary,
    fontWeight: '600',
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: colors.textPrimary,
  },
  tabText: {
    color: colors.textMuted,
    fontSize: 14,
  },
  tabTextActive: {
    color: colors.textPrimary,
    fontWeight: '600',
  },
  section: {
    padding: spacing.xl,
    gap: spacing.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  synopsis: {
    color: colors.textBright,
    lineHeight: 20,
  },
  expandHint: {
    color: colors.accent,
    marginTop: spacing.xs,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    backgroundColor: colors.surface,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  chipText: {
    color: colors.textBright,
  },
  reviewCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  myReviewCard: {
    borderWidth: 1,
    borderColor: colors.accent,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  reviewAuthor: {
    color: colors.textMuted,
  },
  reviewTitle: {
    fontWeight: '600',
  },
  reviewContent: {
    color: colors.textBright,
  },
  deleteText: {
    color: colors.error,
    alignSelf: 'flex-end',
  },
  todo: {
    color: colors.textFaint,
    marginTop: spacing.md,
  },
});

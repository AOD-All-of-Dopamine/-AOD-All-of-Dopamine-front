import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
  BackArrow,
  BookmarkFilledIcon,
  GreyStar,
  PurpleStar,
  SavePlusIcon,
  SearchGlassIcon,
  ShareIcon,
} from '@/components/icons';
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
import {
  DOMAIN_LABEL_MAP,
  PLATFORM_LABELS,
  getFieldLabel,
  getPlatformLabel,
  formatFieldValue,
} from '@aod/shared/constants';
import { PLATFORM_META } from '@/constants/platforms';
import { FallbackThumb } from '@/components/work/FallbackThumb';
import { colors, spacing, radius } from '@/theme/tokens';

type TabType = 'info' | 'reviews';

// 웹 imageAspectMap 미러
const ASPECT_MAP: Record<string, number> = {
  MOVIE: 2 / 3,
  TV: 2 / 3,
  GAME: 21.5 / 10,
  WEBTOON: 19 / 25,
  WEBNOVEL: 17 / 25,
};

function Stars({ rating, size = 16 }: { rating: number; size?: number }) {
  return (
    <View style={styles.starsRow}>
      {[1, 2, 3, 4, 5].map((star) =>
        star <= Math.round(rating) ? (
          <PurpleStar key={star} size={size} />
        ) : (
          <GreyStar key={star} size={size} />
        ),
      )}
    </View>
  );
}

export default function WorkDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const contentId = id ? Number(id) : 0;
  const { state: authState } = useAuth();
  const isAuthenticated = authState.status === 'authenticated';

  const [activeTab, setActiveTab] = useState<TabType>('info');
  const [isSynopsisExpanded, setIsSynopsisExpanded] = useState(false);
  const [isRatingOpen, setIsRatingOpen] = useState(false);

  const { data: work, isLoading: workLoading } = useWorkDetail(contentId);
  const { data: reviewsData } = useReviews(contentId);
  const { data: likeStats } = useLikeStats(contentId);
  const { data: bookmarkStatus } = useBookmarkStatus(contentId);

  const deleteReviewMutation = useDeleteReview(contentId);
  const toggleLikeMutation = useToggleLike(contentId);
  const toggleDislikeMutation = useToggleDislike(contentId);
  const toggleBookmarkMutation = useToggleBookmark(contentId);

  // 웹 userLikeType 미러
  const userLikeType =
    likeStats?.userLikeType === 'LIKE'
      ? 'like'
      : likeStats?.userLikeType === 'DISLIKE'
        ? 'dislike'
        : null;

  const requireLogin = () =>
    Alert.alert('로그인이 필요한 기능입니다.', '로그인 후 이용해 주세요.', [
      { text: '취소', style: 'cancel' },
      { text: '로그인', onPress: () => router.push('/login') },
    ]);

  const handleBookmark = () => {
    if (!isAuthenticated) {
      requireLogin();
      return;
    }
    toggleBookmarkMutation.mutate();
  };

  // 웹 handleRatingAction 미러 — 상호 배타 (FlyingIcon 애니메이션은 웹 전용, 생략)
  const handleRating = (type: 'like' | 'dislike') => {
    if (!isAuthenticated) {
      requireLogin();
      setIsRatingOpen(false);
      return;
    }
    if (type === 'like') {
      if (likeStats?.disliked) toggleDislikeMutation.mutate();
      toggleLikeMutation.mutate();
    } else {
      if (likeStats?.liked) toggleLikeMutation.mutate();
      toggleDislikeMutation.mutate();
    }
    setIsRatingOpen(false);
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
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator color={colors.accent} />
      </ThemedView>
    );
  }

  if (!work) {
    return (
      <ThemedView style={styles.center}>
        <Stack.Screen options={{ headerShown: false }} />
        <ThemedText type="small" style={styles.mutedText}>
          작품을 찾을 수 없습니다.
        </ThemedText>
      </ThemedView>
    );
  }

  const reviewCount = reviewsData?.totalElements ?? 0;
  const averageRating = work.score || 0;
  const myReview = reviewsData?.content.find((review) => review.isMyReview);
  const aspect = ASPECT_MAP[work.domain] ?? 2 / 3;
  const posterWidth = work.domain === 'GAME' ? 240 : 128; // 웹 w-60/w-32

  // 웹 platformItems 미러: platformInfo key + watch_providers, 라벨 있는 것만
  const platformItems = Object.entries(work.platformInfo ?? {})
    .flatMap(([platformKey, info]) => {
      const items: string[] = [platformKey];
      if (Array.isArray((info as Record<string, unknown>).watch_providers)) {
        items.push(...((info as Record<string, string[]>).watch_providers ?? []));
      }
      return items;
    })
    .filter((v, i, arr) => arr.indexOf(v) === i)
    .filter((key) => PLATFORM_LABELS[key])
    .map((key) => ({
      key,
      label: PLATFORM_LABELS[key],
      logo: PLATFORM_META[key]?.logo,
    }));

  const htmlFields = ['detailed_description', 'about_the_game', 'short_description'];
  const stripHtml = (s: string) => s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* 블러 히어로 (웹 h-80 blur+어둡게 + 하단 페이드) */}
        <View style={styles.heroWrap}>
          <Image
            source={work.thumbnail ? { uri: work.thumbnail } : undefined}
            style={styles.heroImage}
            contentFit="cover"
            blurRadius={8}
          />
          <View style={styles.heroDim} />
          <LinearGradient
            colors={['transparent', 'rgba(36,36,36,0.8)', '#242424']}
            style={styles.heroFade}
          />

          {/* 오버레이 헤더 */}
          <View style={styles.overlayHeader}>
            <Pressable onPress={() => router.back()} hitSlop={8}>
              <BackArrow size={24} />
            </Pressable>
            <Pressable onPress={() => router.push('/search')} hitSlop={8}>
              <SearchGlassIcon size={22} />
            </Pressable>
          </View>

          {/* 포스터 (히어로 위 오버랩) */}
          <View style={styles.posterWrap}>
            <View
              style={[
                styles.poster,
                { width: posterWidth, aspectRatio: aspect },
              ]}>
              {work.thumbnail ? (
                <Image
                  source={{ uri: work.thumbnail }}
                  style={styles.posterImage}
                  contentFit="cover"
                />
              ) : (
                <FallbackThumb domain={work.domain} iconSize={40} />
              )}
            </View>
          </View>
        </View>

        {/* 작품 정보 섹션 */}
        <View style={styles.infoSection}>
          <View style={styles.titleRow}>
            <ThemedText style={styles.title}>{work.title}</ThemedText>
            {!!work.domain && (
              <View style={styles.domainBadge}>
                <ThemedText style={styles.domainBadgeText}>
                  {work.domain}
                </ThemedText>
              </View>
            )}
          </View>

          <ThemedText type="small" style={styles.subInfo}>
            {DOMAIN_LABEL_MAP[work.domain] ?? work.domain} ·{' '}
            {work.releaseDate
              ? new Date(work.releaseDate).getFullYear()
              : new Date().getFullYear()}
          </ThemedText>

          <View style={styles.ratingRow}>
            <PurpleStar size={14} />
            <ThemedText type="small" style={styles.ratingText}>
              {averageRating.toFixed(1)}
            </ThemedText>
          </View>

          {/* 통계 카드 (리뷰/좋아요/싫어요) */}
          <View style={styles.statsCard}>
            {(
              [
                [reviewCount, '리뷰'],
                [likeStats?.likeCount ?? 0, '좋아요'],
                [likeStats?.dislikeCount ?? 0, '싫어요'],
              ] as [number, string][]
            ).map(([value, label], idx) => (
              <View
                key={label}
                style={[styles.statCell, idx !== 2 && styles.statDivider]}>
                <ThemedText style={styles.statValue}>{value}</ThemedText>
                <ThemedText type="small" style={styles.statLabel}>
                  {label}
                </ThemedText>
              </View>
            ))}
          </View>

          {/* 액션 3버튼 (보고싶어요 / 평가 / 공유) */}
          <View style={styles.actionsRow}>
            <Pressable style={styles.actionItem} onPress={handleBookmark}>
              <View style={styles.actionIcon}>
                {bookmarkStatus?.bookmarked ? (
                  <BookmarkFilledIcon size={22} />
                ) : (
                  <SavePlusIcon size={18} />
                )}
              </View>
              <ThemedText
                type="small"
                style={[
                  styles.actionLabel,
                  bookmarkStatus?.bookmarked && styles.actionLabelActive,
                ]}>
                {bookmarkStatus?.bookmarked ? '관심 작품' : '보고 싶어요'}
              </ThemedText>
            </Pressable>

            <View style={styles.ratingAnchor}>
              {isRatingOpen && (
                <View style={styles.ratingPopupWrap}>
                  {/* 팝업 필 (웹 160x56 미러) */}
                  <View style={styles.ratingPill}>
                    <Pressable
                      style={styles.ratingPillButton}
                      onPress={() => handleRating('like')}>
                      <Image
                        source={require('@/assets/images/white-like-icon.png')}
                        style={styles.ratingPillIcon}
                        contentFit="contain"
                      />
                      <ThemedText style={styles.ratingPillText}>좋아요</ThemedText>
                    </Pressable>
                    <View style={styles.ratingPillDivider} />
                    <Pressable
                      style={styles.ratingPillButton}
                      onPress={() => handleRating('dislike')}>
                      <Image
                        source={require('@/assets/images/white-dislike-icon.png')}
                        style={styles.ratingPillIcon}
                        contentFit="contain"
                      />
                      <ThemedText style={styles.ratingPillText}>싫어요</ThemedText>
                    </Pressable>
                  </View>
                  {/* 닫기 X */}
                  <Pressable
                    style={styles.ratingClose}
                    onPress={() => setIsRatingOpen(false)}>
                    <ThemedText style={styles.ratingCloseText}>✕</ThemedText>
                  </Pressable>
                </View>
              )}
              {!isRatingOpen && (
                <Pressable
                  style={styles.actionItem}
                  onPress={() => setIsRatingOpen(true)}>
                  <View style={styles.actionIcon}>
                    <Image
                      source={
                        userLikeType === 'like'
                          ? require('@/assets/images/white-like-icon.png')
                          : userLikeType === 'dislike'
                            ? require('@/assets/images/white-dislike-icon.png')
                            : require('@/assets/images/grey-like-icon.png')
                      }
                      style={styles.actionIconImage}
                      contentFit="contain"
                    />
                  </View>
                  <ThemedText
                    type="small"
                    style={[
                      styles.actionLabel,
                      !!userLikeType && styles.actionLabelActive,
                    ]}>
                    {userLikeType === 'like'
                      ? '좋아요'
                      : userLikeType === 'dislike'
                        ? '싫어요'
                        : '평가'}
                  </ThemedText>
                </Pressable>
              )}
            </View>

            <Pressable style={styles.actionItem}>
              <View style={styles.actionIcon}>
                <ShareIcon size={22} />
              </View>
              <ThemedText type="small" style={styles.actionLabel}>
                공유
              </ThemedText>
            </Pressable>
          </View>

          {/* 플랫폼 원형 아이콘 행 */}
          {platformItems.length > 0 && (
            <View style={styles.platformSection}>
              <ThemedText style={styles.platformTitle}>플랫폼</ThemedText>
              <View style={styles.platformRow}>
                {platformItems.map(({ key, label, logo }) => (
                  <View key={key} style={styles.platformItem}>
                    <View style={styles.platformCircle}>
                      {logo ? (
                        <Image
                          source={logo}
                          style={styles.platformLogo}
                          contentFit="contain"
                        />
                      ) : (
                        <ThemedText style={styles.platformInitial}>
                          {label.slice(0, 2)}
                        </ThemedText>
                      )}
                    </View>
                    <ThemedText style={styles.platformLabel}>{label}</ThemedText>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>

        {/* 탭 */}
        <View style={styles.tabs}>
          {(
            [
              ['info', '작품 정보'],
              ['reviews', '리뷰'],
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

        {/* 탭 컨텐츠 */}
        <View style={styles.tabContent}>
          {activeTab === 'info' ? (
            <>
              {/* 작품 설명 */}
              {!!work.synopsis && (
                <View style={styles.block}>
                  <ThemedText style={styles.blockTitle}>작품 설명</ThemedText>
                  <ThemedText
                    type="small"
                    style={styles.synopsis}
                    numberOfLines={isSynopsisExpanded ? undefined : 4}>
                    {stripHtml(work.synopsis)}
                  </ThemedText>
                  <Pressable onPress={() => setIsSynopsisExpanded((v) => !v)}>
                    <ThemedText type="small" style={styles.expandHint}>
                      {isSynopsisExpanded ? '접기' : '더보기'}
                    </ThemedText>
                  </Pressable>
                </View>
              )}

              {/* 상세 정보 표 (domainInfo) */}
              {work.domainInfo && Object.keys(work.domainInfo).length > 0 && (
                <>
                  <View style={styles.divider} />
                  <View style={styles.fieldTable}>
                    {Object.entries(work.domainInfo).map(([key, value]) => (
                      <View key={key} style={styles.fieldRow}>
                        <ThemedText type="small" style={styles.fieldLabel}>
                          {getFieldLabel(key, 'domain')}
                        </ThemedText>
                        <ThemedText type="small" style={styles.fieldValue}>
                          {formatFieldValue(key, value)}
                        </ThemedText>
                      </View>
                    ))}
                  </View>
                </>
              )}

              {/* 플랫폼 정보 (platformInfo 상세) */}
              {work.platformInfo && Object.keys(work.platformInfo).length > 0 && (
                <>
                  <View style={styles.divider} />
                  <View style={styles.block}>
                    <ThemedText style={styles.blockTitle}>플랫폼 정보</ThemedText>
                    {Object.entries(work.platformInfo).map(([platform, info]) => (
                      <View key={platform} style={styles.platformInfoGroup}>
                        <ThemedText style={styles.platformInfoName}>
                          {getPlatformLabel(platform)}
                        </ThemedText>
                        {Object.entries(info).map(([key, value]) => {
                          const isHtmlField =
                            htmlFields.includes(key) && typeof value === 'string';
                          const formatted = isHtmlField
                            ? stripHtml(value as string)
                            : formatFieldValue(key, value);
                          const isUrl =
                            typeof value === 'string' && value.startsWith('http');
                          return (
                            <View key={key} style={styles.platformInfoCard}>
                              <ThemedText style={styles.platformInfoLabel}>
                                {getFieldLabel(key, 'platform')}
                              </ThemedText>
                              <ThemedText
                                type="small"
                                style={[
                                  styles.platformInfoValue,
                                  isUrl && styles.platformInfoLink,
                                ]}>
                                {isUrl ? (value as string) : formatted}
                              </ThemedText>
                            </View>
                          );
                        })}
                      </View>
                    ))}
                  </View>
                </>
              )}
            </>
          ) : (
            <>
              {/* 내가 쓴 리뷰 */}
              {isAuthenticated && (
                <View style={styles.block}>
                  <ThemedText style={styles.blockTitleStrong}>
                    내가 쓴 리뷰
                  </ThemedText>
                  {myReview ? (
                    <View style={styles.myReviewCard}>
                      <View style={styles.reviewerRow}>
                        <View style={styles.reviewerAvatar}>
                          <Image
                            source={require('@/assets/images/white-cat.png')}
                            style={styles.reviewerAvatarImage}
                            contentFit="contain"
                          />
                        </View>
                        <View>
                          <ThemedText type="small" style={styles.reviewerName}>
                            {myReview.username}
                          </ThemedText>
                          <ThemedText style={styles.reviewDate}>
                            {new Date(myReview.createdAt).toLocaleDateString('ko-KR')}
                          </ThemedText>
                        </View>
                      </View>
                      <Stars rating={myReview.rating} />
                      <ThemedText type="small" style={styles.reviewContent}>
                        {myReview.content}
                      </ThemedText>
                      <Pressable
                        onPress={() => handleDeleteReview(myReview.reviewId)}
                        style={styles.reviewDelete}>
                        <ThemedText style={styles.reviewDeleteText}>삭제</ThemedText>
                      </Pressable>
                    </View>
                  ) : (
                    <View style={styles.writePrompt}>
                      <ThemedText type="small" style={styles.writePromptText}>
                        이 작품은 어떠셨나요?
                      </ThemedText>
                      <Pressable
                        style={styles.writeButton}
                        onPress={() =>
                          router.push({
                            pathname: '/review/[id]',
                            params: { id: String(contentId) },
                          })
                        }>
                        <ThemedText type="small" style={styles.writeButtonText}>
                          리뷰 작성하기
                        </ThemedText>
                      </Pressable>
                    </View>
                  )}
                </View>
              )}

              {/* 모든 리뷰 */}
              <View style={styles.block}>
                <ThemedText style={styles.blockTitleStrong}>
                  모든 리뷰 {reviewCount}
                </ThemedText>

                {/* 평점 요약 카드 */}
                <View style={styles.ratingSummaryCard}>
                  <View style={styles.ratingSummaryTop}>
                    <Stars rating={averageRating} size={24} />
                    <ThemedText style={styles.ratingSummaryScore}>
                      {averageRating.toFixed(1)}
                    </ThemedText>
                  </View>
                  <ThemedText type="small" style={styles.ratingSummaryCount}>
                    총 {reviewCount}개 평점
                  </ThemedText>
                </View>

                {reviewsData && reviewsData.content.length > 0 ? (
                  reviewsData.content.map((review) => (
                    <View key={review.reviewId} style={styles.reviewItem}>
                      <View style={styles.reviewerRow}>
                        <View style={styles.reviewerAvatar}>
                          <Image
                            source={require('@/assets/images/white-cat.png')}
                            style={styles.reviewerAvatarImage}
                            contentFit="contain"
                          />
                        </View>
                        <View>
                          <ThemedText type="small" style={styles.reviewerName}>
                            {review.username}
                          </ThemedText>
                          <ThemedText style={styles.reviewDate}>
                            {new Date(review.createdAt).toLocaleDateString('ko-KR', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })}
                          </ThemedText>
                        </View>
                      </View>
                      <Stars rating={review.rating} />
                      <ThemedText type="small" style={styles.reviewContent}>
                        {review.content}
                      </ThemedText>
                      {review.isMyReview && (
                        <Pressable
                          onPress={() => handleDeleteReview(review.reviewId)}
                          style={styles.reviewDelete}>
                          <ThemedText style={styles.reviewDeleteText}>
                            삭제
                          </ThemedText>
                        </Pressable>
                      )}
                    </View>
                  ))
                ) : (
                  <ThemedText type="small" style={styles.noReviews}>
                    아직 리뷰가 없습니다.
                  </ThemedText>
                )}
              </View>
            </>
          )}
        </View>
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
  mutedText: {
    color: colors.textMuted,
  },
  // ── 히어로 ──
  heroWrap: {
    height: 320,
  },
  heroImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.6,
  },
  heroDim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  heroFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 160,
  },
  overlayHeader: {
    marginTop: spacing.xxl + spacing.lg,
    height: 50,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  posterWrap: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xxl,
  },
  poster: {
    borderRadius: radius.sm,
    overflow: 'hidden',
    backgroundColor: colors.surfaceDeep,
  },
  posterImage: {
    width: '100%',
    height: '100%',
  },
  // ── 작품 정보 ──
  infoSection: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  domainBadge: {
    backgroundColor: '#E9E1FF',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  domainBadgeText: {
    fontSize: 12,
    lineHeight: 16,
    color: colors.accent,
  },
  subInfo: {
    color: colors.textBright,
    marginTop: 2,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  ratingText: {
    color: colors.accent,
  },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    marginTop: spacing.xxl,
  },
  statCell: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  statDivider: {
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '600',
  },
  statLabel: {
    color: colors.textBright,
    fontWeight: '500',
  },
  // ── 액션 3버튼 ──
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-start',
    gap: spacing.xxl + spacing.lg,
    marginTop: spacing.xxl,
    maxWidth: 320,
    alignSelf: 'center',
  },
  actionItem: {
    alignItems: 'center',
    gap: 6,
    minWidth: 64,
  },
  actionIcon: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIconImage: {
    width: 24,
    height: 24,
  },
  actionLabel: {
    color: colors.textFaint,
  },
  actionLabelActive: {
    color: colors.textPrimary,
  },
  ratingAnchor: {
    minWidth: 64,
    alignItems: 'center',
  },
  ratingPopupWrap: {
    alignItems: 'center',
  },
  ratingPill: {
    width: 160,
    height: 56,
    backgroundColor: colors.surface,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginBottom: spacing.sm,
  },
  ratingPillButton: {
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  ratingPillIcon: {
    width: 20,
    height: 20,
    marginBottom: 2,
  },
  ratingPillText: {
    fontSize: 11,
    lineHeight: 14,
    color: colors.textPrimary,
  },
  ratingPillDivider: {
    width: 1,
    height: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  ratingClose: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ratingCloseText: {
    fontSize: 12,
    lineHeight: 14,
    color: colors.textPrimary,
  },
  // ── 플랫폼 원형 ──
  platformSection: {
    marginTop: spacing.xxl + spacing.sm,
  },
  platformTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  platformRow: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  platformItem: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  platformCircle: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  platformInitial: {
    fontSize: 11,
    fontWeight: '500',
  },
  platformLogo: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
  },
  platformLabel: {
    fontSize: 12,
  },
  // ── 탭 ──
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginTop: spacing.xxl,
    paddingHorizontal: spacing.xl,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: colors.textPrimary,
  },
  tabText: {
    fontSize: 16,
    color: colors.textMuted,
  },
  tabTextActive: {
    color: colors.textPrimary,
    fontWeight: '600',
  },
  tabContent: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    paddingBottom: spacing.xxl * 3,
  },
  block: {
    marginBottom: spacing.xxl,
  },
  blockTitle: {
    fontSize: 16,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  blockTitleStrong: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  synopsis: {
    color: colors.textBright,
    lineHeight: 22,
  },
  expandHint: {
    color: colors.accent,
    marginTop: spacing.xs,
  },
  divider: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginBottom: spacing.xxl,
  },
  fieldTable: {
    gap: spacing.sm,
    marginBottom: spacing.xxl,
  },
  fieldRow: {
    flexDirection: 'row',
    padding: spacing.xs,
    borderRadius: radius.sm,
  },
  fieldLabel: {
    color: colors.textMuted,
    minWidth: 80,
  },
  fieldValue: {
    flex: 1,
    color: colors.textPrimary,
  },
  platformInfoGroup: {
    marginBottom: spacing.lg,
  },
  platformInfoName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  platformInfoCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  platformInfoLabel: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 4,
  },
  platformInfoValue: {
    color: colors.textPrimary,
  },
  platformInfoLink: {
    color: colors.accent,
    textDecorationLine: 'underline',
  },
  // ── 리뷰 탭 ──
  myReviewCard: {
    borderWidth: 2,
    borderColor: colors.accent,
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  writePrompt: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing.lg,
  },
  writePromptText: {
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  writeButton: {
    backgroundColor: colors.accent,
    borderRadius: 4,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  writeButtonText: {
    color: colors.textPrimary,
  },
  ratingSummaryCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  ratingSummaryTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ratingSummaryScore: {
    fontSize: 24,
    fontWeight: '600',
  },
  ratingSummaryCount: {
    marginTop: spacing.xs,
  },
  reviewItem: {
    padding: spacing.sm,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  reviewerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  reviewerAvatar: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: '#363539',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewerAvatarImage: {
    width: 24,
    height: 24,
  },
  reviewerName: {
    fontWeight: '600',
  },
  reviewDate: {
    fontSize: 12,
    color: colors.textBright,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 2,
  },
  reviewContent: {
    color: colors.textPrimary,
  },
  reviewDelete: {
    alignSelf: 'flex-end',
  },
  reviewDeleteText: {
    fontSize: 12,
    color: colors.error,
  },
  noReviews: {
    textAlign: 'center',
    color: colors.textMuted,
    paddingVertical: spacing.xxl,
  },
});

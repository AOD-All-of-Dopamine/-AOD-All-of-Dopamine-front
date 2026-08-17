import { useEffect, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { keepPreviousData } from '@tanstack/react-query';
import {
  ArrowSquareOut,
  BookmarkSimple,
  CalendarCheck,
  CaretDown,
  CaretUp,
  ChatCircleDots,
  PencilSimple,
  StackPlus,
  Star,
  ThumbsUp,
  WarningCircle,
} from 'phosphor-react-native';

import { AddToCollectionSheet } from '@/components/ui/AddToCollectionSheet';
import { DetailTopBar } from '@/components/ui/DetailTopBar';
import { EmptyState, EmptyStateAction } from '@/components/ui/EmptyState';
import { SkeletonBlock, SkeletonPulse } from '@/components/ui/Skeleton';
import { Tag } from '@/components/ui/Tag';
import { domainFallbackIcon } from '@/components/ui/WorkCard';
import { WEEKDAY_KO } from '@/components/ui/workCardInfo';
import { ThemedText } from '@/components/themed-text';
import { useAuth } from '@/auth/AuthContext';
import {
  useBookmarkStatus,
  useLikeStats,
  useReviews,
  useToggleBookmark,
  useToggleLike,
  useWorkDetail,
} from '@aod/shared/hooks';
import {
  DOMAIN_LABEL_MAP,
  STEAM_REVIEW_DESC_KO,
  formatFieldValue,
  getFieldLabel,
  getPlatformLabel,
} from '@aod/shared/constants';
import { PLATFORM_META } from '@/constants/platforms';
import { Palette, Radius } from '@/constants/theme';

/**
 * 작품 상세 (목업 mobile-light-mockup 프레임 6·7·8) - 웹 work-detail-page의
 * <lg 모바일 문법 이식.
 * - 상단 56px 뒤로가기+작품명 바(DetailTopBar)
 * - 헤더: 게임=16:9 풀블리드 히어로 / 그 외=포스터(108px, 3:4)+정보 블록.
 *   부제는 도메인별(게임=연도·개발사, 웹툰/웹소설=작가, 영화=연도·감독, TV=연도)
 * - 통계 패널(d-stat): 게임=Steam desc+%+리뷰 수, 영화/TV=★TMDB 평점+참여 수 -
 *   데이터 없으면 패널 생략. 웹툰은 요일·연재 필(accent-tint)
 * - 섹션: 볼 수 있는 곳 -> 시놉시스(4줄 클램프+더보기) -> 작품 정보 -> 리뷰
 * - 하단 고정 액션 바: 관심 등록(accent-ink fill) + 좋아요·리뷰·담기(48px 고스트
 *   원형). 핸들러·옵티미스틱 전이는 기존 shared 훅 로직 그대로, isPending 직렬화.
 *
 * 목업 대비 편차 (웹 <lg와 동일):
 * - "비슷한 작품" 섹션 생략 - 추천 API 없음.
 * - "볼 수 있는 곳"은 platformInfo에서 url을 가진 플랫폼만 외부 링크로 노출,
 *   url이 하나도 없으면 섹션 숨김.
 * - 리뷰 더 보기는 size 증가 재조회(keepPreviousData) - 웹 트레이드오프 동일.
 * - 구 화면의 싫어요·공유·리뷰 삭제 UI는 목업에 없어 미이식 (리뷰 삭제는
 *   프로필 > 내 리뷰에서 가능). 시놉시스는 구 화면대로 HTML 태그 제거 후 표기
 *   (게임 수집 원문에 HTML 실재).
 */

const REVIEW_PAGE_SIZE = 20;
const SYNOPSIS_CLAMP_LINES = 4;

/** 정보 패널 행 순서 - domainInfo가 서버에서 HashMap이라 순서 고정 (웹 미러) */
const INFO_KEY_ORDER = [
  'directors',
  'cast',
  'runtime',
  'seasonCount',
  'episodeRuntime',
  'developer',
  'publisher',
  'author',
  'status',
  'weekday',
  'ageRating',
  'releaseDate',
  'firstAirDate',
  'startedAt',
  'platforms',
];

const orderIndex = (key: string) => {
  const i = INFO_KEY_ORDER.indexOf(key);
  return i === -1 ? INFO_KEY_ORDER.length : i;
};

/** 정보 패널에서 빈 값(null, 빈 문자열, 빈 배열, 빈 객체) 행 제거 (웹 미러) */
const hasInfoValue = (value: unknown): boolean => {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim() !== '';
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object') return Object.keys(value).length > 0;
  return true;
};

const asText = (v: unknown) =>
  typeof v === 'string' && v.trim() !== '' ? v.trim() : undefined;

const stripHtml = (s: string) =>
  s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

/** 섹션 제목 (목업 .d-section h2) */
function SectionTitle({ children }: { children: ReactNode }) {
  return <ThemedText style={styles.sectionTitle}>{children}</ThemedText>;
}

function DetailSkeleton() {
  return (
    <SkeletonPulse style={styles.skeleton}>
      <View style={styles.skeletonHead}>
        <SkeletonBlock width={108} aspectRatio={3 / 4} radius={Radius.panel} />
        <View style={styles.skeletonHeadInfo}>
          <SkeletonBlock height={22} width={56} radius={Radius.pill} />
          <SkeletonBlock height={22} width="80%" style={styles.skeletonGapSm} />
          <SkeletonBlock height={14} width={112} style={styles.skeletonGapSm} />
        </View>
      </View>
      <View style={styles.skeletonTags}>
        <SkeletonBlock height={24} width={56} radius={Radius.pill} />
        <SkeletonBlock height={24} width={64} radius={Radius.pill} />
      </View>
      <SkeletonBlock height={20} width={80} style={styles.skeletonGapLg} />
      <SkeletonBlock height={14} width="100%" style={styles.skeletonGapSm} />
      <SkeletonBlock height={14} width="80%" style={styles.skeletonGapSm} />
      <SkeletonBlock height={14} width="60%" style={styles.skeletonGapSm} />
    </SkeletonPulse>
  );
}

export default function WorkDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const contentId = id ? Number(id) : 0;
  const { state: authState } = useAuth();
  const isAuthenticated = authState.status === 'authenticated';

  const [reviewSize, setReviewSize] = useState(REVIEW_PAGE_SIZE);
  const [isSynopsisOpen, setIsSynopsisOpen] = useState(false);
  // 클램프 초과 판정 - 화면 밖 측정용 클론의 전체 줄 수 (null = 미측정)
  const [synopsisLines, setSynopsisLines] = useState<number | null>(null);
  const [isCollectSheetOpen, setIsCollectSheetOpen] = useState(false);

  const {
    data: work,
    isLoading,
    isError,
    refetch,
  } = useWorkDetail(contentId);
  // 더 보기 = size 증가 재조회 (파일 상단 트레이드오프 주석 참고)
  const { data: reviewsData, isFetching: reviewsFetching } = useReviews(
    contentId,
    0,
    reviewSize,
    { placeholderData: keepPreviousData },
  );
  const { data: likeStats } = useLikeStats(contentId);
  // privateApi 조회라 비로그인에서는 발사하지 않는다 (401 방지)
  const { data: bookmarkStatus } = useBookmarkStatus(contentId, isAuthenticated);

  const toggleLikeMutation = useToggleLike(contentId);
  const toggleBookmarkMutation = useToggleBookmark(contentId);

  useEffect(() => {
    setReviewSize(REVIEW_PAGE_SIZE);
    setIsSynopsisOpen(false);
    setSynopsisLines(null);
  }, [contentId]);

  const requireLogin = () =>
    Alert.alert('로그인이 필요한 기능이에요', '로그인 후 이용해 주세요.', [
      { text: '취소', style: 'cancel' },
      { text: '로그인', onPress: () => router.push('/login') },
    ]);

  const handleBookmark = () => {
    if (!isAuthenticated) {
      requireLogin();
      return;
    }
    if (toggleBookmarkMutation.isPending) return;
    toggleBookmarkMutation.mutate();
  };

  const handleLike = () => {
    if (!isAuthenticated) {
      requireLogin();
      return;
    }
    // 서버 toggleLikeType이 전환을 원자 처리 - 단일 POST, isPending 직렬화
    if (toggleLikeMutation.isPending) return;
    toggleLikeMutation.mutate();
  };

  const handleWriteReview = () => {
    if (!isAuthenticated) {
      requireLogin();
      return;
    }
    router.push({ pathname: '/review/[id]', params: { id: String(contentId) } });
  };

  const handleCollect = () => {
    if (!isAuthenticated) {
      requireLogin();
      return;
    }
    setIsCollectSheetOpen(true);
  };

  if (isLoading || isError || !work) {
    return (
      <View style={styles.screen}>
        <SafeAreaView edges={['top']} style={styles.topBar}>
          <DetailTopBar title="" />
        </SafeAreaView>
        {isLoading ? (
          <DetailSkeleton />
        ) : isError ? (
          <EmptyState
            icon={<WarningCircle size={44} color={Palette.ink3} />}
            title="작품 정보를 불러오지 못했어요"
            description="네트워크 상태를 확인한 뒤 다시 시도해 주세요."
            action={
              <EmptyStateAction label="다시 시도" onPress={() => refetch()} />
            }
          />
        ) : (
          <EmptyState
            title="작품을 찾을 수 없어요"
            description="주소가 잘못되었거나 삭제된 작품일 수 있어요."
            action={
              <EmptyStateAction
                label="탐색으로 가기"
                onPress={() => router.push('/(tabs)/explore')}
              />
            }
          />
        )}
      </View>
    );
  }

  const isGame = work.domain === 'GAME';
  const domainLabel = DOMAIN_LABEL_MAP[work.domain] ?? work.domain;
  const year = work.releaseDate?.slice(0, 4);
  const info = work.domainInfo ?? {};

  // 헤더 부제 - 도메인별 (목업: 게임 "2000 · Valve", 웹툰 "WINSTON",
  // 영화 "2026 · Leila Sy 감독"). TV는 감독 키가 없어 연도만. (웹 미러)
  const subtitle = (() => {
    switch (work.domain) {
      case 'GAME':
        return [year, asText(info.developer)].filter(Boolean).join(' · ');
      case 'WEBTOON':
      case 'WEBNOVEL':
        return asText(info.author) ?? year ?? '';
      case 'MOVIE': {
        const director = Array.isArray(info.directors)
          ? info.directors.map(asText).find(Boolean)
          : undefined;
        return [year, director && `${director} 감독`].filter(Boolean).join(' · ');
      }
      default:
        return year ?? '';
    }
  })();

  // 태그 행 - 실데이터 중복 장르 dedupe (웹 미러)
  const genres = Array.isArray(info.genres)
    ? [...new Set((info.genres as unknown[]).filter((g): g is string => typeof g === 'string'))]
    : [];

  // 웹툰 요일 필 - "화요웹툰 · 연재중" (workCardInfo 웹툰 footer와 동일 규약)
  const webtoonPill = (() => {
    if (work.domain !== 'WEBTOON') return null;
    const status = asText(info.status);
    const weekday = asText(info.weekday);
    const weekdayKo = weekday ? WEEKDAY_KO[weekday] : undefined;
    if (status === '연재중')
      return weekdayKo ? `${weekdayKo}요웹툰 · 연재중` : '연재중';
    if (status === '완결') return '완결';
    return null;
  })();

  // 게임 통계 패널: Steam 리뷰 집계(attr.review_summary)가 있을 때만 (웹 미러)
  const steamSummary = (() => {
    if (!isGame) return null;
    const entry = Object.entries(work.platformInfo ?? {}).find(
      ([key]) => key.toLowerCase() === 'steam',
    );
    const raw = entry?.[1]?.review_summary;
    if (!raw || typeof raw !== 'object') return null;
    const total = Number(raw.total_reviews);
    const positive = Number(raw.total_positive);
    if (!Number.isFinite(total) || total <= 0 || !Number.isFinite(positive)) {
      return null;
    }
    const desc = raw.review_score_desc;
    const label =
      typeof desc === 'string' ? (STEAM_REVIEW_DESC_KO[desc] ?? desc) : '긍정적';
    return { label, percent: Math.round((positive / total) * 100), total };
  })();

  // 영화/TV 통계 패널: platformInfo의 TMDB rating이 있을 때만 (웹 미러)
  const tmdbStat = (() => {
    if (work.domain !== 'MOVIE' && work.domain !== 'TV') return null;
    const entry = Object.entries(work.platformInfo ?? {}).find(([key]) =>
      key.toUpperCase().startsWith('TMDB'),
    );
    const rating = Number(entry?.[1]?.rating);
    if (!Number.isFinite(rating) || rating <= 0) return null;
    const votes = Number(entry?.[1]?.vote_count);
    return {
      rating,
      votes: Number.isFinite(votes) && votes > 0 ? votes : undefined,
    };
  })();

  // 볼 수 있는 곳: url을 가진 플랫폼만 외부 링크 버튼으로 (웹 미러)
  const watchLinks = Object.entries(work.platformInfo ?? {}).flatMap(
    ([key, platformData]) => {
      const url = platformData?.url;
      return typeof url === 'string' && url.startsWith('http')
        ? [
            {
              key,
              url,
              label: PLATFORM_META[key]?.label ?? getPlatformLabel(key),
            },
          ]
        : [];
    },
  );

  const infoRows = Object.entries(info)
    .filter(([key, value]) => key !== 'genres' && hasInfoValue(value))
    .sort(([a], [b]) => orderIndex(a) - orderIndex(b))
    .map(([key, value]) => ({
      key,
      label: getFieldLabel(key, 'domain'),
      value:
        key === 'platforms' && Array.isArray(value)
          ? value
              .map(
                (p) =>
                  PLATFORM_META[String(p)]?.label ?? getPlatformLabel(String(p)),
              )
              .join(', ')
          : formatFieldValue(key, value),
    }));

  const synopsis = work.synopsis ? stripHtml(work.synopsis) : '';
  const synopsisClamped = (synopsisLines ?? 0) > SYNOPSIS_CLAMP_LINES;

  const reviews = reviewsData?.content ?? [];
  const reviewCount = reviewsData?.totalElements ?? 0;

  const bookmarked = bookmarkStatus?.bookmarked === true;
  const liked = likeStats?.userLikeType === 'LIKE';

  const FallbackIcon = domainFallbackIcon(work.domain);
  const thumbContent = work.thumbnail ? (
    <Image
      source={{ uri: work.thumbnail }}
      style={styles.fill}
      contentFit="cover"
      transition={200}
    />
  ) : (
    <View style={styles.thumbFallback}>
      <FallbackIcon size={40} color={Palette.ink3} />
    </View>
  );

  return (
    <View style={styles.screen}>
      <SafeAreaView edges={['top']} style={styles.topBar}>
        <DetailTopBar title={work.title} />
      </SafeAreaView>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}>
        {/* 헤더 - 게임: 16:9 풀블리드 히어로 (프레임 6) / 그 외: 포스터 헤더 (프레임 7·8) */}
        {isGame ? (
          <>
            <View style={styles.hero}>{thumbContent}</View>
            <View style={styles.head}>
              <Tag variant="accent">{domainLabel}</Tag>
              <ThemedText style={styles.title}>{work.title}</ThemedText>
              {!!subtitle && (
                <ThemedText style={styles.subtitle}>{subtitle}</ThemedText>
              )}
            </View>
          </>
        ) : (
          <View style={styles.posterHead}>
            <View style={styles.poster}>{thumbContent}</View>
            <View style={styles.posterInfo}>
              <Tag variant="accent">{domainLabel}</Tag>
              <ThemedText style={[styles.title, styles.posterTitle]}>
                {work.title}
              </ThemedText>
              {!!subtitle && (
                <ThemedText style={styles.subtitle}>{subtitle}</ThemedText>
              )}
              {webtoonPill && (
                <View style={styles.weekPill}>
                  <CalendarCheck size={13} color={Palette.accentInk} />
                  <ThemedText style={styles.weekPillText}>
                    {webtoonPill}
                  </ThemedText>
                </View>
              )}
            </View>
          </View>
        )}

        {/* 장르 태그 (목업 .d-tags) */}
        {genres.length > 0 && (
          <View style={styles.tags}>
            {genres.map((g) => (
              <Tag key={g} variant="surface">
                {g}
              </Tag>
            ))}
          </View>
        )}

        {/* 통계 패널 (목업 .d-stat) - 데이터 있는 도메인만 */}
        {steamSummary && (
          <View style={styles.statPanel}>
            <ThumbsUp size={18} weight="fill" color={Palette.accentInk} />
            <ThemedText style={styles.statValue}>
              {steamSummary.label}
            </ThemedText>
            <ThemedText style={styles.statPercent}>
              {steamSummary.percent}%
            </ThemedText>
            <ThemedText style={styles.statSource}>
              Steam 리뷰 {steamSummary.total.toLocaleString()}개
            </ThemedText>
          </View>
        )}
        {tmdbStat && (
          <View style={styles.statPanel}>
            <Star size={18} weight="fill" color={Palette.star} />
            <ThemedText style={styles.statValue}>
              {tmdbStat.rating.toFixed(1)}
            </ThemedText>
            <ThemedText style={styles.statSource}>
              TMDB 평점
              {tmdbStat.votes
                ? ` · ${tmdbStat.votes.toLocaleString()}명 참여`
                : ''}
            </ThemedText>
          </View>
        )}

        {/* 볼 수 있는 곳 (목업 .ott-row) */}
        {watchLinks.length > 0 && (
          <View style={styles.section}>
            <SectionTitle>볼 수 있는 곳</SectionTitle>
            <View style={styles.ottRow}>
              {watchLinks.map(({ key, url, label }) => (
                <Pressable
                  key={key}
                  accessibilityRole="link"
                  onPress={() => Linking.openURL(url)}
                  style={({ pressed }) => [
                    styles.ott,
                    pressed && styles.pressedDim,
                  ]}>
                  <ThemedText style={styles.ottText}>{label}</ThemedText>
                  <ArrowSquareOut size={14} color={Palette.ink3} />
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {/* 시놉시스 - 4줄 클램프 + 더보기 (목업 .d-syn/.d-more) */}
        <View style={styles.section}>
          <SectionTitle>시놉시스</SectionTitle>
          {synopsis ? (
            <>
              <ThemedText
                numberOfLines={isSynopsisOpen ? undefined : SYNOPSIS_CLAMP_LINES}
                style={styles.synopsis}>
                {synopsis}
              </ThemedText>
              {/* 측정용 클론 - 전체 줄 수로 클램프 초과를 판정 (1회, 화면 밖) */}
              {synopsisLines === null && (
                <ThemedText
                  aria-hidden
                  onTextLayout={(e) =>
                    setSynopsisLines(e.nativeEvent.lines.length)
                  }
                  style={[styles.synopsis, styles.synopsisMeasure]}>
                  {synopsis}
                </ThemedText>
              )}
              {synopsisClamped && (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setIsSynopsisOpen((open) => !open)}
                  hitSlop={6}
                  style={({ pressed }) => [
                    styles.synMore,
                    pressed && styles.pressedDim,
                  ]}>
                  <ThemedText style={styles.synMoreText}>
                    {isSynopsisOpen ? '접기' : '더보기'}
                  </ThemedText>
                  {isSynopsisOpen ? (
                    <CaretUp size={13} color={Palette.ink} />
                  ) : (
                    <CaretDown size={13} color={Palette.ink} />
                  )}
                </Pressable>
              )}
            </>
          ) : (
            <ThemedText style={styles.synopsisEmpty}>
              시놉시스가 아직 준비되지 않았어요.
            </ThemedText>
          )}
        </View>

        {/* 작품 정보 (목업 .info-panel) */}
        {infoRows.length > 0 && (
          <View style={styles.section}>
            <SectionTitle>작품 정보</SectionTitle>
            <View style={styles.infoPanel}>
              {infoRows.map(({ key, label, value }, index) => (
                <View
                  key={key}
                  style={[styles.infoRow, index === 0 && styles.infoRowFirst]}>
                  <ThemedText style={styles.infoKey}>{label}</ThemedText>
                  <ThemedText style={styles.infoValue}>{value}</ThemedText>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* 리뷰 (목업 .d-section 리뷰 + .review-empty) - 기존 데이터 로직 유지 */}
        <View style={styles.section}>
          <View style={styles.reviewHead}>
            <SectionTitle>리뷰</SectionTitle>
            <ThemedText style={styles.reviewCount}>{reviewCount}</ThemedText>
          </View>
          {reviewsData === undefined ? (
            <SkeletonPulse>
              <SkeletonBlock height={92} radius={Radius.panel} />
            </SkeletonPulse>
          ) : reviews.length > 0 ? (
            <>
              <View style={styles.reviewList}>
                {reviews.map((review) => (
                  <View key={review.reviewId} style={styles.reviewCard}>
                    <View style={styles.reviewCardHead}>
                      <ThemedText numberOfLines={1} style={styles.reviewName}>
                        {review.username}
                      </ThemedText>
                      <ThemedText style={styles.reviewDate}>
                        {review.createdAt?.slice(0, 10) ?? ''}
                      </ThemedText>
                    </View>
                    <View style={styles.reviewStars}>
                      <Star size={13} weight="fill" color={Palette.star} />
                      <ThemedText style={styles.reviewRating}>
                        {review.rating.toFixed(1)}
                      </ThemedText>
                    </View>
                    <ThemedText style={styles.reviewContent}>
                      {review.content}
                    </ThemedText>
                  </View>
                ))}
              </View>
              {!reviewsData.last && (
                <Pressable
                  accessibilityRole="button"
                  disabled={reviewsFetching}
                  onPress={() => setReviewSize((s) => s + REVIEW_PAGE_SIZE)}
                  style={({ pressed }) => [
                    styles.reviewMore,
                    pressed && styles.pressedDim,
                  ]}>
                  {reviewsFetching ? (
                    <ActivityIndicator size="small" color={Palette.ink2} />
                  ) : (
                    <ThemedText style={styles.reviewMoreText}>
                      리뷰 더 보기
                    </ThemedText>
                  )}
                </Pressable>
              )}
            </>
          ) : (
            <View style={styles.reviewEmpty}>
              <ChatCircleDots size={26} color={Palette.ink3} />
              <ThemedText style={styles.reviewEmptyText}>
                아직 리뷰가 없어요. 첫 번째 리뷰를 남겨보세요.
              </ThemedText>
            </View>
          )}
        </View>
      </ScrollView>

      {/* 하단 고정 액션 바 (목업 .d-actionbar) - safe-area 반영 */}
      <View
        style={[styles.actionBar, { paddingBottom: Math.max(14, insets.bottom) }]}>
        <Pressable
          accessibilityRole="button"
          disabled={toggleBookmarkMutation.isPending}
          onPress={handleBookmark}
          style={({ pressed }) => [
            styles.actFill,
            pressed && styles.pressedDim,
            toggleBookmarkMutation.isPending && styles.actDisabled,
          ]}>
          <BookmarkSimple
            size={17}
            weight={bookmarked ? 'fill' : 'regular'}
            color={Palette.surface}
          />
          <ThemedText style={styles.actFillText}>
            {bookmarked ? '관심 작품' : '관심 등록'}
          </ThemedText>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="좋아요"
          accessibilityState={{ selected: liked }}
          disabled={toggleLikeMutation.isPending}
          onPress={handleLike}
          style={({ pressed }) => [
            styles.actGhost,
            liked && styles.actGhostActive,
            pressed && styles.pressedDim,
            toggleLikeMutation.isPending && styles.actDisabled,
          ]}>
          <ThumbsUp
            size={20}
            weight={liked ? 'fill' : 'regular'}
            color={liked ? Palette.accentInk : Palette.ink}
          />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="리뷰 쓰기"
          onPress={handleWriteReview}
          style={({ pressed }) => [styles.actGhost, pressed && styles.pressedDim]}>
          <PencilSimple size={20} color={Palette.ink} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="컬렉션에 담기"
          onPress={handleCollect}
          style={({ pressed }) => [styles.actGhost, pressed && styles.pressedDim]}>
          <StackPlus size={20} color={Palette.ink} />
        </Pressable>
      </View>

      {/* 담기 바텀시트 (목업 5d) */}
      <AddToCollectionSheet
        contentId={contentId}
        domain={work.domain}
        visible={isCollectSheetOpen}
        onClose={() => setIsCollectSheetOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Palette.canvas,
  },
  topBar: {
    backgroundColor: Palette.surface,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  fill: {
    width: '100%',
    height: '100%',
  },
  pressedDim: {
    opacity: 0.8,
  },
  thumbFallback: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.8,
  },
  /* 스켈레톤 */
  skeleton: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  skeletonHead: {
    flexDirection: 'row',
    gap: 14,
  },
  skeletonHeadInfo: {
    flex: 1,
    paddingTop: 4,
  },
  skeletonTags: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 12,
  },
  skeletonGapSm: {
    marginTop: 8,
  },
  skeletonGapLg: {
    marginTop: 24,
  },
  /* 헤더 */
  hero: {
    aspectRatio: 16 / 9,
    backgroundColor: Palette.canvas,
    overflow: 'hidden',
  },
  head: {
    paddingTop: 16,
    paddingHorizontal: 16,
  },
  posterHead: {
    flexDirection: 'row',
    gap: 14,
    paddingTop: 16,
    paddingHorizontal: 16,
  },
  poster: {
    width: 108,
    aspectRatio: 3 / 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Palette.line,
    overflow: 'hidden',
    backgroundColor: Palette.canvas,
    // 목업 shadow-card 근사
    shadowColor: Palette.shadowInk,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  posterInfo: {
    flex: 1,
    minWidth: 0,
    alignItems: 'flex-start',
  },
  title: {
    marginTop: 8,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: 800,
    letterSpacing: -0.4,
    color: Palette.ink,
  },
  posterTitle: {
    marginTop: 7,
    fontSize: 20,
    lineHeight: 26,
  },
  subtitle: {
    marginTop: 3,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: 400,
    color: Palette.ink2,
  },
  weekPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 9,
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: Radius.pill,
    backgroundColor: Palette.accentTint,
  },
  weekPillText: {
    fontSize: 12.5,
    lineHeight: 17,
    fontWeight: 700,
    color: Palette.accentInk,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingTop: 12,
    paddingHorizontal: 16,
  },
  /* 통계 패널 */
  statPanel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 14,
    marginHorizontal: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.line,
    borderRadius: Radius.panel,
  },
  statValue: {
    fontSize: 14,
    lineHeight: 19,
    fontWeight: 800,
    color: Palette.ink,
  },
  statPercent: {
    fontSize: 14,
    lineHeight: 19,
    fontWeight: 400,
    color: Palette.ink,
    fontVariant: ['tabular-nums'],
  },
  statSource: {
    marginLeft: 'auto',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: 400,
    color: Palette.ink3,
  },
  /* 섹션 */
  section: {
    paddingTop: 22,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 16,
    lineHeight: 21,
    fontWeight: 800,
    color: Palette.ink,
    marginBottom: 9,
  },
  ottRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  ott: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Palette.lineStrong,
    backgroundColor: Palette.surface,
  },
  ottText: {
    fontSize: 13.5,
    lineHeight: 18,
    fontWeight: 600,
    color: Palette.ink,
  },
  synopsis: {
    fontSize: 14,
    lineHeight: 23,
    fontWeight: 400,
    color: Palette.ink2,
  },
  synopsisMeasure: {
    position: 'absolute',
    left: 16,
    right: 16,
    opacity: 0,
    zIndex: -1,
  },
  synopsisEmpty: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: 400,
    color: Palette.ink3,
  },
  synMore: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 6,
    alignSelf: 'flex-start',
  },
  synMoreText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: 600,
    color: Palette.ink,
  },
  /* 작품 정보 */
  infoPanel: {
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.line,
    borderRadius: Radius.panel,
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Palette.line,
  },
  infoRowFirst: {
    borderTopWidth: 0,
  },
  infoKey: {
    flexShrink: 0,
    fontSize: 13.5,
    lineHeight: 19,
    fontWeight: 400,
    color: Palette.ink3,
  },
  infoValue: {
    flexShrink: 1,
    fontSize: 13.5,
    lineHeight: 19,
    fontWeight: 600,
    color: Palette.ink,
    textAlign: 'right',
  },
  /* 리뷰 */
  reviewHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  reviewCount: {
    fontSize: 16,
    lineHeight: 21,
    fontWeight: 800,
    color: Palette.accentInk,
    fontVariant: ['tabular-nums'],
  },
  reviewList: {
    gap: 8,
  },
  reviewCard: {
    padding: 14,
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.line,
    borderRadius: Radius.panel,
  },
  reviewCardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  reviewName: {
    flexShrink: 1,
    fontSize: 13.5,
    lineHeight: 18,
    fontWeight: 700,
    color: Palette.ink,
  },
  reviewDate: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: 400,
    color: Palette.ink3,
  },
  reviewStars: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 4,
  },
  reviewRating: {
    fontSize: 13,
    lineHeight: 17,
    fontWeight: 700,
    color: Palette.star,
    fontVariant: ['tabular-nums'],
  },
  reviewContent: {
    marginTop: 6,
    fontSize: 13.5,
    lineHeight: 20,
    fontWeight: 400,
    color: Palette.ink2,
  },
  reviewMore: {
    marginTop: 10,
    paddingVertical: 12,
    borderRadius: Radius.input,
    borderWidth: 1,
    borderColor: Palette.line,
    backgroundColor: Palette.surface,
    alignItems: 'center',
  },
  reviewMoreText: {
    fontSize: 14,
    lineHeight: 19,
    fontWeight: 600,
    color: Palette.ink2,
  },
  reviewEmpty: {
    alignItems: 'center',
    gap: 6,
    paddingVertical: 26,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Palette.lineStrong,
    borderRadius: Radius.panel,
  },
  reviewEmptyText: {
    fontSize: 13.5,
    lineHeight: 19,
    fontWeight: 400,
    color: Palette.ink2,
    textAlign: 'center',
  },
  /* 액션 바 */
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: 10,
    paddingHorizontal: 16,
    backgroundColor: Palette.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Palette.line,
  },
  actFill: {
    flex: 1,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderRadius: Radius.pill,
    backgroundColor: Palette.accentInk,
  },
  actFillText: {
    fontSize: 14.5,
    lineHeight: 19,
    fontWeight: 700,
    color: Palette.surface,
  },
  actGhost: {
    width: 48,
    height: 48,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Palette.lineStrong,
    backgroundColor: Palette.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actGhostActive: {
    borderColor: 'transparent',
    backgroundColor: Palette.accentTint,
  },
  actDisabled: {
    opacity: 0.6,
  },
});

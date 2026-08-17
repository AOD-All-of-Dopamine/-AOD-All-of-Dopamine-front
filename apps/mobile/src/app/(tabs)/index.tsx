import { FlatList, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { CaretRight, Star } from 'phosphor-react-native';

import { AppHeader } from '@/components/ui/AppHeader';
import { SectionError } from '@/components/ui/SectionError';
import { SkeletonBlock, SkeletonPulse } from '@/components/ui/Skeleton';
import { domainFallbackIcon } from '@/components/ui/WorkCard';
import { ThemedText } from '@/components/themed-text';
import { useRecentReleases, useRecentReviewedWorks } from '@aod/shared/hooks';
import { DOMAIN_LABEL_MAP, watchPlatformLabels } from '@aod/shared/constants';
import type { WorkSummary } from '@aod/shared/types';
import { Overlay, Palette, Radius } from '@/constants/theme';

/**
 * 홈 (목업 mobile-light-mockup 프레임 1) - AppHeader + 히어로 카드(오늘의 추천) +
 * "새로 나온 작품" 가로 릴 + "방금 올라온 리뷰" 행.
 * 본문 검색창 없음 - 검색 진입은 헤더 아이콘 단일화 (목업 감사 결함 2 해결).
 *
 * 데이터·규율은 웹 home-page.tsx와 동일:
 * - 히어로: 추천 엔진 연동 전 임시 선정 - 최근 리뷰작 1건, 폴백은 신작 1건
 * - 릴 meta "도메인 · 플랫폼"(플랫폼 미수집 시 연도 폴백), 리뷰 행 meta "도메인 · 연도"
 * - 섹션별 상태 독립: 로딩=형태 스켈레톤 / 에러=인라인 SectionError / 0건=섹션 숨김
 *   (홈은 EmptyState 남발 금지)
 * - 히어로에 쓰인 작품은 릴·리뷰 섹션에서 중복 노출 제외
 */

const REVIEW_COUNT = 3;

const domainLabel = (domain?: string) =>
  DOMAIN_LABEL_MAP[domain ?? ''] ?? domain ?? '';

/** 히어로 meta - 시놉시스 부재로 연도·평점 (둘 다 없으면 생략, 웹 heroSub 동일) */
const heroMeta = (work: WorkSummary) => {
  const year = work.releaseDate?.slice(0, 4);
  const score = work.score > 0 ? `평점 ${work.score.toFixed(1)}` : undefined;
  const parts = [year, score].filter(Boolean);
  return parts.length > 0 ? parts.join(' · ') : undefined;
};

/** 릴 meta - "게임 · 스팀" (목업 .rail-card .m), 플랫폼 없으면 연도 폴백 */
const railMeta = (work: WorkSummary) => {
  const platform = watchPlatformLabels(work.platforms)[0];
  const year = work.releaseDate?.slice(0, 4);
  return [domainLabel(work.domain), platform ?? year].filter(Boolean).join(' · ');
};

/** 리뷰 행 meta - "시리즈 · 2026" (목업 .review-row .m) */
const reviewMeta = (work: WorkSummary) => {
  const year = work.releaseDate?.slice(0, 4);
  return [domainLabel(work.domain), year].filter(Boolean).join(' · ');
};

const pushWork = (id: number) =>
  router.push({ pathname: '/work/[id]', params: { id: String(id) } });

/** 섹션 헤더 (목업 .section-head) - 17px 제목 + 우측 더보기 */
function SectionHead({
  title,
  onMore,
}: {
  title: string;
  onMore?: () => void;
}) {
  return (
    <View style={styles.sectionHead}>
      <ThemedText style={styles.sectionTitle}>{title}</ThemedText>
      {onMore && (
        <Pressable
          accessibilityRole="button"
          onPress={onMore}
          hitSlop={8}
          style={({ pressed }) => [styles.more, pressed && styles.morePressed]}>
          <ThemedText style={styles.moreText}>더보기</ThemedText>
          <CaretRight size={13} color={Palette.ink2} />
        </Pressable>
      )}
    </View>
  );
}

/** 썸네일 폴백 - Phosphor 도메인 아이콘 중앙 배치 (구 웹 SVG 이식 폴백 대체) */
function ThumbFallback({ domain, size }: { domain?: string; size: number }) {
  const Icon = domainFallbackIcon(domain);
  return (
    <View style={styles.thumbFallback}>
      <Icon size={size} color={Palette.ink3} />
    </View>
  );
}

function RailCard({ work }: { work: WorkSummary }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => pushWork(work.id)}
      style={({ pressed }) => [styles.railCard, pressed && styles.pressed]}>
      <View style={styles.railThumbWrap}>
        {work.thumbnail ? (
          <Image
            source={{ uri: work.thumbnail }}
            style={styles.fill}
            contentFit="cover"
            transition={150}
          />
        ) : (
          <ThumbFallback domain={work.domain} size={28} />
        )}
      </View>
      <ThemedText numberOfLines={1} style={styles.railTitle}>
        {work.title}
      </ThemedText>
      <ThemedText numberOfLines={1} style={styles.railMeta}>
        {railMeta(work)}
      </ThemedText>
    </Pressable>
  );
}

function ReviewRow({ work }: { work: WorkSummary }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => pushWork(work.id)}
      style={({ pressed }) => [styles.reviewRow, pressed && styles.pressed]}>
      <View style={styles.reviewThumbWrap}>
        {work.thumbnail ? (
          <Image
            source={{ uri: work.thumbnail }}
            style={styles.fill}
            contentFit="cover"
            transition={150}
          />
        ) : (
          <ThumbFallback domain={work.domain} size={18} />
        )}
      </View>
      <View style={styles.reviewInfo}>
        <ThemedText numberOfLines={1} style={styles.reviewTitle}>
          {work.title}
        </ThemedText>
        {work.score > 0 && (
          <View style={styles.stars}>
            <Star weight="fill" size={13} color={Palette.star} />
            <ThemedText style={styles.starsText}>
              {work.score.toFixed(1)}
            </ThemedText>
          </View>
        )}
        <ThemedText numberOfLines={1} style={styles.reviewMeta}>
          {reviewMeta(work)}
        </ThemedText>
      </View>
    </Pressable>
  );
}

export default function HomeScreen() {
  const reviewed = useRecentReviewedWorks({ size: 6 });
  const releases = useRecentReleases({ size: 8 });

  // TODO: 추천 엔진 연동 시 교체 - 최근 리뷰작 1건(폴백: 신작 1건) 임시 선정 (웹 동일)
  const heroMain = reviewed.data?.content?.[0] ?? releases.data?.content?.[0];
  const heroLoading = reviewed.isLoading || releases.isLoading;
  const heroError = reviewed.isError && releases.isError;

  // 히어로 중복 노출 방지
  const railItems = (releases.data?.content ?? []).filter(
    (w) => w.id !== heroMain?.id,
  );
  const reviewItems = (reviewed.data?.content ?? [])
    .filter((w) => w.id !== heroMain?.id)
    .slice(0, REVIEW_COUNT);

  return (
    <View style={styles.screen}>
      <SafeAreaView edges={['top']} style={styles.top}>
        <AppHeader />
      </SafeAreaView>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}>
        {/* 히어로 카드 (목업 .hero-card) */}
        {heroLoading ? (
          <SkeletonPulse style={styles.heroSkeleton}>
            <SkeletonBlock aspectRatio={16 / 10} radius={Radius.panel} />
          </SkeletonPulse>
        ) : heroError ? (
          <SectionError
            style={styles.heroError}
            message="추천 작품을 불러오지 못했어요."
            onRetry={() => {
              reviewed.refetch();
              releases.refetch();
            }}
          />
        ) : heroMain ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => pushWork(heroMain.id)}
            style={({ pressed }) => [styles.hero, pressed && styles.pressed]}>
            {heroMain.thumbnail ? (
              <Image
                source={{ uri: heroMain.thumbnail }}
                style={styles.fill}
                contentFit="cover"
                transition={200}
              />
            ) : (
              <ThumbFallback domain={heroMain.domain} size={44} />
            )}
            <LinearGradient
              colors={['transparent', Overlay.heroGrad]}
              locations={[0.42, 1]}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.heroCopy}>
              <ThemedText style={styles.heroEyebrow}>
                {`오늘의 추천 · ${domainLabel(heroMain.domain)}`}
              </ThemedText>
              <ThemedText numberOfLines={2} style={styles.heroTitle}>
                {heroMain.title}
              </ThemedText>
              {heroMeta(heroMain) && (
                <ThemedText style={styles.heroMeta}>
                  {heroMeta(heroMain)}
                </ThemedText>
              )}
            </View>
          </Pressable>
        ) : null}

        {/* 새로 나온 작품 - 가로 릴 (목업 .rail) */}
        {(releases.isLoading || releases.isError || railItems.length > 0) && (
          <>
            <SectionHead
              title="새로 나온 작품"
              onMore={() => router.push('/(tabs)/new')}
            />
            {releases.isLoading ? (
              <SkeletonPulse style={styles.railSkeleton}>
                {Array.from({ length: 3 }, (_, i) => (
                  <View key={i} style={styles.railCard}>
                    <SkeletonBlock width={128} height={170} radius={10} />
                    <SkeletonBlock
                      height={13}
                      width="82%"
                      style={styles.railSkeletonLine}
                    />
                    <SkeletonBlock
                      height={11}
                      width="58%"
                      style={styles.railSkeletonSub}
                    />
                  </View>
                ))}
              </SkeletonPulse>
            ) : releases.isError ? (
              <SectionError
                style={styles.sectionErrorGap}
                message="신작을 불러오지 못했어요."
                onRetry={() => releases.refetch()}
              />
            ) : (
              <FlatList
                horizontal
                data={railItems}
                keyExtractor={(item) => String(item.id)}
                renderItem={({ item }) => <RailCard work={item} />}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.rail}
              />
            )}
          </>
        )}

        {/* 방금 올라온 리뷰 (목업 .review-row) - 더보기는 이동할 리뷰 목록 화면이
            없어 생략 (웹 동일 편차) */}
        {(reviewed.isLoading || reviewed.isError || reviewItems.length > 0) && (
          <>
            <SectionHead title="방금 올라온 리뷰" />
            {reviewed.isLoading ? (
              <SkeletonPulse>
                {Array.from({ length: 2 }, (_, i) => (
                  <View key={i} style={styles.reviewRow}>
                    <SkeletonBlock width={44} height={58} radius={6} />
                    <View style={styles.reviewInfo}>
                      <SkeletonBlock height={14} width="55%" />
                      <SkeletonBlock
                        height={11}
                        width="35%"
                        style={styles.reviewSkeletonSub}
                      />
                    </View>
                  </View>
                ))}
              </SkeletonPulse>
            ) : reviewed.isError ? (
              <SectionError
                style={styles.sectionErrorGap}
                message="최근 리뷰 작품을 불러오지 못했어요."
                onRetry={() => reviewed.refetch()}
              />
            ) : (
              reviewItems.map((work) => <ReviewRow key={work.id} work={work} />)
            )}
          </>
        )}
      </ScrollView>
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
  scroll: {
    flex: 1,
  },
  content: {
    paddingBottom: 28,
  },
  fill: {
    width: '100%',
    height: '100%',
  },
  pressed: {
    opacity: 0.85,
  },
  thumbFallback: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.line,
    opacity: 0.8,
  },
  /* 히어로 */
  hero: {
    marginTop: 14,
    marginHorizontal: 16,
    aspectRatio: 16 / 10,
    borderRadius: Radius.panel,
    overflow: 'hidden',
    backgroundColor: Palette.line,
    // 목업 shadow-card 근사
    shadowColor: Palette.shadowInk,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  heroSkeleton: {
    marginTop: 14,
    marginHorizontal: 16,
  },
  heroError: {
    marginTop: 14,
    marginHorizontal: 16,
  },
  heroCopy: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 14,
  },
  heroEyebrow: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: 600,
    color: Palette.surface,
    opacity: 0.85,
  },
  heroTitle: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: 800,
    letterSpacing: -0.4,
    color: Palette.surface,
  },
  heroMeta: {
    marginTop: 2,
    fontSize: 12.5,
    lineHeight: 17,
    fontWeight: 400,
    color: Palette.surface,
    opacity: 0.8,
  },
  /* 섹션 헤더 */
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingTop: 22,
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  sectionTitle: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: 800,
    letterSpacing: -0.2,
    color: Palette.ink,
  },
  more: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  morePressed: {
    opacity: 0.7,
  },
  moreText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: 500,
    color: Palette.ink2,
  },
  /* 릴 */
  rail: {
    paddingHorizontal: 16,
    gap: 10,
  },
  railSkeleton: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
  },
  railCard: {
    width: 128,
  },
  railThumbWrap: {
    width: 128,
    height: 170,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Palette.line,
    overflow: 'hidden',
    backgroundColor: Palette.canvas,
  },
  railTitle: {
    marginTop: 7,
    fontSize: 13.5,
    lineHeight: 17,
    fontWeight: 600,
    color: Palette.ink,
  },
  railMeta: {
    marginTop: 1,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: 400,
    color: Palette.ink3,
  },
  railSkeletonLine: {
    marginTop: 8,
  },
  railSkeletonSub: {
    marginTop: 5,
  },
  /* 리뷰 행 */
  reviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 10,
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.line,
    borderRadius: Radius.panel,
  },
  reviewThumbWrap: {
    width: 44,
    height: 58,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: Palette.canvas,
  },
  reviewInfo: {
    flex: 1,
    minWidth: 0,
  },
  reviewTitle: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: 600,
    color: Palette.ink,
  },
  stars: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 1,
  },
  starsText: {
    fontSize: 13,
    lineHeight: 17,
    fontWeight: 700,
    color: Palette.star,
    fontVariant: ['tabular-nums'],
  },
  reviewMeta: {
    marginTop: 1,
    fontSize: 12.5,
    lineHeight: 17,
    fontWeight: 400,
    color: Palette.ink3,
  },
  reviewSkeletonSub: {
    marginTop: 6,
  },
  sectionErrorGap: {
    marginHorizontal: 16,
  },
});

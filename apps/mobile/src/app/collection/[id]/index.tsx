import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import axios from 'axios';
import {
  Eye,
  Heart,
  LockSimple,
  PencilSimple,
  Star,
  WarningCircle,
} from 'phosphor-react-native';

import { CollectionCollage } from '@/components/ui/CollectionCollage';
import { CuratorAvatar } from '@/components/ui/CollectionCard';
import { DetailTopBar } from '@/components/ui/DetailTopBar';
import { EmptyState, EmptyStateAction } from '@/components/ui/EmptyState';
import { IconButton } from '@/components/ui/IconButton';
import { SkeletonBlock, SkeletonPulse } from '@/components/ui/Skeleton';
import { ToastPill, useToast } from '@/components/ui/Toast';
import { domainFallbackIcon } from '@/components/ui/WorkCard';
import {
  ageLabel,
  webtoonStatusLabel,
  workCardMeta,
  workCardTags,
} from '@/components/ui/workCardInfo';
import { ThemedText } from '@/components/themed-text';
import { useAuth } from '@/auth/AuthContext';
import { useCollectionDetail, useToggleCollectionLike } from '@aod/shared/hooks';
import type { CollectionItem } from '@aod/shared/api';
import { collectionDomainLabel, steamReviewDescKo } from '@aod/shared/constants';
import type { WorkSummary } from '@aod/shared/types';
import { Palette, Radius } from '@/constants/theme';

/**
 * 컬렉션 상세 (collections-mockup 5b) - 웹 collection-detail-page의 모바일 이식.
 * 뒤로가기+제목 바(owner면 편집 아이콘) / 16:10 풀블리드 콜라주 히어로 /
 * 도메인·제목·설명·큐레이터 메타(조회수) / 아이템 행(코멘트 말풍선 +
 * 도메인별 인라인 스탯) / 하단 고정 좋아요 액션 바.
 *
 * 좋아요: 옵티미스틱 ±1(useToggleCollectionLike - 조회수 회피 캐시 설계 소비),
 * 비로그인은 Alert 로그인 유도(모바일 관례), 실패는 토스트 안내 + 훅 롤백.
 *
 * 목업 대비 편차 (웹 동일 + 모바일 추가):
 * - "비슷한 컬렉션" 섹션 생략 - 추천 API 없음.
 * - 액션 바의 "전부 관심 등록" 고스트 생략 - 일괄 북마크 API 없음.
 * - 상단 공유 아이콘 생략 - 모바일 앱에 공유할 공개 웹 origin 상수가 없다
 *   (웹은 window.location 복사).
 */

/** CollectionItem -> WorkSummary 변환 (workCardInfo 파생 로직 재사용용, 웹 미러) */
const toWorkSummary = (item: CollectionItem): WorkSummary => ({
  id: item.contentId,
  domain: item.domain,
  title: item.title,
  thumbnail: item.posterUrl,
  score: item.score ?? 0,
  releaseDate: item.releaseDate ?? undefined,
  genres: item.genres,
  platforms: item.platforms,
  creator: item.creator,
  weekday: item.weekday,
  status: item.status,
  ageRating: item.ageRating,
  steamReviewDesc: item.steamReviewDesc,
  steamPositivePct: item.steamPositivePct,
  externalRating: item.externalRating,
});

/** 목업 item-meta - "연도 · 제작자 · 장르 상위 2" (웹 itemMetaLine 미러) */
const itemMetaLine = (work: WorkSummary): string | undefined => {
  const parts = [workCardMeta(work), ...(workCardTags(work)?.slice(0, 2) ?? [])];
  const line = parts.filter(Boolean).join(' · ');
  return line || undefined;
};

/**
 * 목업 .item-inline-stat - 도메인별 대표 스탯을 "강조값 + 보조값" 한 줄로.
 * workCardFooter의 파생 규칙(workCardInfo 헬퍼)과 동일 원천이나 배치(인접)가
 * 달라 로컬 조립. foot 규칙 전 도메인 커버: 게임=Steam desc+%, 영화/TV=★평점,
 * 웹툰=연재 상태+연령, 웹소설=연령.
 */
const itemInlineStat = (
  work: WorkSummary,
): { main?: string; sub?: string; star?: boolean } | null => {
  switch (work.domain) {
    case 'GAME': {
      const main = work.steamReviewDesc
        ? steamReviewDescKo(work.steamReviewDesc)
        : undefined;
      const sub =
        typeof work.steamPositivePct === 'number'
          ? `${work.steamPositivePct}%`
          : undefined;
      return main || sub ? { main, sub } : null;
    }
    case 'MOVIE':
    case 'TV': {
      const rating =
        typeof work.externalRating === 'number' && work.externalRating > 0
          ? work.externalRating.toFixed(1)
          : undefined;
      return rating ? { star: true, sub: rating } : null;
    }
    case 'WEBTOON': {
      const main = webtoonStatusLabel(work);
      const sub = ageLabel(work.ageRating);
      return main || sub ? { main, sub } : null;
    }
    case 'WEBNOVEL': {
      const main = ageLabel(work.ageRating);
      return main ? { main } : null;
    }
    default:
      return null;
  }
};

function CollectionItemRow({
  item,
  index,
  curator,
}: {
  item: CollectionItem;
  index: number;
  curator: string;
}) {
  const work = toWorkSummary(item);
  const isGame = item.domain === 'GAME';
  const meta = itemMetaLine(work);
  const stat = itemInlineStat(work);
  const FallbackIcon = domainFallbackIcon(item.domain);

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() =>
        router.push({
          pathname: '/work/[id]',
          params: { id: String(item.contentId) },
        })
      }
      style={({ pressed }) => [styles.itemRow, pressed && styles.pressedDim]}>
      <ThemedText style={styles.itemNo}>{index}</ThemedText>
      <View style={[styles.itemThumb, isGame ? styles.itemThumbGame : undefined]}>
        {item.posterUrl ? (
          <Image
            source={{ uri: item.posterUrl }}
            style={styles.fill}
            contentFit="cover"
            transition={150}
          />
        ) : (
          <View style={styles.itemThumbFallback}>
            <FallbackIcon size={20} color={Palette.ink3} />
          </View>
        )}
      </View>
      <View style={styles.itemMain}>
        <ThemedText style={styles.itemTitle}>{item.title}</ThemedText>
        {meta && <ThemedText style={styles.itemMeta}>{meta}</ThemedText>}
        {stat && (
          <View style={styles.itemStat}>
            {stat.main && (
              <ThemedText style={styles.itemStatMain}>{stat.main}</ThemedText>
            )}
            {stat.star && <Star size={12} weight="fill" color={Palette.star} />}
            {stat.sub && (
              <ThemedText
                style={stat.star ? styles.itemStatStar : styles.itemStatSub}>
                {stat.sub}
              </ThemedText>
            )}
          </View>
        )}
        {item.comment && (
          <View style={styles.itemNote}>
            <ThemedText style={styles.itemNoteText}>
              <ThemedText style={styles.itemNoteName}>{curator}:</ThemedText>{' '}
              {item.comment}
            </ThemedText>
          </View>
        )}
      </View>
    </Pressable>
  );
}

function DetailSkeleton() {
  return (
    <SkeletonPulse>
      <SkeletonBlock aspectRatio={16 / 10} radius={0} />
      <View style={styles.skeletonBody}>
        <SkeletonBlock height={13} width={72} />
        <SkeletonBlock height={22} width="78%" style={styles.skeletonGap} />
        <SkeletonBlock height={14} width="55%" style={styles.skeletonGap} />
        <View style={styles.skeletonMeta}>
          <SkeletonBlock height={26} width={26} radius={Radius.pill} />
          <SkeletonBlock height={13} width={128} />
        </View>
        {Array.from({ length: 2 }, (_, i) => (
          <SkeletonBlock
            key={i}
            height={96}
            radius={Radius.panel}
            style={styles.skeletonGapLg}
          />
        ))}
      </View>
    </SkeletonPulse>
  );
}

export default function CollectionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const collectionId = id ? Number(id) : 0;
  const { state: authState } = useAuth();
  const isAuthenticated = authState.status === 'authenticated';
  const { toast, showToast } = useToast();

  const { data, isLoading, isError, error, refetch } =
    useCollectionDetail(collectionId);
  const toggleLike = useToggleCollectionLike(collectionId);

  const status = axios.isAxiosError(error) ? error.response?.status : undefined;
  const isPrivate = status === 403;
  const notFound =
    !collectionId || Number.isNaN(collectionId) || status === 404;

  const handleLike = () => {
    if (!isAuthenticated) {
      Alert.alert('로그인이 필요한 기능이에요', '로그인 후 이용해 주세요.', [
        { text: '취소', style: 'cancel' },
        { text: '로그인', onPress: () => router.push('/login') },
      ]);
      return;
    }
    if (!data || toggleLike.isPending) return;
    // 실패 시 훅이 옵티미스틱 전이를 롤백한 뒤 여기서 토스트로 안내 (웹 관례)
    toggleLike.mutate(data.likedByMe, {
      onError: (likeError) => {
        const likeStatus = axios.isAxiosError(likeError)
          ? likeError.response?.status
          : undefined;
        showToast({
          message:
            likeStatus === 401
              ? '로그인이 만료됐어요. 다시 로그인해 주세요.'
              : '좋아요 처리에 실패했어요. 잠시 후 다시 시도해 주세요.',
        });
      },
    });
  };

  if (isLoading || isPrivate || notFound || isError || !data) {
    return (
      <View style={styles.screen}>
        <SafeAreaView edges={['top']} style={styles.top}>
          <DetailTopBar title={data?.title ?? '컬렉션'} />
        </SafeAreaView>
        {isLoading ? (
          <DetailSkeleton />
        ) : isPrivate ? (
          <EmptyState
            icon={<LockSimple size={44} color={Palette.ink3} />}
            title="비공개 컬렉션이에요"
            description="큐레이터만 볼 수 있는 컬렉션이에요."
            action={
              <EmptyStateAction
                label="컬렉션 둘러보기"
                onPress={() => router.push('/(tabs)/collections')}
              />
            }
          />
        ) : isError && !notFound ? (
          <EmptyState
            icon={<WarningCircle size={44} color={Palette.ink3} />}
            title="컬렉션을 불러오지 못했어요"
            description="네트워크 상태를 확인한 뒤 다시 시도해 주세요."
            action={
              <EmptyStateAction label="다시 시도" onPress={() => refetch()} />
            }
          />
        ) : (
          <EmptyState
            title="컬렉션을 찾을 수 없어요"
            description="주소가 잘못되었거나 삭제된 컬렉션일 수 있어요."
            action={
              <EmptyStateAction
                label="컬렉션 둘러보기"
                onPress={() => router.push('/(tabs)/collections')}
              />
            }
          />
        )}
      </View>
    );
  }

  const liked = data.likedByMe;

  return (
    <View style={styles.screen}>
      <SafeAreaView edges={['top']} style={styles.top}>
        <DetailTopBar
          title={data.title}
          actions={
            data.owner ? (
              <IconButton
                label="편집"
                onPress={() =>
                  router.push({
                    pathname: '/collection/[id]/edit',
                    params: { id: String(collectionId) },
                  })
                }>
                <PencilSimple size={21} color={Palette.ink} />
              </IconButton>
            ) : undefined
          }
        />
      </SafeAreaView>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}>
        {/* 풀블리드 16:10 콜라주 히어로 (목업 .m-det-collage) */}
        <CollectionCollage
          posters={data.coverPosters}
          tint={data.tint}
          domain={data.domain}
          style={styles.heroCollage}
        />

        <View style={styles.body}>
          <ThemedText style={styles.domain}>
            {collectionDomainLabel(data.domain)} 컬렉션
          </ThemedText>
          <ThemedText style={styles.title}>{data.title}</ThemedText>
          {data.description && (
            <ThemedText style={styles.desc}>{data.description}</ThemedText>
          )}
          <View style={styles.meta}>
            <CuratorAvatar name={data.curatorNickname} tint={data.tint} size={26} />
            <ThemedText style={styles.metaName}>
              {data.curatorNickname}
            </ThemedText>
            <ThemedText style={styles.metaSep}>·</ThemedText>
            <ThemedText style={styles.metaText}>
              {data.itemCount}작품
            </ThemedText>
            <ThemedText style={styles.metaSep}>·</ThemedText>
            <View style={styles.metaViews}>
              <Eye size={13} color={Palette.ink2} />
              <ThemedText style={styles.metaText}>
                {data.viewCount.toLocaleString()}
              </ThemedText>
            </View>
          </View>
        </View>

        {/* 담긴 작품 (목업 .shelf-head + .item-row) */}
        <ThemedText style={styles.shelfHead}>담긴 작품</ThemedText>
        {data.items.length > 0 ? (
          <View style={styles.itemList}>
            {data.items.map((item, i) => (
              <CollectionItemRow
                key={item.itemId}
                item={item}
                index={i + 1}
                curator={data.curatorNickname}
              />
            ))}
          </View>
        ) : (
          <View style={styles.emptyWrap}>
            <EmptyState
              variant="note"
              title={
                data.owner
                  ? '아직 담긴 작품이 없어요. 편집에서 작품을 담아 컬렉션을 채워보세요.'
                  : '아직 담긴 작품이 없어요. 큐레이터가 작품을 담으면 여기에 보여요.'
              }
            />
          </View>
        )}
      </ScrollView>

      {/* 하단 고정 좋아요 액션 바 (목업 .m-actionbar) */}
      <View
        style={[styles.actionBar, { paddingBottom: Math.max(14, insets.bottom) }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: liked }}
          disabled={toggleLike.isPending}
          onPress={handleLike}
          style={({ pressed }) => [
            styles.likeBtn,
            pressed && styles.pressedDim,
            toggleLike.isPending && styles.likeBtnDisabled,
          ]}>
          <Heart
            size={17}
            weight={liked ? 'fill' : 'regular'}
            color={Palette.surface}
          />
          <ThemedText style={styles.likeBtnText}>
            좋아요 {data.likeCount.toLocaleString()}
          </ThemedText>
        </Pressable>
      </View>

      {toast && (
        <ToastPill toast={toast} style={{ bottom: 88 + insets.bottom }} />
      )}
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
  scrollContent: {
    paddingBottom: 24,
  },
  fill: {
    width: '100%',
    height: '100%',
  },
  pressedDim: {
    opacity: 0.85,
  },
  heroCollage: {
    aspectRatio: 16 / 10,
  },
  body: {
    paddingTop: 14,
    paddingHorizontal: 16,
  },
  domain: {
    fontSize: 13,
    lineHeight: 17,
    fontWeight: 700,
    color: Palette.accentInk,
  },
  title: {
    marginTop: 4,
    fontSize: 21,
    lineHeight: 27,
    fontWeight: 800,
    letterSpacing: -0.4,
    color: Palette.ink,
  },
  desc: {
    marginTop: 6,
    fontSize: 13.5,
    lineHeight: 22,
    fontWeight: 400,
    color: Palette.ink2,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  metaName: {
    fontSize: 12.5,
    lineHeight: 17,
    fontWeight: 700,
    color: Palette.ink,
  },
  metaSep: {
    fontSize: 12.5,
    lineHeight: 17,
    color: Palette.ink3,
  },
  metaText: {
    fontSize: 12.5,
    lineHeight: 17,
    fontWeight: 400,
    color: Palette.ink2,
    fontVariant: ['tabular-nums'],
  },
  metaViews: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  shelfHead: {
    paddingTop: 18,
    paddingBottom: 10,
    paddingHorizontal: 16,
    fontSize: 16,
    lineHeight: 21,
    fontWeight: 800,
    color: Palette.ink,
  },
  itemList: {
    paddingHorizontal: 16,
    gap: 10,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 11,
    padding: 12,
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.line,
    borderRadius: Radius.panel,
  },
  itemNo: {
    width: 24,
    paddingTop: 2,
    textAlign: 'center',
    fontSize: 13.5,
    lineHeight: 18,
    fontWeight: 800,
    color: Palette.ink3,
    fontVariant: ['tabular-nums'],
  },
  itemThumb: {
    width: 64,
    aspectRatio: 3 / 4,
    borderRadius: Radius.input,
    borderWidth: 1,
    borderColor: Palette.line,
    overflow: 'hidden',
    backgroundColor: Palette.canvas,
  },
  itemThumbGame: {
    width: 88,
    aspectRatio: 16 / 9,
  },
  itemThumbFallback: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.8,
  },
  itemMain: {
    flex: 1,
    minWidth: 0,
  },
  itemTitle: {
    fontSize: 14,
    lineHeight: 19,
    fontWeight: 700,
    color: Palette.ink,
  },
  itemMeta: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: 400,
    color: Palette.ink3,
  },
  itemStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  itemStatMain: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: 700,
    color: Palette.ink,
  },
  itemStatSub: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: 400,
    color: Palette.ink2,
    fontVariant: ['tabular-nums'],
  },
  itemStatStar: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: 700,
    color: Palette.star,
    fontVariant: ['tabular-nums'],
  },
  itemNote: {
    marginTop: 7,
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Palette.line,
    backgroundColor: Palette.canvas,
  },
  itemNoteText: {
    fontSize: 12.5,
    lineHeight: 19,
    fontWeight: 400,
    color: Palette.ink2,
  },
  itemNoteName: {
    fontSize: 12.5,
    lineHeight: 19,
    fontWeight: 700,
    color: Palette.ink,
  },
  emptyWrap: {
    paddingHorizontal: 16,
  },
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
  likeBtn: {
    flex: 1,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderRadius: Radius.pill,
    backgroundColor: Palette.accentInk,
  },
  likeBtnDisabled: {
    opacity: 0.6,
  },
  likeBtnText: {
    fontSize: 14.5,
    lineHeight: 19,
    fontWeight: 700,
    color: Palette.surface,
    fontVariant: ['tabular-nums'],
  },
  /* 스켈레톤 */
  skeletonBody: {
    paddingTop: 14,
    paddingHorizontal: 16,
  },
  skeletonGap: {
    marginTop: 8,
  },
  skeletonGapLg: {
    marginTop: 14,
  },
  skeletonMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
});

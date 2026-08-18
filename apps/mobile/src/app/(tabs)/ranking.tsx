import { useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import { WarningCircle } from 'phosphor-react-native';

import { AppHeader } from '@/components/ui/AppHeader';
import { DomainChip } from '@/components/ui/DomainChip';
import { EmptyState, EmptyStateAction } from '@/components/ui/EmptyState';
import { SkeletonBlock, SkeletonPulse } from '@/components/ui/Skeleton';
import { domainFallbackIcon } from '@/components/ui/WorkCard';
import { ThemedText } from '@/components/themed-text';
import { usePlatformRankings } from '@aod/shared/hooks';
import { DOMAIN_LABEL_MAP, platformLabel } from '@aod/shared/constants';
import type { ExternalRanking } from '@aod/shared/api';
import { Palette, Radius } from '@/constants/theme';

/**
 * 랭킹 (목업 프레임 4) - 컴팩트 순위 행. 도메인 칩 + 플랫폼(랭킹 원천) 칩 +
 * 출처 캡션 + 순위 리스트 (1~3위 순번 accent-ink, 48x62 썸네일 - 단 게임
 * 도메인은 460:215 가로 썸네일. 행 높이 62px 유지, 폭만 확장 - 웹 RankRow
 * thumbShape 미러).
 *
 * 데이터·편차는 웹 ranking-page.tsx와 동일:
 * - usePlatformRankings(원천 1개 선택) - 도메인 전환 시 기본 원천으로 리셋
 * - 순위 변동(rank-delta)·행 meta(장르·상태)는 RankingResponse에 필드가 없어 생략
 *   (스냅샷을 매일 덮어써 비교 원본도 없음 - 목업의 "변동" 표기는 데이터 확보 후)
 * - contentId 없는 항목(상세 미수집)은 비링크 정적 행
 */

const RANKING_DOMAINS = ['webtoon', 'game', 'movie', 'tv', 'webnovel'] as const;
type RankingDomain = (typeof RANKING_DOMAINS)[number];

/**
 * 도메인별 랭킹 원천 목록 (첫 항목 = 기본 원천) - 웹 RANKING_SOURCES 미러.
 * caption은 실제 수집 방식 기준의 출처 문구 (매일 새벽 갱신).
 */
const RANKING_SOURCES: Record<
  RankingDomain,
  { platforms: string[]; caption: string; soonPlatforms: string[] }
> = {
  webtoon: {
    platforms: ['NaverWebtoon'],
    caption: '네이버웹툰 요일별 인기 순위 기준, 매일 갱신',
    soonPlatforms: ['카카오웹툰'],
  },
  game: {
    platforms: ['Steam'],
    caption: '스팀 한국 최고 판매 순위 기준, 매일 갱신',
    soonPlatforms: ['Epic Games'],
  },
  movie: {
    platforms: ['TMDB_MOVIE'],
    caption: 'TMDB 인기 순위 기준 (국내 OTT 제공작), 매일 갱신',
    soonPlatforms: [],
  },
  tv: {
    platforms: ['TMDB_TV'],
    caption: 'TMDB 인기 순위 기준 (국내 OTT 제공작), 매일 갱신',
    soonPlatforms: [],
  },
  webnovel: {
    platforms: ['NaverSeries'],
    caption: '네이버시리즈 일간 Top 100 기준, 매일 갱신',
    soonPlatforms: ['카카오페이지'],
  },
};

const DEFAULT_DOMAIN: RankingDomain = 'webtoon';

const DOMAIN_KEY: Record<RankingDomain, string> = {
  webtoon: 'WEBTOON',
  game: 'GAME',
  movie: 'MOVIE',
  tv: 'TV',
  webnovel: 'WEBNOVEL',
};

function RankRow({
  item,
  domainKey,
}: {
  item: ExternalRanking;
  domainKey: string;
}) {
  const FallbackIcon = domainFallbackIcon(domainKey);
  const pressable = !!item.contentId;
  // 게임 = 460:215 가로 썸네일 (Steam header 원본 비율, 세로 크롭 제거 -
  // 행 높이 62px은 유지하고 폭만 도메인별 분기. 웹 thumbShape="landscape" 미러)
  const landscape = domainKey === 'GAME';
  return (
    <Pressable
      accessibilityRole={pressable ? 'button' : undefined}
      disabled={!pressable}
      onPress={() =>
        item.contentId &&
        router.push({
          pathname: '/work/[id]',
          params: { id: String(item.contentId) },
        })
      }
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <ThemedText
        style={[styles.rankNo, item.ranking <= 3 && styles.rankNoTop]}>
        {item.ranking}
      </ThemedText>
      <View style={landscape ? styles.thumbWrapGame : styles.thumbWrap}>
        {item.thumbnailUrl ? (
          <Image
            source={{ uri: item.thumbnailUrl }}
            style={styles.thumb}
            contentFit="cover"
            transition={150}
          />
        ) : (
          <View style={styles.thumbFallback}>
            <FallbackIcon size={20} color={Palette.ink3} />
          </View>
        )}
      </View>
      <View style={styles.rowInfo}>
        <ThemedText numberOfLines={1} style={styles.rowTitle}>
          {item.title}
        </ThemedText>
      </View>
    </Pressable>
  );
}

export default function RankingScreen() {
  const listRef = useRef<FlatList<ExternalRanking>>(null);
  const [domainId, setDomainId] = useState<RankingDomain>(DEFAULT_DOMAIN);
  const [platform, setPlatform] = useState<string>(
    RANKING_SOURCES[DEFAULT_DOMAIN].platforms[0],
  );

  const source = RANKING_SOURCES[domainId];

  const selectDomain = (id: RankingDomain) => {
    if (id === domainId) return;
    setDomainId(id);
    setPlatform(RANKING_SOURCES[id].platforms[0]);
    // 도메인 전환 시 목록 최상단 (탐색 관례와 일관)
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
  };

  const rankings = usePlatformRankings(platform);

  const sorted = useMemo(
    () => [...(rankings.data ?? [])].sort((a, b) => a.ranking - b.ranking),
    [rankings.data],
  );

  const listHeader = (
    <View>
      <ThemedText style={styles.pageTitle}>랭킹</ThemedText>

      {/* 도메인 칩 (목업 순서: 웹툰·게임·영화·시리즈·웹소설) */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipsScroll}
        contentContainerStyle={styles.chipsRow}>
        {RANKING_DOMAINS.map((id) => (
          <DomainChip
            key={id}
            label={DOMAIN_LABEL_MAP[DOMAIN_KEY[id]]}
            active={domainId === id}
            onPress={() => selectDomain(id)}
          />
        ))}
      </ScrollView>

      {/* 플랫폼 칩 - 랭킹 원천 + 준비 중 disabled */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipsScroll}
        contentContainerStyle={[styles.chipsRow, styles.platformRow]}>
        {source.platforms.map((key) => (
          <DomainChip
            key={key}
            label={platformLabel(key)}
            active={platform === key}
            onPress={() => setPlatform(key)}
          />
        ))}
        {source.soonPlatforms.map((label) => (
          <DomainChip key={label} label={label} disabled soonLabel="준비 중" />
        ))}
      </ScrollView>

      {/* 출처 캡션 (목업 .rank-note) */}
      <ThemedText style={styles.rankNote}>{source.caption}</ThemedText>
    </View>
  );

  return (
    <View style={styles.screen}>
      <SafeAreaView edges={['top']} style={styles.top}>
        <AppHeader />
      </SafeAreaView>

      <FlatList
        ref={listRef}
        style={styles.list}
        data={rankings.isLoading || rankings.isError ? [] : sorted}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={listHeader}
        renderItem={({ item }) => (
          <RankRow item={item} domainKey={DOMAIN_KEY[domainId]} />
        )}
        ListEmptyComponent={
          rankings.isLoading ? (
            <SkeletonPulse>
              {Array.from({ length: 8 }, (_, i) => (
                <View key={i} style={styles.row}>
                  <SkeletonBlock width={26} height={20} />
                  {/* 게임 탭은 460:215 가로 썸네일 골격 (최종 형상 근사) */}
                  {domainId === 'game' ? (
                    <SkeletonBlock
                      height={62}
                      aspectRatio={460 / 215}
                      radius={6}
                    />
                  ) : (
                    <SkeletonBlock width={48} height={62} radius={6} />
                  )}
                  <SkeletonBlock height={14} width="55%" />
                </View>
              ))}
            </SkeletonPulse>
          ) : rankings.isError ? (
            <EmptyState
              icon={<WarningCircle size={44} color={Palette.ink3} />}
              title="랭킹을 불러오지 못했어요"
              description="네트워크 상태를 확인한 뒤 다시 시도해 주세요."
              action={
                <EmptyStateAction
                  label="다시 시도"
                  onPress={() => rankings.refetch()}
                />
              }
            />
          ) : (
            <EmptyState
              title="아직 랭킹 데이터가 없어요"
              description="랭킹은 매일 새벽에 갱신돼요. 잠시 후 다시 확인해 주세요."
            />
          )
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
  pressed: {
    opacity: 0.85,
  },
  pageTitle: {
    paddingTop: 18,
    paddingHorizontal: 16,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: 800,
    letterSpacing: -0.4,
    color: Palette.ink,
  },
  chipsScroll: {
    flexGrow: 0,
  },
  chipsRow: {
    paddingTop: 12,
    paddingBottom: 4,
    paddingHorizontal: 16,
    gap: 6,
  },
  platformRow: {
    paddingTop: 2,
  },
  rankNote: {
    paddingTop: 8,
    paddingBottom: 10,
    paddingHorizontal: 16,
    fontSize: 12.5,
    lineHeight: 17,
    fontWeight: 400,
    color: Palette.ink3,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 28,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 16,
    marginBottom: 8,
    paddingVertical: 10,
    paddingLeft: 12,
    paddingRight: 14,
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.line,
    borderRadius: Radius.panel,
  },
  rankNo: {
    width: 26,
    textAlign: 'center',
    fontSize: 17,
    lineHeight: 22,
    fontWeight: 800,
    color: Palette.ink3,
    fontVariant: ['tabular-nums'],
  },
  rankNoTop: {
    color: Palette.accentInk,
  },
  thumbWrap: {
    width: 48,
    height: 62,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: Palette.canvas,
  },
  /** 게임 도메인 - 460:215 가로 썸네일 (행 높이 62px 유지, 폭만 비율 확장) */
  thumbWrapGame: {
    height: 62,
    aspectRatio: 460 / 215,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: Palette.canvas,
  },
  thumb: {
    width: '100%',
    height: '100%',
  },
  thumbFallback: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.8,
  },
  rowInfo: {
    flex: 1,
    minWidth: 0,
  },
  rowTitle: {
    fontSize: 14.5,
    lineHeight: 19,
    fontWeight: 700,
    color: Palette.ink,
  },
});

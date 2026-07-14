import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { SvgXml } from 'react-native-svg';

import { useApis } from '@aod/shared/hooks';
import type { ExternalRanking } from '@aod/shared/api';
import { DOMAIN_PLATFORMS } from '@aod/shared/constants';
import { PLATFORM_META } from '@/constants/platforms';
import { FallbackThumb } from '@/components/work/FallbackThumb';
import { INFO } from '@/components/svg-assets';
import { colors, spacing, radius } from '@/theme/tokens';

// ── 웹 ranking-page.tsx 미러 ──
type Category = 'movie' | 'tv' | 'game' | 'webtoon' | 'webnovel';

interface RankingItem {
  id: string;
  rank: number;
  title: string;
  thumbnail: string | null;
  score: number;
  change?: 'up' | 'down' | 'new' | number;
  watchProviders?: string[];
  platform?: string;
}

const CATEGORIES: { id: Category; label: string }[] = [
  { id: 'movie', label: '영화' },
  { id: 'tv', label: '시리즈' },
  { id: 'game', label: '게임' },
  { id: 'webtoon', label: '웹툰' },
  { id: 'webnovel', label: '웹소설' },
];

const PLATFORM_MAPPING: Record<Category, string> = {
  movie: 'TMDB_MOVIE',
  tv: 'TMDB_TV',
  game: 'STEAM_GAME',
  webtoon: 'NAVER_WEBTOON',
  webnovel: 'NAVER_SERIES',
};

const BACKEND_PLATFORM_MAPPING: Record<string, string> = {
  TMDB_MOVIE: 'TMDB_MOVIE',
  TMDB_TV: 'TMDB_TV',
  STEAM_GAME: 'Steam',
  NAVER_WEBTOON: 'NaverWebtoon',
  NAVER_SERIES: 'NaverSeries',
};

const ASPECT: Record<Category, number> = {
  movie: 2 / 3,
  tv: 2 / 3,
  game: 21.5 / 10,
  webtoon: 19 / 25,
  webnovel: 17 / 25,
};

const OTT_NAMES = ['Netflix', 'Watcha', 'Disney Plus', 'wavve', 'TVING'];

function rankColor(rank: number): string {
  if (rank === 1) return colors.rankGold;
  if (rank === 2) return colors.rankSilver;
  if (rank === 3) return colors.rankBronze;
  return colors.textPrimary;
}

function ChangeIndicator({ change }: { change?: RankingItem['change'] }) {
  if (!change) return null;
  if (change === 'new') {
    return (
      <ThemedText type="small" style={styles.changeNew}>
        NEW
      </ThemedText>
    );
  }
  if (change === 'up') {
    return (
      <ThemedText type="small" style={styles.changeUp}>
        ▲
      </ThemedText>
    );
  }
  if (change === 'down') {
    return (
      <ThemedText type="small" style={styles.changeDown}>
        ▼
      </ThemedText>
    );
  }
  return change > 0 ? (
    <ThemedText type="small" style={styles.changeUp}>
      ▲ {change}
    </ThemedText>
  ) : (
    <ThemedText type="small" style={styles.changeDown}>
      ▼ {Math.abs(change)}
    </ThemedText>
  );
}

export default function RankingScreen() {
  const { rankingApi } = useApis();
  const [category, setCategory] = useState<Category>('game');
  const [selectedPlatforms, setSelectedPlatforms] = useState<Set<string>>(
    new Set(['ALL']),
  );
  const [rankings, setRankings] = useState<RankingItem[]>([]);
  const [loading, setLoading] = useState(false);

  const todayLabel = (() => {
    const now = new Date();
    return `${now.getMonth() + 1}.${now.getDate()}`;
  })();

  const domainKey = category.toUpperCase();
  const availablePlatforms = (DOMAIN_PLATFORMS[domainKey] ?? []).map((key) => ({
    key,
    label: PLATFORM_META[key]?.label ?? key,
    logo: PLATFORM_META[key]?.logo,
  }));

  const selectCategory = (next: Category) => {
    setCategory(next);
    setSelectedPlatforms(new Set(['ALL']));
  };

  const togglePlatform = (key: string) => {
    setSelectedPlatforms((prev) => {
      if (key === 'ALL') return new Set(['ALL']);
      const next = new Set(prev);
      next.delete('ALL');
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next.size === 0 ? new Set(['ALL']) : next;
    });
  };

  // 웹 fetchRankings + 클라이언트 필터링 로직 미러.
  // ignore 플래그: 탭 전환 후 늦게 도착한 이전 카테고리 응답이
  // 현재 탭 데이터를 덮어쓰는 레이스 방지 (재시도 백오프로 윈도우가 넓음).
  useEffect(() => {
    let ignore = false;
    const fetchRankings = async () => {
      setLoading(true);
      try {
        const backendPlatform =
          BACKEND_PLATFORM_MAPPING[PLATFORM_MAPPING[category]];
        const data = await rankingApi.getRankingsByPlatform(backendPlatform);
        let mapped: RankingItem[] = data.map((item: ExternalRanking) => ({
          id: item.contentId ? String(item.contentId) : `no-content-${item.id}`,
          rank: item.ranking,
          title: item.title,
          thumbnail: item.thumbnailUrl || null,
          score: 0,
          change: 'new',
          watchProviders: item.watchProviders,
          platform: item.platform,
        }));

        const selectedArray = selectedPlatforms.has('ALL')
          ? undefined
          : Array.from(selectedPlatforms);

        if (selectedArray && selectedArray.length > 0) {
          if (category === 'movie' || category === 'tv') {
            const selectedOtts = selectedArray.filter((p) =>
              OTT_NAMES.includes(p),
            );
            const selectedTypes = selectedArray.filter(
              (p) => !OTT_NAMES.includes(p),
            );
            mapped = mapped.filter((item) => {
              let matchOtt = true;
              let matchPlatform = true;
              if (selectedOtts.length > 0) {
                matchOtt =
                  !!item.watchProviders?.length &&
                  selectedOtts.every((s) => item.watchProviders!.includes(s));
              }
              if (selectedTypes.length > 0) {
                matchPlatform = item.platform
                  ? selectedTypes.includes(item.platform)
                  : false;
              }
              return matchOtt && matchPlatform;
            });
          } else {
            mapped = mapped.filter(
              (item) => item.platform && selectedArray.includes(item.platform),
            );
          }
        }

        if (!ignore) setRankings(mapped);
      } catch {
        if (!ignore) setRankings([]);
      } finally {
        if (!ignore) setLoading(false);
      }
    };
    fetchRankings();
    return () => {
      ignore = true;
    };
  }, [category, selectedPlatforms, rankingApi]);

  const handlePress = (id: string) => {
    if (id.startsWith('no-content-')) {
      Alert.alert('안내', '이 작품의 상세 정보가 아직 준비되지 않았습니다.');
      return;
    }
    router.push({ pathname: '/work/[id]', params: { id } });
  };

  const aspect = ASPECT[category];
  const thumbWidth = category === 'game' ? 120 : 72; // 웹 w-30/w-18 미러

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* 헤더 */}
        <View style={styles.header}>
          <ThemedText style={styles.headerTitle}>랭킹</ThemedText>
          <Pressable onPress={() => router.push('/search')} hitSlop={8}>
            <ThemedText style={styles.headerIcon}>🔍</ThemedText>
          </Pressable>
        </View>

        {/* 카테고리 탭 */}
        <View style={styles.categoryRow}>
          {CATEGORIES.map((cat) => {
            const active = category === cat.id;
            return (
              <Pressable
                key={cat.id}
                style={[styles.categoryTab, active && styles.categoryTabActive]}
                onPress={() => selectCategory(cat.id)}>
                <ThemedText
                  type="small"
                  style={[styles.categoryText, active && styles.categoryTextActive]}>
                  {cat.label}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>

        {/* 플랫폼 그라데이션 칩 */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipScroll}
          contentContainerStyle={styles.chipRow}>
          {availablePlatforms.map((platform) => {
            const selected = selectedPlatforms.has(platform.key);
            return (
              <Pressable
                key={platform.key}
                onPress={() => togglePlatform(platform.key)}>
                {selected ? (
                  <LinearGradient
                    colors={[colors.accent, colors.blue]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.chip}>
                    {platform.logo && (
                      <Image source={platform.logo} style={styles.chipLogo} contentFit="contain" />
                    )}
                    <ThemedText type="small" style={styles.chipTextActive}>
                      {platform.label}
                    </ThemedText>
                  </LinearGradient>
                ) : (
                  <View style={[styles.chip, styles.chipInactive]}>
                    {platform.logo && (
                      <Image source={platform.logo} style={styles.chipLogo} contentFit="contain" />
                    )}
                    <ThemedText type="small" style={styles.chipText}>
                      {platform.label}
                    </ThemedText>
                  </View>
                )}
              </Pressable>
            );
          })}
        </ScrollView>

        {/* 기준일 */}
        <View style={styles.infoRow}>
          <SvgXml xml={INFO} width={14} height={14} />
          <ThemedText type="small" style={styles.infoText}>
            {todayLabel} 기준
          </ThemedText>
        </View>

        {/* 랭킹 리스트 */}
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.accent} />
          </View>
        ) : (
          <FlatList
            data={rankings}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <Pressable style={styles.row} onPress={() => handlePress(item.id)}>
                <ThemedText
                  style={[styles.rank, { color: rankColor(item.rank) }]}>
                  {item.rank}
                </ThemedText>
                <View
                  style={[
                    styles.thumbWrap,
                    { width: thumbWidth, aspectRatio: aspect },
                  ]}>
                  {item.thumbnail ? (
                    <Image
                      source={{ uri: item.thumbnail }}
                      style={styles.thumb}
                      contentFit="cover"
                    />
                  ) : (
                    <FallbackThumb domain={domainKey} iconSize={28} />
                  )}
                </View>
                <View style={styles.rowInfo}>
                  <ThemedText type="small" numberOfLines={1} style={styles.rowTitle}>
                    {item.title}
                  </ThemedText>
                  <View style={styles.rowMeta}>
                    <ThemedText type="small" style={styles.score}>
                      ★ {item.score.toFixed(1)}
                    </ThemedText>
                    <ChangeIndicator change={item.change} />
                  </View>
                </View>
              </Pressable>
            )}
            ListEmptyComponent={
              <View style={styles.center}>
                <ThemedText type="small" style={styles.muted}>
                  랭킹 데이터가 없습니다.
                </ThemedText>
              </View>
            }
          />
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  headerIcon: {
    fontSize: 18,
  },
  categoryRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  categoryTab: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  categoryTabActive: {
    borderBottomWidth: 2,
    borderBottomColor: colors.textPrimary,
  },
  categoryText: {
    color: colors.textMuted,
  },
  categoryTextActive: {
    color: colors.textPrimary,
    fontWeight: '600',
  },
  chipScroll: {
    flexGrow: 0,
    marginTop: spacing.lg,
  },
  chipRow: {
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  chipLogo: {
    width: 20,
    height: 20,
    borderRadius: radius.full,
  },
  chipInactive: {
    backgroundColor: colors.surfaceDeep,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipText: {
    color: colors.textBright,
    fontWeight: '500',
  },
  chipTextActive: {
    color: colors.textPrimary,
    fontWeight: '500',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  infoText: {
    color: colors.textBright,
  },
  center: {
    paddingVertical: spacing.xxl * 2,
    alignItems: 'center',
  },
  muted: {
    color: colors.textMuted,
  },
  listContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl * 2,
    gap: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    padding: spacing.xs,
    borderRadius: radius.sm,
  },
  rank: {
    width: 24,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '700',
  },
  thumbWrap: {
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceDeep,
    overflow: 'hidden',
  },
  thumb: {
    width: '100%',
    height: '100%',
  },
  rowInfo: {
    flex: 1,
    minWidth: 0,
    gap: spacing.xs,
  },
  rowTitle: {
    fontWeight: '500',
  },
  rowMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  score: {
    color: colors.accent,
    fontWeight: '500',
  },
  changeNew: {
    color: colors.accent,
    fontWeight: '600',
    fontSize: 12,
  },
  changeUp: {
    color: colors.changeUp,
    fontWeight: '600',
    fontSize: 12,
  },
  changeDown: {
    color: colors.changeDown,
    fontWeight: '600',
    fontSize: 12,
  },
});

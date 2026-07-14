import { useState } from 'react';
import {
  ActivityIndicator,
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
import { FilterIcon, SearchGlassIcon } from '@/components/icons';
import { useGenresWithCount, useInfiniteWorks } from '@aod/shared/hooks';
import { DOMAIN_LABEL_MAP, DOMAIN_PLATFORMS } from '@aod/shared/constants';
import { PLATFORM_META } from '@/constants/platforms';
import { FallbackThumb } from '@/components/work/FallbackThumb';
import { colors, spacing, radius } from '@/theme/tokens';

// ── 웹 explore-page.tsx 미러 (기본 도메인 game 동일) ──
type Category = 'movie' | 'tv' | 'game' | 'webtoon' | 'webnovel';

const CATEGORIES: { id: Category; label: string }[] = [
  { id: 'movie', label: '영화' },
  { id: 'tv', label: '시리즈' },
  { id: 'game', label: '게임' },
  { id: 'webtoon', label: '웹툰' },
  { id: 'webnovel', label: '웹소설' },
];

// 웹 imageAspectMap 미러
const ASPECT: Record<Category, number> = {
  movie: 2 / 3,
  tv: 2 / 3,
  game: 21.5 / 10,
  webtoon: 19 / 25,
  webnovel: 17 / 25,
};

export default function ExploreScreen() {
  const [category, setCategory] = useState<Category>('game');
  const [selectedPlatforms, setSelectedPlatforms] = useState<Set<string>>(
    new Set(['ALL']),
  );
  const [selectedGenres, setSelectedGenres] = useState<Set<string>>(new Set());
  const [showGenreFilter, setShowGenreFilter] = useState(false);

  const domainKey = category.toUpperCase();

  const { data: genresWithCount } = useGenresWithCount(domainKey);
  const sortedGenres = genresWithCount
    ? Object.entries(genresWithCount).sort(([, a], [, b]) => b - a)
    : [];

  const availablePlatforms = (DOMAIN_PLATFORMS[domainKey] ?? []).map((key) => ({
    key,
    label: PLATFORM_META[key]?.label ?? key,
    logo: PLATFORM_META[key]?.logo,
  }));

  const platformsParam = selectedPlatforms.has('ALL')
    ? undefined
    : Array.from(selectedPlatforms);
  const genresParam =
    selectedGenres.size > 0 ? Array.from(selectedGenres) : undefined;

  const { data, isLoading, isError, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteWorks({
      domain: domainKey,
      platforms: platformsParam,
      genres: genresParam,
      size: 60,
      sortBy: 'releaseDate',
      sortDirection: 'desc',
    });

  const works = data?.pages.flatMap((page) => page.content) ?? [];
  const totalElements = data?.pages?.[0]?.totalElements ?? 0;

  const selectCategory = (next: Category) => {
    setCategory(next);
    setSelectedPlatforms(new Set(['ALL']));
    setSelectedGenres(new Set());
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

  const toggleGenre = (genre: string) => {
    setSelectedGenres((prev) => {
      const next = new Set(prev);
      if (next.has(genre)) next.delete(genre);
      else next.add(genre);
      return next;
    });
  };

  const aspect = ASPECT[category];

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        {/* 헤더 (웹 Header 미러) */}
        <View style={styles.header}>
          <ThemedText style={styles.headerTitle}>탐색</ThemedText>
          <Pressable onPress={() => router.push('/search')} hitSlop={8}>
            <SearchGlassIcon size={20} />
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

        <FlatList
          data={works}
          keyExtractor={(item) => String(item.id)}
          numColumns={3}
          columnWrapperStyle={styles.gridRow}
          contentContainerStyle={styles.gridContent}
          onEndReached={() => {
            if (hasNextPage && !isFetchingNextPage) fetchNextPage();
          }}
          onEndReachedThreshold={0.8}
          ListHeaderComponent={
            <View>
              {/* 플랫폼 필터 (활성 = 보라→파랑 그라데이션, 웹 미러) */}
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
                          style={styles.platformChip}>
                          {platform.logo && (
                            <Image source={platform.logo} style={styles.chipLogo} contentFit="contain" />
                          )}
                          <ThemedText type="small" style={styles.platformChipTextActive}>
                            {platform.label}
                          </ThemedText>
                        </LinearGradient>
                      ) : (
                        <View style={[styles.platformChip, styles.platformChipInactive]}>
                          {platform.logo && (
                            <Image source={platform.logo} style={styles.chipLogo} contentFit="contain" />
                          )}
                          <ThemedText type="small" style={styles.platformChipText}>
                            {platform.label}
                          </ThemedText>
                        </View>
                      )}
                    </Pressable>
                  );
                })}
              </ScrollView>

              {/* 장르 필터 (웹 미러: 필터 버튼 + 선택 pill + 토글 패널) */}
              <View style={styles.genreArea}>
                <View style={styles.genreSelectedRow}>
                  <Pressable
                    style={styles.filterButton}
                    onPress={() => setShowGenreFilter((prev) => !prev)}>
                    <FilterIcon size={16} />
                    <ThemedText type="small" style={styles.filterButtonText}>
                      필터
                    </ThemedText>
                    {selectedGenres.size > 0 && (
                      <View style={styles.filterBadge}>
                        <ThemedText style={styles.filterBadgeText}>
                          {selectedGenres.size}
                        </ThemedText>
                      </View>
                    )}
                  </Pressable>

                  {Array.from(selectedGenres).map((genre) => (
                    <View key={genre} style={styles.selectedGenrePill}>
                      <ThemedText type="small" style={styles.selectedGenreText}>
                        {genre}
                      </ThemedText>
                      <Pressable onPress={() => toggleGenre(genre)} hitSlop={6}>
                        <ThemedText type="small" style={styles.selectedGenreText}>
                          ✕
                        </ThemedText>
                      </Pressable>
                    </View>
                  ))}
                </View>

                {showGenreFilter && (
                  <View style={styles.genrePanel}>
                    {sortedGenres.map(([genre, count]) => {
                      const selected = selectedGenres.has(genre);
                      return (
                        <Pressable
                          key={genre}
                          style={[
                            styles.genreChip,
                            selected && styles.genreChipSelected,
                          ]}
                          onPress={() => toggleGenre(genre)}>
                          <ThemedText
                            style={[
                              styles.genreChipText,
                              selected && styles.genreChipTextSelected,
                            ]}>
                            {genre}{' '}
                            <ThemedText style={styles.genreChipCount}>
                              ({count})
                            </ThemedText>
                          </ThemedText>
                        </Pressable>
                      );
                    })}
                  </View>
                )}
              </View>

              {/* 총 개수 및 정렬 (웹 미러) */}
              {works.length > 0 && (
                <View style={styles.countRow}>
                  <ThemedText type="small" style={styles.countText}>
                    총{' '}
                    <ThemedText type="small" style={styles.countNumber}>
                      {totalElements.toLocaleString()}
                    </ThemedText>
                    개
                  </ThemedText>
                  <ThemedText type="small" style={styles.countText}>
                    최신순
                  </ThemedText>
                </View>
              )}

              {isError && (
                <ThemedText type="small" style={styles.centerText}>
                  불러오기에 실패했습니다.
                </ThemedText>
              )}
              {isLoading && (
                <View style={styles.center}>
                  <ActivityIndicator color={colors.accent} />
                </View>
              )}
            </View>
          }
          renderItem={({ item }) => (
            <Pressable
              style={styles.gridCell}
              onPress={() =>
                router.push({
                  pathname: '/work/[id]',
                  params: { id: String(item.id) },
                })
              }>
              <View style={[styles.thumbWrap, { aspectRatio: aspect }]}>
                {item.thumbnail ? (
                  <Image
                    source={{ uri: item.thumbnail }}
                    style={styles.thumb}
                    contentFit="cover"
                  />
                ) : (
                  <FallbackThumb domain={item.domain} iconSize={36} />
                )}
              </View>
              <ThemedText type="small" numberOfLines={1} style={styles.workTitle}>
                {item.title}
              </ThemedText>
              <ThemedText type="small" style={styles.workMeta}>
                {DOMAIN_LABEL_MAP[item.domain] ?? item.domain}
                {item.releaseDate
                  ? ` • ${new Date(item.releaseDate).getFullYear()}`
                  : ''}
              </ThemedText>
            </Pressable>
          )}
          ListEmptyComponent={
            !isLoading ? (
              <ThemedText type="small" style={styles.centerText}>
                조건에 맞는 작품이 없습니다.
              </ThemedText>
            ) : null
          }
          ListFooterComponent={
            isFetchingNextPage ? (
              <ActivityIndicator color={colors.accent} style={styles.footerLoading} />
            ) : null
          }
        />
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
    marginTop: spacing.xl,
  },
  chipRow: {
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  platformChip: {
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
  platformChipInactive: {
    backgroundColor: colors.surfaceDeep,
    borderWidth: 1,
    borderColor: colors.border,
  },
  platformChipText: {
    color: colors.textBright,
    fontWeight: '500',
  },
  platformChipTextActive: {
    color: colors.textPrimary,
    fontWeight: '500',
  },
  genreArea: {
    paddingHorizontal: spacing.xl,
    marginTop: spacing.lg,
  },
  genreSelectedRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterButtonText: {
    color: colors.textFaint,
  },
  filterBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 16,
    height: 16,
    borderRadius: radius.full,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadgeText: {
    color: colors.textPrimary,
    fontSize: 10,
    lineHeight: 12,
  },
  selectedGenrePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.accent,
  },
  selectedGenreText: {
    color: colors.textPrimary,
  },
  genrePanel: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  genreChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: '#374151', // 웹 gray-700
  },
  genreChipSelected: {
    borderColor: '#646CFF',
    backgroundColor: '#646CFF22',
  },
  genreChipText: {
    fontSize: 12,
    color: '#9CA3AF', // 웹 gray-400
  },
  genreChipTextSelected: {
    color: colors.textPrimary,
  },
  genreChipCount: {
    fontSize: 10,
    opacity: 0.6,
    color: '#9CA3AF',
  },
  countRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    marginTop: spacing.lg,
    marginBottom: spacing.xs,
  },
  countText: {
    color: '#9CA3AF',
  },
  countNumber: {
    color: colors.textPrimary,
    fontWeight: '600',
  },
  center: {
    paddingVertical: spacing.xxl * 2,
    alignItems: 'center',
  },
  centerText: {
    color: colors.textFaint,
    textAlign: 'center',
    paddingVertical: spacing.xxl * 2,
  },
  gridRow: {
    gap: spacing.xl,
    paddingHorizontal: spacing.xl,
  },
  gridContent: {
    paddingBottom: spacing.xxl * 2,
    gap: spacing.lg,
  },
  gridCell: {
    flex: 1 / 3,
  },
  thumbWrap: {
    width: '100%',
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  thumb: {
    width: '100%',
    height: '100%',
  },
  workTitle: {
    fontWeight: '600',
  },
  workMeta: {
    color: colors.textFaint,
    fontSize: 12,
    marginTop: 2,
  },
  footerLoading: {
    marginVertical: spacing.lg,
  },
});

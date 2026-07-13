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

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { WorkCard } from '@/components/work/WorkCard';
import { useGenresWithCount, useInfiniteWorks } from '@aod/shared/hooks';
import { DOMAIN_PLATFORMS, PLATFORM_LABELS } from '@aod/shared/constants';
import { colors, spacing, radius } from '@/theme/tokens';

// 웹 explore-page 미러 (기본 도메인 game 동일)
type Category = 'movie' | 'tv' | 'game' | 'webtoon' | 'webnovel';

const CATEGORIES: { id: Category; label: string }[] = [
  { id: 'movie', label: '영화' },
  { id: 'tv', label: '시리즈' },
  { id: 'game', label: '게임' },
  { id: 'webtoon', label: '웹툰' },
  { id: 'webnovel', label: '웹소설' },
];

export default function ExploreScreen() {
  const [category, setCategory] = useState<Category>('game');
  const [selectedPlatforms, setSelectedPlatforms] = useState<Set<string>>(
    new Set(['ALL']),
  );
  const [selectedGenres, setSelectedGenres] = useState<Set<string>>(new Set());

  const domainKey = category.toUpperCase();

  const { data: genresWithCount } = useGenresWithCount(domainKey);
  const sortedGenres = genresWithCount
    ? Object.entries(genresWithCount).sort(([, a], [, b]) => b - a)
    : [];

  const availablePlatforms = DOMAIN_PLATFORMS[domainKey] ?? [];

  const platformsParam = selectedPlatforms.has('ALL')
    ? undefined
    : Array.from(selectedPlatforms);
  const genresParam =
    selectedGenres.size > 0 ? Array.from(selectedGenres) : undefined;

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteWorks({
      domain: domainKey,
      platforms: platformsParam,
      genres: genresParam,
      size: 60,
      sortBy: 'releaseDate',
      sortDirection: 'desc',
    });

  const works = data?.pages.flatMap((page) => page.content) ?? [];

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

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* 도메인 탭 */}
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

        {/* 플랫폼 칩 (라벨만 — 로고 에셋은 웹 전용) */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipScroll}
          contentContainerStyle={styles.chipRow}>
          {availablePlatforms.map((key) => {
            const active = selectedPlatforms.has(key);
            return (
              <Pressable
                key={key}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => togglePlatform(key)}>
                <ThemedText
                  type="small"
                  style={[styles.chipText, active && styles.chipTextActive]}>
                  {PLATFORM_LABELS[key] ?? key}
                </ThemedText>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* 장르 칩 (작품 수 내림차순 — 웹 동일) */}
        {sortedGenres.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.chipScroll}
            contentContainerStyle={styles.chipRow}>
            {sortedGenres.map(([genre, count]) => {
              const active = selectedGenres.has(genre);
              return (
                <Pressable
                  key={genre}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => toggleGenre(genre)}>
                  <ThemedText
                    type="small"
                    style={[styles.chipText, active && styles.chipTextActive]}>
                    {genre} {count}
                  </ThemedText>
                </Pressable>
              );
            })}
          </ScrollView>
        )}

        {/* 결과 그리드 + 무한 스크롤 */}
        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.accent} />
          </View>
        ) : (
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
            renderItem={({ item }) => (
              <View style={styles.gridCell}>
                <WorkCard
                  item={{
                    id: String(item.id),
                    title: item.title,
                    thumbnail: item.thumbnail ?? '',
                    score: item.score ?? 0,
                    domain: item.domain,
                    year: item.releaseDate,
                  }}
                  width={'100%'}
                  imageHeight={140}
                  onPress={(id) =>
                    router.push({ pathname: '/work/[id]', params: { id } })
                  }
                />
              </View>
            )}
            ListEmptyComponent={
              <View style={styles.center}>
                <ThemedText type="small" style={styles.muted}>
                  조건에 맞는 작품이 없습니다.
                </ThemedText>
              </View>
            }
            ListFooterComponent={
              isFetchingNextPage ? (
                <ActivityIndicator
                  color={colors.accent}
                  style={styles.footerLoading}
                />
              ) : null
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
  categoryRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
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
    marginTop: spacing.md,
  },
  chipRow: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  chip: {
    backgroundColor: colors.surface,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  chipActive: {
    backgroundColor: colors.accent,
  },
  chipText: {
    color: colors.textBright,
  },
  chipTextActive: {
    color: colors.textPrimary,
    fontWeight: '600',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
  },
  muted: {
    color: colors.textFaint,
  },
  gridRow: {
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  gridContent: {
    paddingVertical: spacing.lg,
    gap: spacing.lg,
  },
  gridCell: {
    flex: 1 / 3,
  },
  footerLoading: {
    marginVertical: spacing.lg,
  },
});

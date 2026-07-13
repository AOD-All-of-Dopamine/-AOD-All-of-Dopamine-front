import { useState } from 'react';
import {
  ActivityIndicator,
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
import { useRecentReleases, useUpcomingReleases } from '@aod/shared/hooks';
import { DOMAIN_LABEL_MAP, DOMAIN_PLATFORMS, PLATFORM_LABELS } from '@aod/shared/constants';
import type { WorkSummary } from '@aod/shared/types';
import { colors, spacing, radius } from '@/theme/tokens';

// ── 웹 new-releases-page.tsx 미러 ──
type Category = 'movie' | 'tv' | 'game' | 'webtoon' | 'webnovel';
type ReleaseType = 'released' | 'upcoming';

const CATEGORIES: { id: Category; label: string }[] = [
  { id: 'movie', label: '영화' },
  { id: 'tv', label: '시리즈' },
  { id: 'game', label: '게임' },
  { id: 'webtoon', label: '웹툰' },
  { id: 'webnovel', label: '웹소설' },
];

const DOMAIN_MAP: Record<Category, string> = {
  movie: 'MOVIE',
  tv: 'TV',
  game: 'GAME',
  webtoon: 'WEBTOON',
  webnovel: 'WEBNOVEL',
};

// 웹 imageAspectMap 미러
const ASPECT: Record<Category, number> = {
  movie: 2 / 3,
  tv: 2 / 3,
  game: 21.5 / 10,
  webtoon: 19 / 25,
  webnovel: 17 / 25,
};

// 웹 formatGroupDate 미러 ("25 / 7 / 13")
function formatGroupDate(dateString: string) {
  const d = new Date(dateString);
  return `${String(d.getFullYear()).slice(2)} / ${d.getMonth() + 1} / ${d.getDate()}`;
}

export default function NewReleasesScreen() {
  const [category, setCategory] = useState<Category>('game');
  const [selectedPlatforms, setSelectedPlatforms] = useState<Set<string>>(
    new Set(['all']),
  );
  const [releaseType, setReleaseType] = useState<ReleaseType>('released');

  const domainKey = DOMAIN_MAP[category];
  const platformKeys = DOMAIN_PLATFORMS[domainKey] ?? [];
  const availablePlatforms = platformKeys.map((key) => ({
    id: key.toLowerCase(),
    key,
    label: PLATFORM_LABELS[key] ?? key,
  }));

  const platformsParam = selectedPlatforms.has('all')
    ? undefined
    : Array.from(selectedPlatforms);

  const { data: recentData, isLoading: isLoadingRecent } = useRecentReleases(
    { domain: domainKey, platforms: platformsParam, page: 0, size: 20 },
    { enabled: releaseType === 'released' },
  );
  const { data: upcomingData, isLoading: isLoadingUpcoming } =
    useUpcomingReleases(
      { domain: domainKey, platforms: platformsParam, page: 0, size: 20 },
      { enabled: releaseType === 'upcoming' },
    );

  const isLoading =
    releaseType === 'released' ? isLoadingRecent : isLoadingUpcoming;
  const works =
    (releaseType === 'released'
      ? recentData?.content
      : upcomingData?.content) ?? [];

  const selectCategory = (next: Category) => {
    setCategory(next);
    setSelectedPlatforms(new Set(['all']));
  };

  const togglePlatform = (id: string) => {
    setSelectedPlatforms((prev) => {
      if (id === 'all') return new Set(['all']);
      const next = new Set(prev);
      next.delete('all');
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next.size === 0 ? new Set(['all']) : next;
    });
  };

  // 날짜별 그룹핑 (웹 미러)
  const grouped = works.reduce<Record<string, WorkSummary[]>>((acc, work) => {
    if (!work.releaseDate) return acc;
    const key = formatGroupDate(work.releaseDate);
    (acc[key] ??= []).push(work);
    return acc;
  }, {});
  const sortedDates = Object.keys(grouped).sort((a, b) => {
    const [ay, am, ad] = a.split(' / ').map(Number);
    const [by, bm, bd] = b.split(' / ').map(Number);
    return (
      new Date(2000 + by, bm - 1, bd).getTime() -
      new Date(2000 + ay, am - 1, ad).getTime()
    );
  });

  const aspect = ASPECT[category];

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* 헤더 (웹 Header 미러: 제목 + 검색) */}
        <View style={styles.header}>
          <ThemedText style={styles.headerTitle}>신작</ThemedText>
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

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* 플랫폼 칩 (활성 = 보라→파랑 그라데이션, 웹 미러) */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.chipScroll}
            contentContainerStyle={styles.chipRow}>
            {availablePlatforms.map((platform) => {
              const selected = selectedPlatforms.has(platform.id);
              return (
                <Pressable key={platform.id} onPress={() => togglePlatform(platform.id)}>
                  {selected ? (
                    <LinearGradient
                      colors={[colors.accent, colors.blue]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.chip}>
                      <ThemedText type="small" style={styles.chipTextActive}>
                        {platform.label}
                      </ThemedText>
                    </LinearGradient>
                  ) : (
                    <View style={[styles.chip, styles.chipInactive]}>
                      <ThemedText type="small" style={styles.chipText}>
                        {platform.label}
                      </ThemedText>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </ScrollView>

          {/* 신작 / 공개 예정 토글 */}
          <View style={styles.toggleRow}>
            {(
              [
                ['released', '신작'],
                ['upcoming', '공개 예정'],
              ] as [ReleaseType, string][]
            ).map(([type, label]) => (
              <Pressable
                key={type}
                style={[
                  styles.toggleButton,
                  releaseType === type && styles.toggleButtonActive,
                ]}
                onPress={() => setReleaseType(type)}>
                <ThemedText
                  type="small"
                  style={[
                    styles.toggleText,
                    releaseType === type && styles.toggleTextActive,
                  ]}>
                  {label}
                </ThemedText>
              </Pressable>
            ))}
          </View>

          {/* 날짜별 그룹 그리드 */}
          {isLoading ? (
            <View style={styles.center}>
              <ActivityIndicator color={colors.accent} />
            </View>
          ) : sortedDates.length === 0 ? (
            <View style={styles.center}>
              <ThemedText type="small" style={styles.muted}>
                데이터가 없습니다.
              </ThemedText>
            </View>
          ) : (
            <View style={styles.groups}>
              {sortedDates.map((date) => (
                <View key={date}>
                  {/* 날짜 헤더 (왼쪽 세로줄 — 웹 미러) */}
                  <View style={styles.dateHeader}>
                    <View style={styles.dateBar} />
                    <ThemedText style={styles.dateText}>{date}</ThemedText>
                  </View>
                  <View style={styles.grid}>
                    {grouped[date].map((work) => (
                      <Pressable
                        key={work.id}
                        style={styles.gridCell}
                        onPress={() =>
                          router.push({
                            pathname: '/work/[id]',
                            params: { id: String(work.id) },
                          })
                        }>
                        <View
                          style={[styles.thumbWrap, { aspectRatio: aspect }]}>
                          <Image
                            source={
                              work.thumbnail ? { uri: work.thumbnail } : undefined
                            }
                            style={styles.thumb}
                            contentFit="cover"
                          />
                        </View>
                        <ThemedText
                          type="small"
                          numberOfLines={1}
                          style={styles.workTitle}>
                          {work.title}
                        </ThemedText>
                        <ThemedText type="small" style={styles.workMeta}>
                          {DOMAIN_LABEL_MAP[work.domain] ?? work.domain}
                          {work.releaseDate
                            ? ` • ${new Date(work.releaseDate).getFullYear()}`
                            : ''}
                        </ThemedText>
                      </Pressable>
                    ))}
                  </View>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
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
    marginTop: spacing.xl,
  },
  chipRow: {
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  chip: {
    borderRadius: radius.full,
    paddingHorizontal: spacing.lg,
    paddingVertical: 6,
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
  toggleRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceDeep,
    alignItems: 'center',
  },
  toggleButtonActive: {
    backgroundColor: colors.accent,
  },
  toggleText: {
    color: '#888888',
    fontWeight: '500',
  },
  toggleTextActive: {
    color: colors.textPrimary,
  },
  center: {
    paddingVertical: spacing.xxl * 3,
    alignItems: 'center',
  },
  muted: {
    color: colors.textFaint,
  },
  groups: {
    paddingHorizontal: spacing.xl,
    gap: spacing.xxl + spacing.lg,
    paddingBottom: spacing.xxl * 2,
  },
  dateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  dateBar: {
    width: 4,
    height: 24,
    backgroundColor: colors.textFaint,
  },
  dateText: {
    fontSize: 18,
    fontWeight: '500',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xl,
  },
  gridCell: {
    width: '29%',
    flexGrow: 1,
    maxWidth: '31%',
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
});

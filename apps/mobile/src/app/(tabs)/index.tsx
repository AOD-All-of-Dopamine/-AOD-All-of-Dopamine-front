import {
  Alert,
  Dimensions,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { LikesIcon, BookmarksIcon } from '@/components/icons';
import { WorkCarousel } from '@/components/work/WorkCarousel';
import type { WorkCardItem } from '@/components/work/WorkCard';
import { useApis, useRecentReviewedWorks } from '@aod/shared/hooks';
import type { ExternalRanking } from '@aod/shared/api';
import type { WorkSummary } from '@aod/shared/types';
import { colors, spacing, radius } from '@/theme/tokens';

// ── 웹 home-page.tsx 미러 ────────────────────────────────────────────────
type Category = 'movie' | 'tv' | 'game' | 'webtoon' | 'webnovel';

const DOMAINS: Category[] = ['movie', 'tv', 'game', 'webtoon', 'webnovel'];

const DOMAIN_LABELS: Record<Category, string> = {
  movie: '영화',
  tv: '시리즈',
  game: '게임',
  webtoon: '웹툰',
  webnovel: '웹소설',
};

const BACKEND_PLATFORM_MAPPING: Record<Category, string> = {
  movie: 'TMDB_MOVIE',
  tv: 'TMDB_TV',
  game: 'Steam',
  webtoon: 'NaverWebtoon',
  webnovel: 'NaverSeries',
};

// 작품 상세(/work/[id])·검색은 F3에서 — 그때까지 준비중 안내.
const notReady = () =>
  Alert.alert('준비 중', '이 기능은 곧 만나볼 수 있어요!');

const PAGE_WIDTH = Dimensions.get('window').width - spacing.xl * 2;

interface RankingListItem {
  id: string;
  title: string;
  thumbnail: string;
  rank: number;
}

// 웹 mapToRankingItem 미러
function mapToRankingItem(item: ExternalRanking): RankingListItem {
  return {
    id: item.contentId ? String(item.contentId) : `no-content-${item.id}`,
    title: item.title,
    thumbnail: item.thumbnailUrl,
    rank: item.ranking,
  };
}

function RankingRow({
  item,
  onPress,
}: {
  item: RankingListItem;
  onPress: (id: string) => void;
}) {
  return (
    <Pressable style={styles.rankingRow} onPress={() => onPress(item.id)}>
      <ThemedText style={styles.rankingNumber}>{item.rank}</ThemedText>
      <Image
        source={item.thumbnail ? { uri: item.thumbnail } : undefined}
        style={styles.rankingThumb}
        contentFit="cover"
      />
      <ThemedText numberOfLines={1} style={styles.rankingTitle}>
        {item.title}
      </ThemedText>
    </Pressable>
  );
}

function RankingSection({
  domainLabel,
  items,
  onItemPress,
}: {
  domainLabel: string;
  items: RankingListItem[];
  onItemPress: (id: string) => void;
}) {
  return (
    <View style={styles.rankingSection}>
      <View style={styles.sectionHeader}>
        <ThemedText style={styles.sectionTitle}>
          랭킹 <ThemedText style={styles.sectionBadge}>{domainLabel}</ThemedText>
        </ThemedText>
      </View>
      {items.map((item) => (
        <RankingRow key={item.id} item={item} onPress={onItemPress} />
      ))}
    </View>
  );
}

export default function HomeScreen() {
  const { rankingApi } = useApis();

  // 웹과 동일한 페이지 전용 캐시 키
  const { data: allRankings, isLoading: isLoadingRankings } = useQuery({
    queryKey: ['home-all-rankings'],
    queryFn: () => rankingApi.getAllRankings(),
  });

  const { data: recentReviews, isLoading: isLoadingRecentReviews } =
    useRecentReviewedWorks({ size: 10 });

  const handleRankingItemPress = (id: string) => {
    if (id.startsWith('no-content-')) {
      Alert.alert('안내', '이 작품의 상세 정보가 아직 준비되지 않았습니다.');
    } else {
      router.push({ pathname: '/work/[id]', params: { id } });
    }
  };

  // 웹 mapToWorkItem 미러
  const mapToWorkItem = (item: WorkSummary): WorkCardItem => ({
    id: String(item.id),
    title: item.title,
    thumbnail: item.thumbnail ?? '',
    score: item.score ?? 0,
    domain: item.domain ?? undefined,
    year: item.releaseDate ?? undefined,
  });

  const rankingSections = DOMAINS.map((domain) => {
    const platform = BACKEND_PLATFORM_MAPPING[domain];
    const items = (allRankings ?? [])
      .filter((item) => item.platform === platform)
      .sort((a, b) => a.ranking - b.ranking)
      .slice(0, 3)
      .map(mapToRankingItem);
    return { domain, label: DOMAIN_LABELS[domain], items };
  }).filter((section) => section.items.length > 0);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* 검색 바 */}
          <Pressable style={styles.searchBar} onPress={() => router.push('/search')}>
            <ThemedText type="small" style={styles.searchPlaceholder}>
              작품 검색
            </ThemedText>
          </Pressable>

          {/* 퀵 내비 (웹 동그라미 내비 미러 — 아이콘도 웹 에셋) */}
          <View style={styles.quickNav}>
            <Pressable style={styles.quickNavItem} onPress={() => router.push('/new')}>
              <View style={styles.quickNavCircle}>
                <Image
                  source={require('@/assets/images/quicknav-new.png')}
                  style={styles.quickNavImage}
                  contentFit="contain"
                />
              </View>
              <ThemedText type="small" style={styles.quickNavLabel}>
                공개예정
              </ThemedText>
            </Pressable>
            <Pressable style={styles.quickNavItem} onPress={notReady}>
              <View style={styles.quickNavCircle}>
                <LikesIcon size={22} />
              </View>
              <ThemedText type="small" style={styles.quickNavLabel}>
                좋아요
              </ThemedText>
            </Pressable>
            <Pressable style={styles.quickNavItem} onPress={notReady}>
              <View style={styles.quickNavCircle}>
                <BookmarksIcon size={22} />
              </View>
              <ThemedText type="small" style={styles.quickNavLabel}>
                북마크
              </ThemedText>
            </Pressable>
          </View>

          {/* 도메인 랭킹 (가로 스냅 스크롤 — 웹의 자동 슬라이드는 수동 스와이프로 대체) */}
          {!isLoadingRankings && rankingSections.length > 0 && (
            <FlatList
              horizontal
              data={rankingSections}
              keyExtractor={(section) => section.domain}
              renderItem={({ item: section }) => (
                <RankingSection
                  domainLabel={section.label}
                  items={section.items}
                  onItemPress={handleRankingItemPress}
                />
              )}
              snapToInterval={PAGE_WIDTH + spacing.xl}
              decelerationRate="fast"
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.rankingList}
            />
          )}

          {/* AI 맞춤 추천 (백엔드 M2/M3 연동 예정 — 웹과 동일 준비중 박스) */}
          <View style={styles.aiSection}>
            <ThemedText style={styles.sectionTitle}>
              개인 추천 <ThemedText style={styles.sectionBadge}>AI</ThemedText>
            </ThemedText>
            <View style={styles.aiPlaceholder}>
              <ThemedText type="small" style={styles.aiPlaceholderText}>
                AI 맞춤 추천 엔진 연동 준비 중입니다.
              </ThemedText>
            </View>
          </View>

          {/* 최신 리뷰 작품 */}
          <WorkCarousel
            title="최신 리뷰 작품"
            items={(recentReviews?.content ?? []).map(mapToWorkItem)}
            loading={isLoadingRecentReviews}
            onItemPress={(id) =>
              router.push({ pathname: '/work/[id]', params: { id } })
            }
          />
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
  searchBar: {
    marginHorizontal: spacing.xl,
    marginTop: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  searchPlaceholder: {
    color: colors.textFaint,
  },
  quickNav: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xxl * 1.5,
    marginTop: spacing.xxl,
    marginBottom: spacing.xxl,
  },
  quickNavItem: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  quickNavCircle: {
    width: 52,
    height: 52,
    borderRadius: radius.full,
    backgroundColor: '#363539', // 웹 동그라미 배경 실측치
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickNavImage: {
    width: 24,
    height: 24,
  },
  quickNavLabel: {
    color: colors.textBright,
  },
  rankingList: {
    paddingHorizontal: spacing.xl,
    gap: spacing.xl,
    marginBottom: spacing.sm,
  },
  rankingSection: {
    width: PAGE_WIDTH,
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  sectionBadge: {
    fontSize: 12,
    color: colors.accent,
  },
  rankingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 6,
  },
  rankingNumber: {
    width: 20,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  rankingThumb: {
    width: 40,
    height: 54,
    borderRadius: 4,
    backgroundColor: colors.surface,
  },
  rankingTitle: {
    flex: 1,
    fontSize: 14,
  },
  aiSection: {
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.xxl,
    gap: spacing.md,
  },
  aiPlaceholder: {
    height: 144,
    borderRadius: radius.md,
    backgroundColor: '#2A292D', // 웹 준비중 박스 실측치
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#3A393D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiPlaceholderText: {
    color: colors.textFaint,
  },
});

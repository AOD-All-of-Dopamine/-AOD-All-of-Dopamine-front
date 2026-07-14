import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';

import { SvgXml } from 'react-native-svg';

import { LOGOUT, VIEW_ALL } from '@/components/svg-assets';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { WorkCarousel } from '@/components/work/WorkCarousel';
import type { WorkCardItem } from '@/components/work/WorkCard';
import { useAuth } from '@/auth/AuthContext';
import { useMyReviews, useMyBookmarks, useMyLikes } from '@aod/shared/hooks';
import type { WorkSummary } from '@aod/shared/types';
import { colors, spacing, radius } from '@/theme/tokens';

// ── 웹 profile-page.tsx 미러 ──

const mapToWorkItem = (item: WorkSummary): WorkCardItem => ({
  id: String(item.id),
  title: item.title,
  thumbnail: item.thumbnail ?? '',
  score: item.score,
  domain: item.domain,
  year: item.releaseDate,
});

function EmptySection() {
  return (
    <View style={styles.empty}>
      <ThemedText style={styles.emptyText}>아직 등록한 작품이 없어요</ThemedText>
      <Pressable
        style={styles.emptyButton}
        onPress={() => router.push('/explore')}>
        <ThemedText type="small" style={styles.emptyButtonText}>
          등록하러 가기
        </ThemedText>
      </Pressable>
    </View>
  );
}

export default function ProfileScreen() {
  const { state, logout } = useAuth();
  const isAuthenticated = state.status === 'authenticated';

  const { data: reviewsData } = useMyReviews(0, 1, isAuthenticated);
  const { data: bookmarksData } = useMyBookmarks(0, 10, isAuthenticated);
  const { data: likesData } = useMyLikes(0, 10, isAuthenticated);

  const reviewCount = reviewsData?.totalElements ?? 0;
  const likeCount = likesData?.totalElements ?? 0;
  const bookmarkCount = bookmarksData?.totalElements ?? 0;

  const handleLogout = () => {
    Alert.alert('로그아웃하시겠어요?', undefined, [
      { text: '취소', style: 'cancel' },
      { text: '로그아웃', style: 'destructive', onPress: () => logout() },
    ]);
  };

  // hydration 중에는 판단 보류 — 로그인된 사용자에게 로그인 프롬프트가 깜빡이지 않게
  if (state.status === 'loading') {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView edges={['top']} style={styles.centerScreen}>
          <ThemedText type="small" style={styles.loginHint}>
            세션 확인 중…
          </ThemedText>
        </SafeAreaView>
      </ThemedView>
    );
  }

  // 비로그인 (웹 미러)
  if (!isAuthenticated) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView edges={['top']} style={styles.centerScreen}>
          <ThemedText style={styles.loginTitle}>로그인이 필요합니다</ThemedText>
          <ThemedText type="small" style={styles.loginHint}>
            프로필을 보려면 로그인해주세요.
          </ThemedText>
          <Pressable
            style={styles.loginButton}
            onPress={() => router.push('/login')}>
            <ThemedText style={styles.loginButtonText}>로그인 하기</ThemedText>
          </Pressable>
        </SafeAreaView>
      </ThemedView>
    );
  }

  const username = state.user.username;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        {/* 헤더: 마이페이지 + 로그아웃 */}
        <View style={styles.header}>
          <ThemedText style={styles.headerTitle}>마이페이지</ThemedText>
          <Pressable onPress={handleLogout} hitSlop={8}>
            <SvgXml xml={LOGOUT} width={24} height={24} />
          </Pressable>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* 프로필 섹션 (그라데이션 링 아바타 — 웹 미러) */}
          <View style={styles.profileRow}>
            <View style={styles.profileLeft}>
              <LinearGradient
                colors={[colors.accent, colors.blue]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.avatarRing}>
                <View style={styles.avatarInner}>
                  <Image
                    source={require('@/assets/images/white-cat.png')}
                    style={styles.avatarImage}
                    contentFit="cover"
                  />
                </View>
              </LinearGradient>
              <View>
                <ThemedText style={styles.username}>{username}</ThemedText>
                <ThemedText type="small" style={styles.handle}>
                  @{username}
                </ThemedText>
              </View>
            </View>
            <ThemedText style={styles.chevron}>›</ThemedText>
          </View>

          {/* 통계 3분할 카드 (웹 #2E2E2E, 구분선 #444) */}
          <View style={styles.statsCard}>
            {(
              [
                ['reviews', '리뷰 작성', reviewCount],
                ['likes', '좋아요', likeCount],
                ['bookmarks', '북마크', bookmarkCount],
              ] as const
            ).map(([id, label, value], idx) => (
              <Pressable
                key={id}
                style={[styles.statCell, idx !== 2 && styles.statDivider]}
                onPress={() => router.push(`/profile/${id}`)}>
                <ThemedText style={styles.statValue}>{value}</ThemedText>
                <ThemedText type="small" style={styles.statLabel}>
                  {label}
                </ThemedText>
              </Pressable>
            ))}
          </View>

          {/* 좋아요 섹션 */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <ThemedText style={styles.sectionTitle}>
                좋아요 {likeCount}
              </ThemedText>
              <Pressable
                onPress={() => router.push('/profile/likes')}
                style={styles.viewAllButton}>
                <ThemedText type="small" style={styles.viewAll}>
                  전체보기
                </ThemedText>
                <SvgXml xml={VIEW_ALL} width={6} height={11} />
              </Pressable>
            </View>
            <ThemedText type="small" style={styles.sectionHint}>
              좋았던 작품을 찜해보세요
            </ThemedText>
            {likesData?.content?.length ? (
              <WorkCarousel
                title=""
                items={likesData.content.map(mapToWorkItem)}
                onItemPress={(id) =>
                  router.push({ pathname: '/work/[id]', params: { id } })
                }
              />
            ) : (
              <EmptySection />
            )}
          </View>

          {/* 보고 싶은 작품 섹션 */}
          <View style={[styles.section, styles.sectionLast]}>
            <View style={styles.sectionHeader}>
              <ThemedText style={styles.sectionTitle}>
                보고 싶은 작품 {bookmarkCount}
              </ThemedText>
              <Pressable
                onPress={() => router.push('/profile/bookmarks')}
                style={styles.viewAllButton}>
                <ThemedText type="small" style={styles.viewAll}>
                  전체보기
                </ThemedText>
                <SvgXml xml={VIEW_ALL} width={6} height={11} />
              </Pressable>
            </View>
            <ThemedText type="small" style={styles.sectionHint}>
              나중에 볼 작품을 등록해요
            </ThemedText>
            {bookmarksData?.content?.length ? (
              <WorkCarousel
                title=""
                items={bookmarksData.content.map(mapToWorkItem)}
                onItemPress={(id) =>
                  router.push({ pathname: '/work/[id]', params: { id } })
                }
              />
            ) : (
              <EmptySection />
            )}
          </View>
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
  centerScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  loginTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  loginHint: {
    color: colors.textBright,
    marginBottom: spacing.md,
  },
  loginButton: {
    backgroundColor: colors.accent,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  loginButtonText: {
    color: colors.textPrimary,
    fontWeight: '500',
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
  logoutText: {
    color: colors.textMuted,
  },
  profileRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    marginTop: spacing.xl,
  },
  profileLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  avatarRing: {
    width: 64,
    height: 64,
    borderRadius: radius.full,
    padding: 2,
  },
  avatarInner: {
    flex: 1,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 36,
    height: 36,
  },
  username: {
    fontSize: 24,
    fontWeight: '700',
  },
  handle: {
    color: colors.textFaint,
  },
  chevron: {
    fontSize: 24,
    color: colors.textFaint,
  },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: '#2E2E2E',
    borderRadius: radius.md,
    marginHorizontal: spacing.xl,
    marginTop: spacing.xxl,
    paddingVertical: spacing.lg,
  },
  statCell: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
  },
  statDivider: {
    borderRightWidth: 1,
    borderRightColor: '#444444',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  statLabel: {
    color: colors.textFaint,
  },
  section: {
    marginTop: spacing.xxl,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: spacing.lg,
  },
  sectionLast: {
    borderBottomWidth: 0,
    paddingBottom: spacing.xxl * 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  viewAll: {
    color: colors.textMuted,
  },
  sectionHint: {
    color: colors.textMuted,
    paddingHorizontal: spacing.xl,
    marginTop: 2,
    marginBottom: spacing.sm,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    gap: spacing.md,
  },
  emptyText: {
    fontSize: 16,
  },
  emptyButton: {
    backgroundColor: colors.accent,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  emptyButtonText: {
    color: colors.textPrimary,
  },
});

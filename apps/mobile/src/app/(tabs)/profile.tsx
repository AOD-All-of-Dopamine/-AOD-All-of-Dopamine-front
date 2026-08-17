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
import { CaretRight, SignOut, User } from 'phosphor-react-native';

import { EmptyState, EmptyStateAction } from '@/components/ui/EmptyState';
import { domainFallbackIcon } from '@/components/ui/WorkCard';
import { ThemedText } from '@/components/themed-text';
import { useAuth } from '@/auth/AuthContext';
import { useMyBookmarks, useMyLikes, useMyReviews } from '@aod/shared/hooks';
import { DOMAIN_LABEL_MAP } from '@aod/shared/constants';
import type { WorkSummary } from '@aod/shared/types';
import { Palette, Radius } from '@/constants/theme';

/**
 * 프로필 탭 - 웹 profile-page 문법의 라이트 재스킨 (M-C 마무리 라운드에서 발견된
 * 스코프 공백 해소). 기존 구조·기능 보존: 로그인 게이트 / 세션 확인 / 마이페이지
 * 헤더+로그아웃 / 프로필 요약 / 통계 3분할(하위 화면 진입) / 좋아요·보고 싶은
 * 작품 가로 릴 + 전체보기.
 *
 * 웹과 동일 편차:
 * - 구 프로필 영역 클릭 이동(/profile/info)은 라우트가 없어 chevron 제거.
 * - 다크 전용 에셋(white-cat·LOGOUT·VIEW_ALL svg)은 Phosphor 아이콘으로 대체 -
 *   구 svg-assets 참조 소거. 릴은 홈 신작 릴 문법(128x170 포스터 + 제목 + meta).
 */

/** 릴 meta - "도메인 · 연도" (웹 profile WorkRailSection meta 미러) */
const railMeta = (work: WorkSummary) => {
  const year = work.releaseDate?.slice(0, 4);
  return [DOMAIN_LABEL_MAP[work.domain] ?? work.domain, year]
    .filter(Boolean)
    .join(' · ');
};

const pushWork = (id: number) =>
  router.push({ pathname: '/work/[id]', params: { id: String(id) } });

function RailCard({ work }: { work: WorkSummary }) {
  const FallbackIcon = domainFallbackIcon(work.domain);
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
          <View style={styles.railFallback}>
            <FallbackIcon size={28} color={Palette.ink3} />
          </View>
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

/** 좋아요·보고 싶은 작품 공용 섹션 (웹 WorkRailSection 미러) */
function WorkRailSection({
  title,
  count,
  description,
  viewAllTo,
  items,
}: {
  title: string;
  count: number;
  description: string;
  viewAllTo: '/profile/likes' | '/profile/bookmarks';
  items: WorkSummary[] | undefined;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <View style={styles.sectionTitleRow}>
          <ThemedText style={styles.sectionTitle}>{title}</ThemedText>
          <ThemedText style={styles.sectionCount}>{count}</ThemedText>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push(viewAllTo)}
          hitSlop={8}
          style={({ pressed }) => [styles.viewAll, pressed && styles.pressed]}>
          <ThemedText style={styles.viewAllText}>전체보기</ThemedText>
          <CaretRight size={13} color={Palette.ink2} />
        </Pressable>
      </View>
      <ThemedText style={styles.sectionHint}>{description}</ThemedText>

      {items && items.length > 0 ? (
        <FlatList
          horizontal
          data={items}
          keyExtractor={(work) => String(work.id)}
          renderItem={({ item }) => <RailCard work={item} />}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.rail}
        />
      ) : (
        <View style={styles.sectionEmpty}>
          <EmptyState
            variant="note"
            title="아직 등록한 작품이 없어요"
          />
          <View style={styles.sectionEmptyAction}>
            <EmptyStateAction
              label="작품 둘러보기"
              onPress={() => router.push('/(tabs)/explore')}
            />
          </View>
        </View>
      )}
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

  // hydration 중에는 판단 보류 - 로그인된 사용자에게 로그인 프롬프트가 깜빡이지 않게
  if (state.status === 'loading') {
    return (
      <View style={styles.screen}>
        <SafeAreaView edges={['top']} style={styles.center}>
          <ActivityIndicator color={Palette.accent} />
          <ThemedText style={styles.loadingText}>세션 확인 중</ThemedText>
        </SafeAreaView>
      </View>
    );
  }

  if (!isAuthenticated) {
    return (
      <View style={styles.screen}>
        <SafeAreaView edges={['top']} style={styles.gate}>
          <EmptyState
            icon={<User size={44} color={Palette.ink3} />}
            title="로그인이 필요해요"
            description="프로필을 보려면 로그인해 주세요."
            action={
              <EmptyStateAction
                label="로그인 하기"
                onPress={() => router.push('/login')}
              />
            }
          />
        </SafeAreaView>
      </View>
    );
  }

  const username = state.user.username;

  return (
    <View style={styles.screen}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}>
          {/* 헤더: 마이페이지 + 로그아웃 (웹 profile-page 헤더 미러) */}
          <View style={styles.headRow}>
            <ThemedText style={styles.pageTitle}>마이페이지</ThemedText>
            <Pressable
              accessibilityRole="button"
              onPress={handleLogout}
              style={({ pressed }) => [
                styles.logoutBtn,
                pressed && styles.pressed,
              ]}>
              <SignOut size={15} color={Palette.ink2} />
              <ThemedText style={styles.logoutText}>로그아웃</ThemedText>
            </Pressable>
          </View>

          {/* 프로필 요약 */}
          <View style={styles.profileRow}>
            <View style={styles.avatar}>
              <User size={30} color={Palette.ink3} />
            </View>
            <View style={styles.profileInfo}>
              <ThemedText numberOfLines={1} style={styles.username}>
                {username}
              </ThemedText>
              <ThemedText numberOfLines={1} style={styles.handle}>
                @{username}
              </ThemedText>
            </View>
          </View>

          {/* 통계 3분할 (하위 화면 진입) */}
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
                accessibilityRole="button"
                onPress={() => router.push(`/profile/${id}`)}
                style={({ pressed }) => [
                  styles.statCell,
                  idx !== 2 && styles.statDivider,
                  pressed && styles.pressed,
                ]}>
                <ThemedText style={styles.statValue}>{value}</ThemedText>
                <ThemedText style={styles.statLabel}>{label}</ThemedText>
              </Pressable>
            ))}
          </View>

          <WorkRailSection
            title="좋아요"
            count={likeCount}
            description="좋았던 작품을 찜해보세요"
            viewAllTo="/profile/likes"
            items={likesData?.content}
          />

          <WorkRailSection
            title="보고 싶은 작품"
            count={bookmarkCount}
            description="나중에 볼 작품을 등록해요"
            viewAllTo="/profile/bookmarks"
            items={bookmarksData?.content}
          />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Palette.canvas,
  },
  safeArea: {
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
    opacity: 0.8,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 13.5,
    lineHeight: 19,
    fontWeight: 400,
    color: Palette.ink2,
  },
  gate: {
    flex: 1,
    justifyContent: 'center',
  },
  headRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 18,
    paddingHorizontal: 16,
  },
  pageTitle: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: 800,
    letterSpacing: -0.4,
    color: Palette.ink,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Palette.line,
    backgroundColor: Palette.surface,
  },
  logoutText: {
    fontSize: 13.5,
    lineHeight: 18,
    fontWeight: 600,
    color: Palette.ink2,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingTop: 22,
    paddingHorizontal: 16,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Palette.line,
    backgroundColor: Palette.surface,
    alignItems: 'center',
    justifyContent: 'center',
    // 목업 shadow-card 근사
    shadowColor: Palette.shadowInk,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  profileInfo: {
    flex: 1,
    minWidth: 0,
  },
  username: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: 800,
    letterSpacing: -0.4,
    color: Palette.ink,
  },
  handle: {
    marginTop: 1,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: 400,
    color: Palette.ink2,
  },
  statsCard: {
    flexDirection: 'row',
    marginTop: 22,
    marginHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.line,
    borderRadius: Radius.panel,
    // 목업 shadow-card 근사
    shadowColor: Palette.shadowInk,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  statCell: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statDivider: {
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: Palette.line,
  },
  statValue: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: 800,
    color: Palette.ink,
    fontVariant: ['tabular-nums'],
  },
  statLabel: {
    fontSize: 13,
    lineHeight: 17,
    fontWeight: 400,
    color: Palette.ink2,
  },
  section: {
    marginTop: 30,
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  sectionTitle: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: 800,
    letterSpacing: -0.2,
    color: Palette.ink,
  },
  sectionCount: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: 700,
    color: Palette.accentInk,
    fontVariant: ['tabular-nums'],
  },
  viewAll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  viewAllText: {
    fontSize: 13.5,
    lineHeight: 18,
    fontWeight: 500,
    color: Palette.ink2,
  },
  sectionHint: {
    marginTop: 2,
    paddingHorizontal: 16,
    fontSize: 13.5,
    lineHeight: 18,
    fontWeight: 400,
    color: Palette.ink3,
  },
  rail: {
    paddingTop: 14,
    paddingHorizontal: 16,
    gap: 10,
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
  railFallback: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.8,
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
  sectionEmpty: {
    marginTop: 14,
    marginHorizontal: 16,
  },
  sectionEmptyAction: {
    alignItems: 'center',
    marginTop: 10,
  },
});

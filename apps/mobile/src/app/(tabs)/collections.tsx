import { useMemo, useRef, useState } from 'react';
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
import { keepPreviousData } from '@tanstack/react-query';
import { Plus, SignIn, Stack, WarningCircle } from 'phosphor-react-native';

import { AppHeader } from '@/components/ui/AppHeader';
import {
  CollectionCard,
  CollectionCardSkeleton,
} from '@/components/ui/CollectionCard';
import { DomainChip } from '@/components/ui/DomainChip';
import { EmptyState, EmptyStateAction } from '@/components/ui/EmptyState';
import { SkeletonPulse } from '@/components/ui/Skeleton';
import { ThemedText } from '@/components/themed-text';
import { useAuth } from '@/auth/AuthContext';
import { useCollections, useMyCollections } from '@aod/shared/hooks';
import type { CollectionSummary } from '@aod/shared/api';
import { Palette, Radius } from '@/constants/theme';

/**
 * 컬렉션 발견 탭 (collections-mockup 5a) - 웹 collections-page의 모바일 이식.
 * 헤드 행(제목 + 새 컬렉션) / 탭 칩 가로 스크롤(인기·최신·도메인4·내 컬렉션) /
 * 콜라주 카드 1열 리스트 / 상태 3종(스켈레톤·에러·빈) + 내 컬렉션 로그인 게이트.
 *
 * 목업·계약 대비 편차 (웹 동일):
 * - "영화·시리즈" 탭: 목록 API가 domain 단수만 받아 MOVIE·TV 2요청을 병합·재정렬.
 * - 도메인 탭 정렬은 인기순 고정.
 * - 페이지네이션 대신 "더 보기" size 증가 재조회 (모바일 리스트 관례,
 *   public 탭은 keepPreviousData로 깜빡임 방지 - useMyCollections는 options
 *   파라미터가 없어 내 컬렉션 탭만 재조회 중 스켈레톤 재표시).
 */

const PAGE_SIZE = 20;

type TabId =
  | 'popular'
  | 'latest'
  | 'game'
  | 'webtoon'
  | 'movies'
  | 'webnovel'
  | 'mine';

const TABS: { id: TabId; label: string }[] = [
  { id: 'popular', label: '인기' },
  { id: 'latest', label: '최신' },
  { id: 'game', label: '게임' },
  { id: 'webtoon', label: '웹툰' },
  { id: 'movies', label: '영화·시리즈' },
  { id: 'webnovel', label: '웹소설' },
  { id: 'mine', label: '내 컬렉션' },
];

/** 단일 도메인 탭 -> API domain 파라미터 (movies는 MOVIE·TV 병합이라 별도 처리) */
const TAB_DOMAIN: Partial<Record<TabId, string>> = {
  game: 'GAME',
  webtoon: 'WEBTOON',
  webnovel: 'WEBNOVEL',
};

/** 병합 탭(영화·시리즈)용 정렬 - 서버 정렬 스펙(CollectionService)과 동일 기준 */
const compareBySort = (sort: 'popular' | 'latest') => {
  return (a: CollectionSummary, b: CollectionSummary) => {
    if (sort === 'popular' && a.likeCount !== b.likeCount) {
      return b.likeCount - a.likeCount;
    }
    if (a.createdAt !== b.createdAt) {
      return a.createdAt < b.createdAt ? 1 : -1;
    }
    return b.id - a.id;
  };
};

export default function CollectionsScreen() {
  const { state: authState } = useAuth();
  const isAuthenticated = authState.status === 'authenticated';
  const listRef = useRef<FlatList<CollectionSummary>>(null);

  const [tab, setTab] = useState<TabId>('popular');
  const [size, setSize] = useState(PAGE_SIZE);

  const isMine = tab === 'mine';
  const isMovies = tab === 'movies';
  const sort: 'popular' | 'latest' = tab === 'latest' ? 'latest' : 'popular';

  const selectTab = (next: TabId) => {
    if (next === tab) return;
    setTab(next);
    setSize(PAGE_SIZE);
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
  };

  // 탭별 쿼리 - 훅 호출은 고정하고 enabled로 발사를 가른다 (웹 동일)
  const publicQuery = useCollections(
    { sort, domain: TAB_DOMAIN[tab], page: 0, size },
    { enabled: !isMine && !isMovies, placeholderData: keepPreviousData },
  );
  const movieQuery = useCollections(
    { sort, domain: 'MOVIE', page: 0, size },
    { enabled: isMovies, placeholderData: keepPreviousData },
  );
  const tvQuery = useCollections(
    { sort, domain: 'TV', page: 0, size },
    { enabled: isMovies, placeholderData: keepPreviousData },
  );
  const mineQuery = useMyCollections(0, size, isMine && isAuthenticated);

  // 활성 탭의 목록·상태로 수렴 (movies는 MOVIE·TV 페이지 병합 + 재정렬)
  const view = useMemo(() => {
    if (isMine) {
      return {
        items: mineQuery.data?.content ?? [],
        hasMore: mineQuery.data ? !mineQuery.data.last : false,
        isLoading: mineQuery.isLoading,
        isFetching: mineQuery.isFetching,
        isError: mineQuery.isError,
        refetch: () => mineQuery.refetch(),
      };
    }
    if (isMovies) {
      const merged = [
        ...(movieQuery.data?.content ?? []),
        ...(tvQuery.data?.content ?? []),
      ].sort(compareBySort(sort));
      return {
        items: merged,
        hasMore:
          (movieQuery.data ? !movieQuery.data.last : false) ||
          (tvQuery.data ? !tvQuery.data.last : false),
        isLoading: movieQuery.isLoading || tvQuery.isLoading,
        isFetching: movieQuery.isFetching || tvQuery.isFetching,
        isError: movieQuery.isError || tvQuery.isError,
        refetch: () => {
          movieQuery.refetch();
          tvQuery.refetch();
        },
      };
    }
    return {
      items: publicQuery.data?.content ?? [],
      hasMore: publicQuery.data ? !publicQuery.data.last : false,
      isLoading: publicQuery.isLoading,
      isFetching: publicQuery.isFetching,
      isError: publicQuery.isError,
      refetch: () => publicQuery.refetch(),
    };
  }, [isMine, isMovies, sort, mineQuery, movieQuery, tvQuery, publicQuery]);

  const { items, hasMore, isLoading, isFetching, isError } = view;
  const needLogin = isMine && !isAuthenticated;

  const goCreate = () => router.push('/collection/new');

  const listHeader = (
    <View>
      {/* 헤드 행 (목업 .m-head-row) */}
      <View style={styles.headRow}>
        <ThemedText style={styles.pageTitle}>컬렉션</ThemedText>
        <Pressable
          accessibilityRole="button"
          onPress={goCreate}
          style={({ pressed }) => [styles.makeBtn, pressed && styles.pressedDim]}>
          <Plus size={14} weight="bold" color={Palette.surface} />
          <ThemedText style={styles.makeBtnText}>새 컬렉션</ThemedText>
        </Pressable>
      </View>

      {/* 탭 칩 (목업 .m-chips) */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipsScroll}
        contentContainerStyle={styles.chipsRow}>
        {TABS.map(({ id, label }) => (
          <DomainChip
            key={id}
            label={label}
            active={tab === id}
            onPress={() => selectTab(id)}
          />
        ))}
      </ScrollView>
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
        data={needLogin || isLoading || isError ? [] : items}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={listHeader}
        renderItem={({ item }) => (
          <CollectionCard
            collection={item}
            style={styles.card}
            onPress={() =>
              router.push({
                pathname: '/collection/[id]',
                params: { id: String(item.id) },
              })
            }
          />
        )}
        ListEmptyComponent={
          needLogin ? (
            <EmptyState
              icon={<SignIn size={44} color={Palette.ink3} />}
              title="로그인하면 내 컬렉션을 볼 수 있어요"
              description="나만 보기 컬렉션까지 한 곳에서 관리할 수 있어요."
              action={
                <EmptyStateAction
                  label="로그인"
                  onPress={() => router.push('/login')}
                />
              }
            />
          ) : isLoading ? (
            <SkeletonPulse style={styles.skeletonList}>
              {Array.from({ length: 3 }, (_, i) => (
                <CollectionCardSkeleton key={i} style={styles.card} />
              ))}
            </SkeletonPulse>
          ) : isError ? (
            <EmptyState
              icon={<WarningCircle size={44} color={Palette.ink3} />}
              title="컬렉션을 불러오지 못했어요"
              description="네트워크 상태를 확인한 뒤 다시 시도해 주세요."
              action={
                <EmptyStateAction label="다시 시도" onPress={view.refetch} />
              }
            />
          ) : (
            <EmptyState
              icon={<Stack size={44} color={Palette.ink3} />}
              title="아직 컬렉션이 없어요"
              description={
                isMine
                  ? '마음에 드는 작품을 모아 첫 컬렉션을 꾸려보세요.'
                  : '첫 번째 컬렉션의 주인공이 되어보세요.'
              }
              action={<EmptyStateAction label="새 컬렉션" onPress={goCreate} />}
            />
          )
        }
        ListFooterComponent={
          !needLogin && !isLoading && !isError && hasMore ? (
            <Pressable
              accessibilityRole="button"
              disabled={isFetching}
              onPress={() => setSize((s) => s + PAGE_SIZE)}
              style={({ pressed }) => [
                styles.moreBtn,
                pressed && styles.pressedDim,
              ]}>
              {isFetching ? (
                <ActivityIndicator size="small" color={Palette.ink2} />
              ) : (
                <ThemedText style={styles.moreBtnText}>더 보기</ThemedText>
              )}
            </Pressable>
          ) : null
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
  pressedDim: {
    opacity: 0.8,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 28,
  },
  headRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 16,
    paddingHorizontal: 16,
  },
  pageTitle: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: 800,
    letterSpacing: -0.4,
    color: Palette.ink,
  },
  makeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.pill,
    backgroundColor: Palette.accentInk,
  },
  makeBtnText: {
    fontSize: 13,
    lineHeight: 17,
    fontWeight: 700,
    color: Palette.surface,
  },
  chipsScroll: {
    flexGrow: 0,
  },
  chipsRow: {
    paddingTop: 12,
    paddingBottom: 10,
    paddingHorizontal: 16,
    gap: 6,
  },
  card: {
    marginHorizontal: 16,
    marginBottom: 14,
  },
  skeletonList: {
    paddingTop: 0,
  },
  moreBtn: {
    marginTop: 2,
    marginHorizontal: 16,
    paddingVertical: 12,
    borderRadius: Radius.input,
    borderWidth: 1,
    borderColor: Palette.line,
    backgroundColor: Palette.surface,
    alignItems: 'center',
  },
  moreBtnText: {
    fontSize: 14,
    lineHeight: 19,
    fontWeight: 600,
    color: Palette.ink2,
  },
});

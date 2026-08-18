import { useState } from 'react';
import { FlatList, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { BookmarkSimple, MagnifyingGlass, WarningCircle } from 'phosphor-react-native';

import { DetailTopBar } from '@/components/ui/DetailTopBar';
import { EmptyState, EmptyStateAction } from '@/components/ui/EmptyState';
import { SkeletonPulse, WorkCardSkeleton } from '@/components/ui/Skeleton';
import { WorkCard } from '@/components/ui/WorkCard';
import {
  workCardFooter,
  workCardMeta,
  workCardTags,
} from '@/components/ui/workCardInfo';
import { useMyBookmarks } from '@aod/shared/hooks';
import type { WorkSummary } from '@aod/shared/types';
import { Palette, Radius } from '@/constants/theme';
import { fonts } from '@/theme/tokens';

/**
 * 프로필 > 내가 북마크한 작품 - 웹 my-bookmarks-page 문법 이식.
 * 기존 구조(제목 검색 + 카드 그리드) 유지 + 신규 WorkCard 문법(2열, meta에
 * 도메인 라벨 포함, 도메인별 태그·foot) + 상태 3종(스켈레톤/에러/빈) 정합.
 * 혼합 도메인 목록이라 카드 variant는 portrait 통일 (검색 혼합 목록 편차 동일).
 */
export default function MyBookmarksScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const { data, isLoading, isError, refetch } = useMyBookmarks(0, 1000);

  const filtered = (data?.content ?? []).filter((work: WorkSummary) =>
    work.title.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const listHeader = (
    <View style={styles.searchWrap}>
      <View style={styles.searchPill}>
        <MagnifyingGlass size={16} color={Palette.ink3} />
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="작품 제목 검색"
          placeholderTextColor={Palette.ink3}
          accessibilityLabel="북마크한 작품 검색"
          style={styles.searchInput}
        />
      </View>
    </View>
  );

  return (
    <View style={styles.screen}>
      <SafeAreaView edges={['top']} style={styles.top}>
        <DetailTopBar title="내가 북마크한 작품" />
      </SafeAreaView>

      <FlatList
        style={styles.list}
        data={isLoading || isError ? [] : filtered}
        keyExtractor={(work) => String(work.id)}
        keyboardShouldPersistTaps="handled"
        numColumns={2}
        columnWrapperStyle={styles.gridRow}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={listHeader}
        renderItem={({ item: work }) => (
          <WorkCard
            variant="portrait"
            title={work.title}
            meta={workCardMeta(work, { withDomain: true })}
            tags={workCardTags(work)}
            footer={workCardFooter(work)}
            imageUrl={work.thumbnail}
            domain={work.domain}
            onPress={() =>
              router.push({
                pathname: '/work/[id]',
                params: { id: String(work.id) },
              })
            }
            style={styles.gridCell}
          />
        )}
        ListEmptyComponent={
          isLoading ? (
            <SkeletonPulse style={styles.skeletonGrid}>
              {Array.from({ length: 4 }, (_, i) => (
                <WorkCardSkeleton
                  key={i}
                  variant="portrait"
                  style={styles.skeletonCell}
                />
              ))}
            </SkeletonPulse>
          ) : isError ? (
            <EmptyState
              icon={<WarningCircle size={44} color={Palette.ink3} />}
              title="북마크한 작품을 불러오지 못했어요"
              description="네트워크 상태를 확인한 뒤 다시 시도해 주세요."
              action={
                <EmptyStateAction label="다시 시도" onPress={() => refetch()} />
              }
            />
          ) : (data?.content.length ?? 0) > 0 ? (
            <View style={styles.noteWrap}>
              <EmptyState
                variant="note"
                title="검색어와 일치하는 작품이 없어요. 다른 제목으로 검색해 보세요."
              />
            </View>
          ) : (
            <EmptyState
              icon={<BookmarkSimple size={44} color={Palette.ink3} />}
              title="아직 북마크한 작품이 없어요"
              description="나중에 볼 작품을 북마크로 모아보세요."
              action={
                <EmptyStateAction
                  label="작품 둘러보기"
                  onPress={() => router.push('/(tabs)/explore')}
                />
              }
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
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 28,
  },
  searchWrap: {
    paddingTop: 12,
    paddingBottom: 12,
    paddingHorizontal: 16,
  },
  searchPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 40,
    paddingHorizontal: 14,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Palette.line,
    backgroundColor: Palette.surface,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: fonts.regular,
    color: Palette.ink,
    paddingVertical: 0,
  },
  gridRow: {
    gap: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  gridCell: {
    flex: 1,
    maxWidth: '50%',
  },
  skeletonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingHorizontal: 16,
  },
  skeletonCell: {
    flexBasis: '46%',
    flexGrow: 1,
  },
  noteWrap: {
    paddingHorizontal: 16,
  },
});

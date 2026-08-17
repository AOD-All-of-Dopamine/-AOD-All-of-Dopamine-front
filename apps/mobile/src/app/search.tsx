import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { ArrowLeft, MagnifyingGlass, WarningCircle } from 'phosphor-react-native';

import { DomainChip } from '@/components/ui/DomainChip';
import { EmptyState, EmptyStateAction } from '@/components/ui/EmptyState';
import { IconButton } from '@/components/ui/IconButton';
import { SkeletonPulse, WorkCardSkeleton } from '@/components/ui/Skeleton';
import { WorkCard } from '@/components/ui/WorkCard';
import {
  workCardFooter,
  workCardMeta,
  workCardTags,
} from '@/components/ui/workCardInfo';
import { ThemedText } from '@/components/themed-text';
import { useSearchWorks } from '@aod/shared/hooks';
import { DOMAIN_FILTERS } from '@aod/shared/constants';
import type { WorkSummary } from '@aod/shared/types';
import { Palette, Radius } from '@/constants/theme';
import { fonts } from '@/theme/tokens';

/**
 * 검색 - 웹 search-page.tsx 문법(뒤로가기 + 검색 필 + 도메인 칩 + 카드 그리드)의
 * RN 이식. 카드는 공용 WorkCard + workCardInfo 파생(혼합 도메인이라 meta에 도메인
 * 라벨, 도메인별 foot)으로 통일.
 * 검색 로직은 기존 유지 - useSearchWorks + 페이지 누적("더 보기", id 기준 dedup).
 */

const PAGE_SIZE = 20;

export default function SearchScreen() {
  const [input, setInput] = useState('');
  const [keyword, setKeyword] = useState('');
  const [selectedDomain, setSelectedDomain] = useState<string>('ALL');
  const [page, setPage] = useState(0);
  const [items, setItems] = useState<WorkSummary[]>([]);

  const { data, isLoading, isError, isFetching, refetch } = useSearchWorks(
    keyword,
    {
      page,
      size: PAGE_SIZE,
      domain: selectedDomain === 'ALL' ? undefined : selectedDomain,
    },
  );

  // 페이지 누적 (웹 숫자 페이지네이션의 모바일 대체 - "더 보기").
  // 재연결 등으로 같은 페이지가 refetch되어도 중복 append되지 않게 id 기준 dedup.
  useEffect(() => {
    if (!data) return;
    setItems((prev) => {
      if (data.page === 0) return data.content;
      const seen = new Set(prev.map((w) => w.id));
      return [...prev, ...data.content.filter((w) => !seen.has(w.id))];
    });
  }, [data]);

  const submit = () => {
    setKeyword(input.trim());
    setPage(0);
  };

  const selectDomain = (id: string) => {
    if (id === selectedDomain) return;
    setSelectedDomain(id);
    setPage(0);
  };

  const hasMore = data ? !data.last : false;
  const showSkeleton = isLoading && items.length === 0;

  return (
    <View style={styles.screen}>
      <Stack.Screen
        options={{ headerShown: false, presentation: 'modal' }}
      />
      <SafeAreaView edges={['top']} style={styles.safe}>
        {/* 뒤로가기 + 검색 필 (웹 search-page 헤더 문법) */}
        <View style={styles.searchBar}>
          <IconButton label="뒤로 가기" onPress={() => router.back()}>
            <ArrowLeft size={21} color={Palette.ink} />
          </IconButton>
          <View style={styles.inputPill}>
            <MagnifyingGlass size={16} color={Palette.ink3} />
            <TextInput
              style={styles.input}
              accessibilityLabel="작품 검색"
              placeholder="작품, 개발사, 작가 검색"
              placeholderTextColor={Palette.ink3}
              autoFocus
              returnKeyType="search"
              value={input}
              onChangeText={setInput}
              onSubmitEditing={submit}
            />
          </View>
        </View>

        {/* 도메인 칩 (목업 .chips-row) */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipsScroll}
          contentContainerStyle={styles.chipsRow}
          keyboardShouldPersistTaps="handled">
          {DOMAIN_FILTERS.map((filter) => (
            <DomainChip
              key={filter.id}
              label={filter.label}
              active={selectedDomain === filter.id}
              onPress={() => selectDomain(filter.id)}
            />
          ))}
        </ScrollView>

        {/* 결과: 스켈레톤 / 검색 전 / 에러 / 빈 결과 / 그리드 */}
        {showSkeleton ? (
          <SkeletonPulse style={styles.skeletonGrid}>
            {Array.from({ length: 6 }, (_, i) => (
              <WorkCardSkeleton
                key={i}
                variant="portrait"
                style={styles.skeletonCell}
              />
            ))}
          </SkeletonPulse>
        ) : keyword === '' ? (
          <EmptyState
            icon={<MagnifyingGlass size={44} color={Palette.ink3} />}
            title="검색어를 입력해 주세요"
            description="작품 제목이나 제작자 이름으로 찾을 수 있어요."
          />
        ) : isError && items.length === 0 ? (
          <EmptyState
            icon={<WarningCircle size={44} color={Palette.ink3} />}
            title="검색 결과를 불러오지 못했어요"
            description="네트워크 상태를 확인한 뒤 다시 시도해 주세요."
            action={
              <EmptyStateAction label="다시 시도" onPress={() => refetch()} />
            }
          />
        ) : items.length === 0 ? (
          <EmptyState
            title="검색 결과가 없어요"
            description="다른 검색어로 다시 시도해 보세요."
          />
        ) : (
          <FlatList
            style={styles.list}
            data={items}
            keyExtractor={(item) => String(item.id)}
            keyboardShouldPersistTaps="handled"
            numColumns={2}
            columnWrapperStyle={styles.gridRow}
            contentContainerStyle={styles.gridContent}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <WorkCard
                variant="portrait"
                title={item.title}
                meta={workCardMeta(item, { withDomain: true })}
                tags={workCardTags(item)}
                footer={workCardFooter(item)}
                imageUrl={item.thumbnail}
                domain={item.domain}
                onPress={() =>
                  router.push({
                    pathname: '/work/[id]',
                    params: { id: String(item.id) },
                  })
                }
                style={styles.gridCell}
              />
            )}
            ListFooterComponent={
              hasMore ? (
                <Pressable
                  accessibilityRole="button"
                  style={({ pressed }) => [
                    styles.moreButton,
                    pressed && styles.pressed,
                  ]}
                  onPress={() => setPage((p) => p + 1)}
                  disabled={isFetching}>
                  {isFetching ? (
                    <ActivityIndicator color={Palette.accent} />
                  ) : (
                    <ThemedText style={styles.moreText}>더 보기</ThemedText>
                  )}
                </Pressable>
              ) : null
            }
          />
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Palette.canvas,
  },
  safe: {
    flex: 1,
  },
  pressed: {
    opacity: 0.85,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 10,
    paddingLeft: 8,
    paddingRight: 16,
  },
  inputPill: {
    flex: 1,
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Palette.line,
    backgroundColor: Palette.surface,
  },
  input: {
    flex: 1,
    paddingVertical: 0,
    fontSize: 15,
    fontFamily: fonts.regular,
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
  skeletonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingTop: 14,
    paddingHorizontal: 16,
  },
  skeletonCell: {
    flexBasis: '46%',
    flexGrow: 1,
  },
  list: {
    flex: 1,
  },
  gridRow: {
    gap: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  gridContent: {
    paddingTop: 14,
    paddingBottom: 28,
  },
  gridCell: {
    flex: 1,
    maxWidth: '50%',
  },
  moreButton: {
    marginTop: 4,
    marginHorizontal: 16,
    paddingVertical: 12,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Palette.lineStrong,
    backgroundColor: Palette.surface,
    alignItems: 'center',
  },
  moreText: {
    fontSize: 14,
    lineHeight: 19,
    fontWeight: 600,
    color: Palette.ink,
  },
});

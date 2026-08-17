import { useMemo, useRef, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  ArrowCounterClockwise,
  ArrowsDownUp,
  Faders,
  WarningCircle,
} from 'phosphor-react-native';

import { AppHeader } from '@/components/ui/AppHeader';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { DomainChip } from '@/components/ui/DomainChip';
import { EmptyState, EmptyStateAction } from '@/components/ui/EmptyState';
import { FilterChip } from '@/components/ui/FilterChip';
import { SkeletonPulse, WorkCardSkeleton } from '@/components/ui/Skeleton';
import { WorkCard } from '@/components/ui/WorkCard';
import {
  workCardFooter,
  workCardMeta,
  workCardTags,
} from '@/components/ui/workCardInfo';
import { ThemedText } from '@/components/themed-text';
import { useGenres, useInfiniteWorks, usePlatforms } from '@aod/shared/hooks';
import {
  COLLECTION_SOURCES,
  DOMAIN_FILTERS,
  platformLabel,
} from '@aod/shared/constants';
import type { WorkSummary } from '@aod/shared/types';
import { Palette, Radius } from '@/constants/theme';

/**
 * 탐색 (목업 프레임 2·3) - 도메인 칩 가로 스크롤 / 필터 버튼(활성 개수 뱃지) +
 * 활성 칩 행 / 결과 수·정렬 라벨 / 2열 카드 그리드 / 필터 바텀시트.
 *
 * 필터 축은 웹 explore-page.tsx와 동일 (백엔드 findWorks 계약 기준) -
 * 웹은 URL 쿼리가 단일 출처, 모바일은 같은 축을 로컬 상태로 유지한다:
 * - 공통: 장르(@> AND) / 플랫폼(&& OR). 영화·시리즈는 수집 소스(TMDB_*)를 뺀
 *   "볼 수 있는 곳"만 노출
 * - 게임·웹소설·영화·시리즈: 출시(개봉) 시기 era 프리셋 -> releaseFrom/To
 * - 웹툰 전용: 연재 상태(radio) / 연재 요일 / 연령 등급. 완결 선택 시 요일 자동
 *   해제 (완결작 weekday null - 조합이 항상 0건)
 * - 전체 탭: 백엔드가 domain 없이는 필터를 적용하지 않아 필터 미지원 안내만
 *
 * 시트는 즉시 적용 - 스테이징 상태 없음. footer [닫기 | N개 작품 보기] 둘 다 닫기.
 * 목록은 FlatList 무한 스크롤 유지 (useInfiniteWorks).
 */

type DomainId = 'all' | 'movie' | 'tv' | 'game' | 'webtoon' | 'webnovel';

const PAGE_SIZE = 30;

/** 장르 접기 기본 노출 개수 (웹툰 장르가 수십 개라 접기 필요 - 웹 동일) */
const GENRE_COLLAPSE_LIMIT = 12;

/** 아직 수집 전인 플랫폼의 로드맵 표기 (웹 SOON_PLATFORMS 미러) */
const SOON_PLATFORMS: Record<string, string[]> = {
  GAME: ['Epic Games'],
  WEBTOON: ['카카오웹툰'],
  WEBNOVEL: ['카카오페이지'],
};

/** 출시 시기 radio 프리셋 (웹 ERA_OPTIONS 미러) */
const ERA_OPTIONS = [
  { value: '', label: '전체' },
  { value: '2024', label: '2024년 이후' },
  { value: '2020', label: '2020년대 초' },
  { value: '2010', label: '2010년대' },
  { value: 'old', label: '2009년 이전' },
];

/** era 프리셋 -> releaseFrom/To(yyyy-MM-dd) 매핑 */
const ERA_RANGE: Record<string, { from?: string; to?: string }> = {
  '2024': { from: '2024-01-01' },
  '2020': { from: '2020-01-01', to: '2023-12-31' },
  '2010': { from: '2010-01-01', to: '2019-12-31' },
  old: { to: '2009-12-31' },
};

/** 웹툰 연재 상태 - DB 실측값 그대로 */
const STATUS_VALUES = ['연재중', '완결'];

/** 웹툰 연재 요일 - 값은 DB 실측값(mon~sun), 라벨은 월~일 */
const WEEKDAY_OPTIONS = [
  { value: 'mon', label: '월' },
  { value: 'tue', label: '화' },
  { value: 'wed', label: '수' },
  { value: 'thu', label: '목' },
  { value: 'fri', label: '금' },
  { value: 'sat', label: '토' },
  { value: 'sun', label: '일' },
];

/** 웹툰 연령 등급 - DB 실측값 그대로 */
const AGE_OPTIONS = ['전체이용가', '12세이용가', '15세이용가', '19세이용가'];

const eraLabel = (value: string) =>
  ERA_OPTIONS.find((o) => o.value === value)?.label ?? value;

const weekdayChipLabel = (value: string) => {
  const day = WEEKDAY_OPTIONS.find((o) => o.value === value)?.label ?? value;
  return `${day}요일`;
};

const toggleValue = (list: string[], value: string) =>
  list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

/** 시트 필터 그룹 (목업 .fgroup) */
function SheetGroup({
  title,
  last = false,
  children,
}: {
  title: string;
  last?: boolean;
  children: ReactNode;
}) {
  return (
    <View style={[styles.fgroup, last && styles.fgroupLast]}>
      <ThemedText style={styles.fgroupTitle}>{title}</ThemedText>
      {children}
    </View>
  );
}

/** 시트 옵션 pill (목업 .opt) - on = accent-tint 배경 + accent-ink 테두리·텍스트 */
function OptPill({
  label,
  on = false,
  disabled = false,
  soonLabel,
  onPress,
}: {
  label: string;
  on?: boolean;
  disabled?: boolean;
  soonLabel?: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: on, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.opt,
        on && styles.optOn,
        disabled && styles.optDisabled,
        pressed && styles.pressedDim,
      ]}>
      <ThemedText style={[styles.optText, on && styles.optTextOn]}>
        {soonLabel ? `${label} · ${soonLabel}` : label}
      </ThemedText>
    </Pressable>
  );
}

/** 시트 라디오 열 (목업 .radio-col) - 단일 선택 축(연재 상태, 출시 시기) */
function SheetRadioGroup({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <View style={styles.radioCol}>
      {options.map((option) => {
        const on = value === option.value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            onPress={() => onChange(option.value)}
            style={({ pressed }) => [
              styles.radioItem,
              pressed && styles.pressedDim,
            ]}>
            <View style={[styles.radioOuter, on && styles.radioOuterOn]}>
              {on && <View style={styles.radioDot} />}
            </View>
            <ThemedText
              style={[styles.radioLabel, on && styles.radioLabelOn]}>
              {option.label}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

/** 필터 옵션 로드 실패 시 그룹 자리 표시 (웹 FilterLoadError 미러) */
function FilterLoadError({ onRetry }: { onRetry: () => void }) {
  return (
    <View style={styles.filterLoadError}>
      <View style={styles.filterLoadErrorRow}>
        <WarningCircle size={14} color={Palette.ink2} />
        <ThemedText style={styles.filterLoadErrorText}>
          필터를 불러오지 못했어요
        </ThemedText>
      </View>
      <Pressable accessibilityRole="button" onPress={onRetry} hitSlop={6}>
        <ThemedText style={styles.filterLoadErrorRetry}>다시 시도</ThemedText>
      </Pressable>
    </View>
  );
}

export default function ExploreScreen() {
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList<WorkSummary>>(null);

  // 웹 URL 쿼리 축과 동일한 로컬 상태 (기본 도메인 game - 웹 동일)
  const [domainId, setDomainId] = useState<DomainId>('game');
  const [genres, setGenres] = useState<string[]>([]);
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [era, setEra] = useState('');
  const [status, setStatus] = useState('');
  const [weekdays, setWeekdays] = useState<string[]>([]);
  const [ages, setAges] = useState<string[]>([]);
  const [genresExpanded, setGenresExpanded] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  const isAll = domainId === 'all';
  const isWebtoon = domainId === 'webtoon';
  const isOttDomain = domainId === 'movie' || domainId === 'tv';
  const domainKey = isAll ? undefined : domainId.toUpperCase();

  const resetFilters = () => {
    setGenres([]);
    setPlatforms([]);
    setEra('');
    setStatus('');
    setWeekdays([]);
    setAges([]);
  };

  // 도메인 전환 시 필터·펼침 리셋 + 목록 최상단 (웹 동작 동일)
  const selectDomain = (id: DomainId) => {
    if (id === domainId) return;
    setDomainId(id);
    resetFilters();
    setGenresExpanded(false);
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
  };

  // 완결 선택 시 요일 자동 해제 (완결작 weekday null - 조합이 항상 0건)
  const handleStatusChange = (next: string) => {
    setStatus(next);
    if (next === '완결') setWeekdays([]);
  };

  const eraRange = era ? ERA_RANGE[era] : undefined;
  const {
    data,
    isLoading,
    isError,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteWorks({
    domain: domainKey,
    genres: genres.length > 0 ? genres : undefined,
    platforms: platforms.length > 0 ? platforms : undefined,
    releaseFrom: eraRange?.from,
    releaseTo: eraRange?.to,
    status: status || undefined,
    weekdays: weekdays.length > 0 ? weekdays : undefined,
    ageRatings: ages.length > 0 ? ages : undefined,
    size: PAGE_SIZE,
    // 도메인 경로는 서버가 release_date DESC 고정, 전체 탭만 이 값을 따른다 (웹 동일)
    sortBy: 'releaseDate',
    sortDirection: 'desc',
  });

  const works = data?.pages.flatMap((page) => page.content) ?? [];
  const totalElements = data?.pages?.[0]?.totalElements ?? 0;

  const genresQuery = useGenres(domainKey, { enabled: !isAll });
  const platformsQuery = usePlatforms(domainKey, { enabled: !isAll });

  const sortedGenres = useMemo(
    () => [...(genresQuery.data ?? [])].sort((a, b) => a.localeCompare(b, 'ko')),
    [genresQuery.data],
  );

  // 접힘 상태에서도 체크된 항목은 유지 노출 (칩-레일 불일치 방지, 웹 동일)
  const visibleGenres = genresExpanded
    ? sortedGenres
    : sortedGenres.filter(
        (g, i) => i < GENRE_COLLAPSE_LIMIT || genres.includes(g),
      );
  const hiddenGenreCount = sortedGenres.length - visibleGenres.length;

  // 영화·시리즈는 수집 소스(TMDB_*)를 제외한 OTT만 "볼 수 있는 곳"으로 노출
  const visiblePlatforms = isOttDomain
    ? (platformsQuery.data ?? []).filter((v) => !COLLECTION_SOURCES.includes(v))
    : (platformsQuery.data ?? []);

  // "준비 중" 항목 - API 목록에 같은 라벨이 있으면 중복 추가하지 않는다
  const apiPlatformLabels = (platformsQuery.data ?? []).map(platformLabel);
  const soonPlatforms = (SOON_PLATFORMS[domainKey ?? ''] ?? []).filter(
    (label) => !apiPlatformLabels.includes(label),
  );

  const activeFilterCount =
    genres.length +
    platforms.length +
    (era ? 1 : 0) +
    (status ? 1 : 0) +
    weekdays.length +
    ages.length;
  const hasActiveFilters = activeFilterCount > 0;

  // 활성 필터 칩 - 모든 축의 개별 제거 지원 (웹 activeFilterChips 미러)
  const activeFilterChips = [
    ...platforms.map((v) => ({
      key: `platform-${v}`,
      label: platformLabel(v),
      onRemove: () => setPlatforms((prev) => prev.filter((x) => x !== v)),
    })),
    ...genres.map((g) => ({
      key: `genre-${g}`,
      label: g,
      onRemove: () => setGenres((prev) => prev.filter((x) => x !== g)),
    })),
    ...(era
      ? [{ key: 'era', label: eraLabel(era), onRemove: () => setEra('') }]
      : []),
    ...(status
      ? [
          {
            key: 'status',
            label: status,
            onRemove: () => handleStatusChange(''),
          },
        ]
      : []),
    ...weekdays.map((w) => ({
      key: `weekday-${w}`,
      label: weekdayChipLabel(w),
      onRemove: () => setWeekdays((prev) => prev.filter((x) => x !== w)),
    })),
    ...ages.map((a) => ({
      key: `age-${a}`,
      label: a,
      onRemove: () => setAges((prev) => prev.filter((x) => x !== a)),
    })),
  ];

  const variant = domainId === 'game' ? 'landscape' : 'portrait';

  const listHeader = (
    <View>
      {/* 도메인 칩 (목업 .chips-row - nowrap 가로 스크롤) */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipsScroll}
        contentContainerStyle={styles.chipsRow}>
        {DOMAIN_FILTERS.map((d) => {
          const id = d.id.toLowerCase() as DomainId;
          return (
            <DomainChip
              key={d.id}
              label={d.label}
              active={domainId === id}
              onPress={() => selectDomain(id)}
            />
          );
        })}
      </ScrollView>

      {/* 툴바 - 필터 버튼 + 활성 칩 가로 스크롤 (목업 .toolbar) */}
      <View style={styles.toolbar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            hasActiveFilters ? `필터, ${activeFilterCount}개 적용됨` : '필터'
          }
          onPress={() => setSheetOpen(true)}
          style={({ pressed }) => [
            styles.filterBtn,
            pressed && styles.pressedDim,
          ]}>
          <Faders size={15} color={Palette.ink} />
          <ThemedText style={styles.filterBtnText}>필터</ThemedText>
          {activeFilterCount > 0 && (
            <View style={styles.filterCount}>
              <ThemedText style={styles.filterCountText}>
                {activeFilterCount}
              </ThemedText>
            </View>
          )}
        </Pressable>
        {activeFilterChips.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.activeChipsScroll}
            contentContainerStyle={styles.activeChips}>
            {activeFilterChips.map((chip) => (
              <FilterChip
                key={chip.key}
                label={chip.label}
                onRemove={chip.onRemove}
              />
            ))}
          </ScrollView>
        )}
      </View>

      {/* 결과 수 + 정렬 (목업 .result-line - 서버 정렬 고정이라 정적 라벨) */}
      <View style={styles.resultLine}>
        {!isLoading && !isError ? (
          <ThemedText style={styles.resultText}>
            <ThemedText style={styles.resultCount}>
              {totalElements.toLocaleString()}
            </ThemedText>
            개 작품
          </ThemedText>
        ) : (
          <View />
        )}
        <View style={styles.sort}>
          <ArrowsDownUp size={14} color={Palette.ink2} />
          <ThemedText style={styles.sortText}>최신 출시순</ThemedText>
        </View>
      </View>
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
        data={isLoading || isError ? [] : works}
        keyExtractor={(item) => String(item.id)}
        numColumns={2}
        columnWrapperStyle={styles.gridRow}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        onEndReached={() => {
          if (hasNextPage && !isFetchingNextPage) fetchNextPage();
        }}
        onEndReachedThreshold={0.8}
        ListHeaderComponent={listHeader}
        renderItem={({ item }) => (
          <WorkCard
            variant={variant}
            title={item.title}
            meta={workCardMeta(item, { withDomain: isAll })}
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
        ListEmptyComponent={
          isLoading ? (
            <SkeletonPulse style={styles.skeletonGrid}>
              {Array.from({ length: 6 }, (_, i) => (
                <WorkCardSkeleton
                  key={i}
                  variant={variant}
                  style={styles.skeletonCell}
                />
              ))}
            </SkeletonPulse>
          ) : isError ? (
            <EmptyState
              icon={<WarningCircle size={44} color={Palette.ink3} />}
              title="작품을 불러오지 못했어요"
              description="네트워크 상태를 확인한 뒤 다시 시도해 주세요."
              action={
                <EmptyStateAction label="다시 시도" onPress={() => refetch()} />
              }
            />
          ) : (
            <EmptyState
              title="조건에 맞는 작품이 없어요"
              description={
                hasActiveFilters
                  ? '필터를 조금 풀어보시면 더 많은 작품을 만날 수 있어요.'
                  : '아직 수집된 작품이 없어요. 조금만 기다려 주세요.'
              }
              action={
                hasActiveFilters ? (
                  <EmptyStateAction label="필터 초기화" onPress={resetFilters} />
                ) : undefined
              }
            />
          )
        }
        ListFooterComponent={
          isFetchingNextPage ? (
            <ActivityIndicator
              color={Palette.accent}
              style={styles.footerLoading}
            />
          ) : null
        }
      />

      {/* 필터 바텀시트 (목업 프레임 3) - 즉시 적용, 스테이징 없음 */}
      <BottomSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        label="필터">
        <View style={styles.sheetHead}>
          <ThemedText style={styles.sheetTitle}>필터</ThemedText>
          <Pressable
            accessibilityRole="button"
            onPress={resetFilters}
            hitSlop={8}
            style={({ pressed }) => [
              styles.sheetReset,
              pressed && styles.pressedDim,
            ]}>
            <ArrowCounterClockwise size={13} color={Palette.ink2} />
            <ThemedText style={styles.sheetResetText}>초기화</ThemedText>
          </Pressable>
        </View>

        <ScrollView
          style={styles.sheetScroll}
          contentContainerStyle={styles.sheetBody}
          showsVerticalScrollIndicator={false}>
          {isAll ? (
            <ThemedText style={styles.sheetNote}>
              전체 탭에서는 필터를 지원하지 않아요. 도메인을 선택하면 장르와
              플랫폼 필터를 쓸 수 있어요.
            </ThemedText>
          ) : (
            <>
              {genresQuery.isError ? (
                <FilterLoadError onRetry={() => genresQuery.refetch()} />
              ) : (
                sortedGenres.length > 0 && (
                  <SheetGroup title="장르">
                    <View style={styles.optWrap}>
                      {visibleGenres.map((g) => (
                        <OptPill
                          key={g}
                          label={g}
                          on={genres.includes(g)}
                          onPress={() =>
                            setGenres((prev) => toggleValue(prev, g))
                          }
                        />
                      ))}
                      {(genresExpanded || hiddenGenreCount > 0) && (
                        <OptPill
                          label={
                            genresExpanded
                              ? '접기'
                              : `더보기 +${hiddenGenreCount}`
                          }
                          onPress={() => setGenresExpanded((v) => !v)}
                        />
                      )}
                    </View>
                  </SheetGroup>
                )
              )}
              {platformsQuery.isError ? (
                <FilterLoadError onRetry={() => platformsQuery.refetch()} />
              ) : (
                (visiblePlatforms.length > 0 || soonPlatforms.length > 0) && (
                  <SheetGroup title={isOttDomain ? '볼 수 있는 곳' : '플랫폼'}>
                    <View style={styles.optWrap}>
                      {visiblePlatforms.map((v) => (
                        <OptPill
                          key={v}
                          label={platformLabel(v)}
                          on={platforms.includes(v)}
                          onPress={() =>
                            setPlatforms((prev) => toggleValue(prev, v))
                          }
                        />
                      ))}
                      {soonPlatforms.map((label) => (
                        <OptPill
                          key={label}
                          label={label}
                          disabled
                          soonLabel="준비 중"
                        />
                      ))}
                    </View>
                  </SheetGroup>
                )
              )}
              {isWebtoon ? (
                <>
                  <SheetGroup title="연재 상태">
                    <SheetRadioGroup
                      value={status}
                      onChange={handleStatusChange}
                      options={[
                        { value: '', label: '전체' },
                        ...STATUS_VALUES.map((v) => ({ value: v, label: v })),
                      ]}
                    />
                  </SheetGroup>
                  {/* 완결작은 weekday null이라 요일 그룹은 완결 상태에서 숨김 */}
                  {status !== '완결' && (
                    <SheetGroup title="연재 요일">
                      <View style={styles.optWrap}>
                        {WEEKDAY_OPTIONS.map((option) => (
                          <OptPill
                            key={option.value}
                            label={option.label}
                            on={weekdays.includes(option.value)}
                            onPress={() =>
                              setWeekdays((prev) =>
                                toggleValue(prev, option.value),
                              )
                            }
                          />
                        ))}
                      </View>
                    </SheetGroup>
                  )}
                  <SheetGroup title="연령 등급" last>
                    <View style={styles.optWrap}>
                      {AGE_OPTIONS.map((age) => (
                        <OptPill
                          key={age}
                          label={age}
                          on={ages.includes(age)}
                          onPress={() =>
                            setAges((prev) => toggleValue(prev, age))
                          }
                        />
                      ))}
                    </View>
                  </SheetGroup>
                </>
              ) : (
                <SheetGroup title={isOttDomain ? '개봉 시기' : '출시 시기'} last>
                  <SheetRadioGroup
                    value={era}
                    onChange={setEra}
                    options={ERA_OPTIONS}
                  />
                </SheetGroup>
              )}
            </>
          )}
        </ScrollView>

        {/* footer: 닫기 | N개 작품 보기 - 둘 다 닫기 (필터는 이미 적용됨) */}
        <View
          style={[styles.sheetFoot, { paddingBottom: 18 + insets.bottom }]}>
          <Pressable
            accessibilityRole="button"
            onPress={() => setSheetOpen(false)}
            style={({ pressed }) => [
              styles.btnGhost,
              pressed && styles.pressedDim,
            ]}>
            <ThemedText style={styles.btnGhostText}>닫기</ThemedText>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => setSheetOpen(false)}
            style={({ pressed }) => [
              styles.btnFill,
              pressed && styles.pressedDim,
            ]}>
            <ThemedText style={styles.btnFillText}>
              {isLoading
                ? '작품 보기'
                : `${totalElements.toLocaleString()}개 작품 보기`}
            </ThemedText>
          </Pressable>
        </View>
      </BottomSheet>
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
  /* 헤더 영역 */
  chipsScroll: {
    flexGrow: 0,
  },
  chipsRow: {
    paddingTop: 12,
    paddingBottom: 4,
    paddingHorizontal: 16,
    gap: 6,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 10,
    paddingHorizontal: 16,
  },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Palette.lineStrong,
    backgroundColor: Palette.surface,
  },
  filterBtnText: {
    fontSize: 13.5,
    lineHeight: 18,
    fontWeight: 600,
    color: Palette.ink,
  },
  filterCount: {
    minWidth: 18,
    height: 18,
    paddingHorizontal: 5,
    borderRadius: Radius.pill,
    backgroundColor: Palette.accentInk,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterCountText: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: 700,
    color: Palette.surface,
  },
  activeChipsScroll: {
    flexGrow: 0,
    flexShrink: 1,
  },
  activeChips: {
    gap: 6,
  },
  resultLine: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingTop: 14,
    paddingBottom: 10,
    paddingHorizontal: 16,
  },
  resultText: {
    fontSize: 14,
    lineHeight: 19,
    fontWeight: 400,
    color: Palette.ink2,
  },
  resultCount: {
    fontSize: 14,
    lineHeight: 19,
    fontWeight: 700,
    color: Palette.ink,
    fontVariant: ['tabular-nums'],
  },
  sort: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sortText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: 500,
    color: Palette.ink2,
  },
  /* 그리드 */
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 28,
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
  footerLoading: {
    marginVertical: 16,
  },
  /* 시트 */
  sheetHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    paddingBottom: 12,
    paddingLeft: 20,
    paddingRight: 18,
    borderBottomWidth: 1,
    borderBottomColor: Palette.line,
  },
  sheetTitle: {
    fontSize: 16,
    lineHeight: 21,
    fontWeight: 800,
    color: Palette.ink,
  },
  sheetReset: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sheetResetText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: 500,
    color: Palette.ink2,
  },
  sheetScroll: {
    flexGrow: 0,
    flexShrink: 1,
  },
  sheetBody: {
    paddingTop: 4,
    paddingBottom: 8,
    paddingHorizontal: 20,
  },
  sheetNote: {
    paddingVertical: 16,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: 400,
    color: Palette.ink2,
  },
  fgroup: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Palette.line,
  },
  fgroupLast: {
    borderBottomWidth: 0,
  },
  fgroupTitle: {
    fontSize: 13.5,
    lineHeight: 18,
    fontWeight: 700,
    color: Palette.ink,
    marginBottom: 10,
  },
  optWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  opt: {
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Palette.line,
    backgroundColor: Palette.surface,
  },
  optOn: {
    borderColor: Palette.accentInk,
    backgroundColor: Palette.accentTint,
  },
  optDisabled: {
    opacity: 0.45,
  },
  optText: {
    fontSize: 13,
    lineHeight: 17,
    fontWeight: 600,
    color: Palette.ink2,
  },
  optTextOn: {
    color: Palette.accentInk,
  },
  radioCol: {
    gap: 2,
  },
  radioItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingVertical: 7,
    paddingHorizontal: 6,
    marginHorizontal: -6,
    borderRadius: Radius.input,
  },
  radioOuter: {
    width: 15,
    height: 15,
    borderRadius: Radius.pill,
    borderWidth: 1.5,
    borderColor: Palette.lineStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterOn: {
    borderColor: Palette.accent,
  },
  radioDot: {
    width: 7,
    height: 7,
    borderRadius: Radius.pill,
    backgroundColor: Palette.accent,
  },
  radioLabel: {
    fontSize: 14,
    lineHeight: 19,
    fontWeight: 400,
    color: Palette.ink2,
  },
  radioLabelOn: {
    fontWeight: 600,
    color: Palette.ink,
  },
  filterLoadError: {
    paddingVertical: 16,
    paddingHorizontal: 2,
  },
  filterLoadErrorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  filterLoadErrorText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: 400,
    color: Palette.ink2,
  },
  filterLoadErrorRetry: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: 600,
    color: Palette.accentInk,
  },
  sheetFoot: {
    flexDirection: 'row',
    gap: 10,
    paddingTop: 12,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: Palette.line,
  },
  btnGhost: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Palette.lineStrong,
    alignItems: 'center',
  },
  btnGhostText: {
    fontSize: 14.5,
    lineHeight: 19,
    fontWeight: 700,
    color: Palette.ink,
  },
  btnFill: {
    flex: 2,
    paddingVertical: 13,
    borderRadius: Radius.pill,
    backgroundColor: Palette.accentInk,
    alignItems: 'center',
  },
  btnFillText: {
    fontSize: 14.5,
    lineHeight: 19,
    fontWeight: 700,
    color: Palette.surface,
  },
});

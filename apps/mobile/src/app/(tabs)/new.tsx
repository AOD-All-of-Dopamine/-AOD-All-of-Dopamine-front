import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Image } from 'expo-image';

import { AppHeader } from '@/components/ui/AppHeader';
import { DomainChip } from '@/components/ui/DomainChip';
import { EmptyState } from '@/components/ui/EmptyState';
import { SectionError } from '@/components/ui/SectionError';
import { SkeletonBlock, SkeletonPulse } from '@/components/ui/Skeleton';
import { domainFallbackIcon } from '@/components/ui/WorkCard';
import { ThemedText } from '@/components/themed-text';
import { useRecentReleases, useUpcomingReleases } from '@aod/shared/hooks';
import {
  DOMAIN_FILTERS,
  DOMAIN_LABEL_MAP,
  watchPlatformLabels,
} from '@aod/shared/constants';
import type { WorkSummary } from '@aod/shared/types';
import { Palette, Radius } from '@/constants/theme';

/**
 * 신작 (목업 프레임 5) - 날짜 그룹 헤더("7월 1일 수요일") + 행(44x58 썸네일 +
 * 제목 + "작가 · 플랫폼" 메타). 구조는 웹 new-releases-page.tsx와 동일하게
 * 최근 출시(날짜 그룹) + 출시 예정(월 그룹 + D-day 필) 2섹션.
 * 구 화면의 플랫폼 칩·신작/공개예정 토글은 제거 (목업·웹 모두 도메인 칩만).
 *
 * 웹 페이지 규율 동일:
 * - 섹션별 상태 독립 (스켈레톤 / SectionError / note 빈 상태)
 * - 최근 행 meta "작가 · 플랫폼", 예정 행 meta "작가 · 날짜" (없는 쪽만 표기)
 * - D-day는 releaseDate 클라 계산 (당일=D-DAY)
 * - 양 섹션 각각 최대 40건 고정 표시 - 무한 스크롤 아님
 */

const RECENT_SIZE = 40;
const UPCOMING_SIZE = 40;

const WEEKDAY_LABELS = [
  '일요일',
  '월요일',
  '화요일',
  '수요일',
  '목요일',
  '금요일',
  '토요일',
];

const domainLabel = (domain?: string) =>
  DOMAIN_LABEL_MAP[domain ?? ''] ?? domain ?? '';

/** "yyyy-MM-dd" 파싱 (웹 utils/releaseDate 미러 - 타임존·NaN 회피) */
const parseYmd = (
  value?: string,
): { y: number; m: number; d: number } | null => {
  const [y, m, d] = (value ?? '').split('-').map(Number);
  return y && m && d ? { y, m, d } : null;
};

/** 오늘 0시 기준 남은 일수. 날짜 없음·파싱 실패면 null */
const daysUntil = (releaseDate?: string): number | null => {
  const ymd = parseYmd(releaseDate);
  if (!ymd) return null;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round(
    (new Date(ymd.y, ymd.m - 1, ymd.d).getTime() - today.getTime()) /
      86_400_000,
  );
};

/** D-day 라벨 - 오늘 이하=D-DAY, 미래=D-n, 날짜 없음=null(필 생략) */
const dDayLabel = (releaseDate?: string): string | null => {
  const diff = daysUntil(releaseDate);
  if (diff === null) return null;
  return diff <= 0 ? 'D-DAY' : `D-${diff}`;
};

/** 최근 출시 행 meta - "작가 · 플랫폼" (둘 다 없으면 생략, 웹 recentMeta 미러) */
const recentMeta = (work: WorkSummary) => {
  const creator = work.creator?.trim();
  const platforms = watchPlatformLabels(work.platforms).join(', ');
  const parts = [creator, platforms].filter(Boolean);
  return parts.length > 0 ? parts.join(' · ') : undefined;
};

/** 출시 예정 행 meta - "작가 · 12월 18일" (작가 없으면 도메인 라벨 폴백) */
const upcomingMeta = (work: WorkSummary) => {
  const head = work.creator?.trim() || domainLabel(work.domain);
  const ymd = parseYmd(work.releaseDate);
  if (!ymd) return head;
  const datePart =
    ymd.y === new Date().getFullYear()
      ? `${ymd.m}월 ${ymd.d}일`
      : `${ymd.y}년 ${ymd.m}월 ${ymd.d}일`;
  return `${head} · ${datePart}`;
};

interface ReleaseGroup {
  key: string;
  /** 그룹 라벨 - 날짜("8월 12일") 또는 월("11월") */
  main: string;
  /** 보조 라벨 - 오늘/어제/요일 또는 연도 */
  sub: string;
  items: WorkSummary[];
}

/** 첫 등장 순서로 그룹 생성, 같은 키는 병합 (API 정렬 보존 - 웹 groupBy 미러) */
const groupBy = (
  works: WorkSummary[],
  toGroup: (work: WorkSummary) => Omit<ReleaseGroup, 'items'> | null,
): ReleaseGroup[] => {
  const groups: ReleaseGroup[] = [];
  const indexByKey = new Map<string, number>();
  for (const work of works) {
    const head = toGroup(work);
    if (!head) continue;
    const at = indexByKey.get(head.key);
    if (at === undefined) {
      indexByKey.set(head.key, groups.length);
      groups.push({ ...head, items: [work] });
    } else {
      groups[at].items.push(work);
    }
  }
  return groups;
};

/** 최근 출시 그룹 헤더 - "M월 D일" + 오늘/어제/요일 */
const recentGroupOf = (work: WorkSummary) => {
  const ymd = parseYmd(work.releaseDate);
  if (!ymd) return null;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const date = new Date(ymd.y, ymd.m - 1, ymd.d);
  const diff = Math.round((today.getTime() - date.getTime()) / 86_400_000);
  const main =
    ymd.y === now.getFullYear()
      ? `${ymd.m}월 ${ymd.d}일`
      : `${ymd.y}년 ${ymd.m}월 ${ymd.d}일`;
  const sub =
    diff === 0 ? '오늘' : diff === 1 ? '어제' : WEEKDAY_LABELS[date.getDay()];
  return { key: `${ymd.y}-${ymd.m}-${ymd.d}`, main, sub };
};

/** 출시 예정 그룹 헤더 - "M월" + 연도 */
const upcomingGroupOf = (work: WorkSummary) => {
  const ymd = parseYmd(work.releaseDate);
  if (!ymd) return null;
  return { key: `${ymd.y}-${ymd.m}`, main: `${ymd.m}월`, sub: String(ymd.y) };
};

function ReleaseRow({
  work,
  meta,
  dday,
}: {
  work: WorkSummary;
  meta?: string;
  dday?: string | null;
}) {
  const FallbackIcon = domainFallbackIcon(work.domain);
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() =>
        router.push({ pathname: '/work/[id]', params: { id: String(work.id) } })
      }
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <View style={styles.thumbWrap}>
        {work.thumbnail ? (
          <Image
            source={{ uri: work.thumbnail }}
            style={styles.thumb}
            contentFit="cover"
            transition={150}
          />
        ) : (
          <View style={styles.thumbFallback}>
            <FallbackIcon size={18} color={Palette.ink3} />
          </View>
        )}
      </View>
      <View style={styles.rowInfo}>
        <ThemedText numberOfLines={1} style={styles.rowTitle}>
          {work.title}
        </ThemedText>
        {meta && (
          <ThemedText numberOfLines={1} style={styles.rowMeta}>
            {meta}
          </ThemedText>
        )}
      </View>
      {dday && (
        <View style={styles.ddayPill}>
          <ThemedText style={styles.ddayText}>{dday}</ThemedText>
        </View>
      )}
    </Pressable>
  );
}

/** 날짜 그룹 헤더 (목업 .date-head) */
function DateHead({ main, sub }: { main: string; sub: string }) {
  return (
    <View style={styles.dateHead}>
      <ThemedText style={styles.dateMain}>{main}</ThemedText>
      <ThemedText style={styles.dateSub}>{sub}</ThemedText>
    </View>
  );
}

/** 섹션 스켈레톤 - 날짜 줄 + 행 3개 (최종 형상 근사) */
function GroupSkeleton() {
  return (
    <SkeletonPulse>
      <View style={styles.dateHead}>
        <SkeletonBlock width={72} height={16} />
        <SkeletonBlock width={40} height={12} />
      </View>
      <View style={styles.groupList}>
        {Array.from({ length: 3 }, (_, i) => (
          <View key={i} style={styles.row}>
            <SkeletonBlock width={44} height={58} radius={6} />
            <View style={styles.rowInfo}>
              <SkeletonBlock height={14} width="55%" />
              <SkeletonBlock height={11} width="35%" style={styles.skelMeta} />
            </View>
          </View>
        ))}
      </View>
    </SkeletonPulse>
  );
}

export default function NewReleasesScreen() {
  const [domainId, setDomainId] = useState('all');
  const domainKey = domainId === 'all' ? undefined : domainId.toUpperCase();

  const recent = useRecentReleases({ domain: domainKey, size: RECENT_SIZE });
  const upcoming = useUpcomingReleases({
    domain: domainKey,
    size: UPCOMING_SIZE,
  });

  // 서버 정렬 보존 그룹핑 - 최근: releaseDate DESC 날짜 그룹, 예정: ASC 월 그룹
  const recentGroups = useMemo(
    () => groupBy(recent.data?.content ?? [], recentGroupOf),
    [recent.data],
  );
  const upcomingGroups = useMemo(
    () => groupBy(upcoming.data?.content ?? [], upcomingGroupOf),
    [upcoming.data],
  );

  const emptySuffix = domainId === 'all' ? '아직 없어요.' : '없어요.';
  const emptyPrefix = domainId === 'all' ? '' : '이 도메인의 ';

  return (
    <View style={styles.screen}>
      <SafeAreaView edges={['top']} style={styles.top}>
        <AppHeader />
      </SafeAreaView>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}>
        <ThemedText style={styles.pageTitle}>신작</ThemedText>

        {/* 도메인 칩 (목업 .chips-row) */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipsScroll}
          contentContainerStyle={styles.chipsRow}>
          {DOMAIN_FILTERS.map((d) => {
            const id = d.id.toLowerCase();
            return (
              <DomainChip
                key={d.id}
                label={d.label}
                active={domainId === id}
                onPress={() => setDomainId(id)}
              />
            );
          })}
        </ScrollView>

        {/* 최근 출시 */}
        <ThemedText style={styles.sectionTitle}>최근 출시</ThemedText>
        {recent.isLoading ? (
          <GroupSkeleton />
        ) : recent.isError ? (
          <SectionError
            style={styles.sectionError}
            message="최근 출시작을 불러오지 못했어요."
            onRetry={() => recent.refetch()}
          />
        ) : recentGroups.length === 0 ? (
          <View style={styles.emptyNote}>
            <EmptyState
              variant="note"
              title={`${emptyPrefix}최근 출시작이 ${emptySuffix}`}
            />
          </View>
        ) : (
          recentGroups.map((group) => (
            <View key={group.key}>
              <DateHead main={group.main} sub={group.sub} />
              <View style={styles.groupList}>
                {group.items.map((work) => (
                  <ReleaseRow
                    key={work.id}
                    work={work}
                    meta={recentMeta(work)}
                  />
                ))}
              </View>
            </View>
          ))
        )}

        {/* 출시 예정 */}
        <ThemedText style={styles.sectionTitle}>출시 예정</ThemedText>
        {upcoming.isLoading ? (
          <GroupSkeleton />
        ) : upcoming.isError ? (
          <SectionError
            style={styles.sectionError}
            message="출시 예정작을 불러오지 못했어요."
            onRetry={() => upcoming.refetch()}
          />
        ) : upcomingGroups.length === 0 ? (
          <View style={styles.emptyNote}>
            <EmptyState
              variant="note"
              title={`${emptyPrefix}출시 예정작이 ${emptySuffix}`}
            />
          </View>
        ) : (
          upcomingGroups.map((group) => (
            <View key={group.key}>
              <DateHead main={group.main} sub={group.sub} />
              <View style={styles.groupList}>
                {group.items.map((work) => (
                  <ReleaseRow
                    key={work.id}
                    work={work}
                    meta={upcomingMeta(work)}
                    dday={dDayLabel(work.releaseDate)}
                  />
                ))}
              </View>
            </View>
          ))
        )}
      </ScrollView>
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
  scroll: {
    flex: 1,
  },
  content: {
    paddingBottom: 28,
  },
  pressed: {
    opacity: 0.85,
  },
  pageTitle: {
    paddingTop: 18,
    paddingHorizontal: 16,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: 800,
    letterSpacing: -0.4,
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
  sectionTitle: {
    paddingTop: 22,
    paddingHorizontal: 16,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: 800,
    letterSpacing: -0.2,
    color: Palette.ink,
  },
  sectionError: {
    marginTop: 12,
    marginHorizontal: 16,
  },
  emptyNote: {
    marginTop: 12,
    marginHorizontal: 16,
  },
  dateHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    paddingTop: 16,
    paddingBottom: 8,
    paddingHorizontal: 16,
  },
  dateMain: {
    fontSize: 14,
    lineHeight: 19,
    fontWeight: 800,
    color: Palette.ink,
  },
  dateSub: {
    fontSize: 12.5,
    lineHeight: 17,
    fontWeight: 500,
    color: Palette.ink3,
  },
  groupList: {
    paddingHorizontal: 16,
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.line,
    borderRadius: Radius.panel,
  },
  thumbWrap: {
    width: 44,
    height: 58,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: Palette.canvas,
  },
  thumb: {
    width: '100%',
    height: '100%',
  },
  thumbFallback: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.8,
  },
  rowInfo: {
    flex: 1,
    minWidth: 0,
  },
  rowTitle: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: 700,
    color: Palette.ink,
  },
  rowMeta: {
    marginTop: 2,
    fontSize: 12.5,
    lineHeight: 17,
    fontWeight: 400,
    color: Palette.ink3,
  },
  skelMeta: {
    marginTop: 6,
  },
  ddayPill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: Radius.pill,
    backgroundColor: Palette.accentTint,
  },
  ddayText: {
    fontSize: 11.5,
    lineHeight: 15,
    fontWeight: 700,
    color: Palette.accentInk,
    fontVariant: ['tabular-nums'],
  },
});

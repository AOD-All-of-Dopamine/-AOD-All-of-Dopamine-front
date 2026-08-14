import { ReactNode, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { WarningCircle } from "@phosphor-icons/react";
import { useRecentReleases, useUpcomingReleases } from "../hooks/useWorks";
import { DOMAIN_FILTERS, DOMAIN_LABEL_MAP } from "../constants/domain";
import { watchPlatformLabels } from "../constants/platforms";
import { thumbnailFallbackMap, type Category } from "../constants/thumbnail";
import { WorkSummary } from "../types/api";
import { dDayOf, parseYmd } from "../utils/releaseDate";
import DomainChip from "../components/ui/DomainChip";
import ReleaseRow from "../components/ui/ReleaseRow";
import Tag from "../components/ui/Tag";
import DdayPill from "../components/ui/DdayPill";
import EmptyState from "../components/ui/EmptyState";

/**
 * /new - mockups/new-releases-mockup.html 이식.
 * 레이아웃: h1 신작 + 도메인 칩 / 최근 출시(날짜 그룹 타임라인) /
 * 출시 예정(월 그룹 + DdayPill). 컨테이너 max-w 1080.
 * 그룹 = 좌측 sticky 날짜 라벨(148px) + 우측 행 리스트, 모바일은 라벨 인라인.
 *
 * 히스토리 정책: 도메인 칩 전환은 push (탭 성격) + 동일 값 no-op 가드.
 * URL 쿼리(?domain=)가 상태의 단일 출처, all(전체)은 파라미터 생략.
 *
 * 백엔드 계약(WorkApiService.getRecent/UpcomingReleases 기준) 편차:
 * - 행 메타는 목업대로 "작가 · 플랫폼"(최근)/"작가 · 날짜"(예정) - creator·
 *   platforms 필드 미수집 작품은 있는 쪽만 표기. 도메인 태그는 Tag(canvas)
 *   재사용 - 목업 .domain(12px, 패딩 3px 11px)과 수치가 약간 다르나
 *   컴포넌트 재사용 우선 원칙으로 의도적 유지.
 * - 출시 예정 "미정(TBA)" 그룹 미렌더: findUpcomingReleases가
 *   releaseDate > 오늘 AND <= +1년 조건이라 날짜 없는 작품이 응답에 없다.
 * - "알림 받기" 버튼 생략: 백엔드에 알림 API가 없고(북마크=관심 등록과 의미가 달라
 *   라벨 왜곡), 행마다 북마크 상태 조회 N회가 필요해 미이식. 상세 페이지의
 *   관심 등록으로 대체된다.
 * - 페이지네이션 없음(목업 동일): 최근 출시는 3개월 범위 중 최신 40건,
 *   출시 예정은 1년 범위 중 가까운 40건만 표시.
 * - 날짜 라벨(오늘/어제)과 D-day는 클라이언트 로컬 시간 기준 - 서버(LocalDate)
 *   경계와 어긋날 수 있으나 home 출시 예정 섹션과 동일한 관례로 수용.
 */

const RECENT_SIZE = 40;
const UPCOMING_SIZE = 40;

const DOMAIN_IDS = DOMAIN_FILTERS.map((d) => d.id.toLowerCase());

const WEEKDAY_LABELS = [
  "일요일",
  "월요일",
  "화요일",
  "수요일",
  "목요일",
  "금요일",
  "토요일",
];

const categoryOf = (domain?: string): Category => {
  const key = domain?.toLowerCase() as Category;
  return key in thumbnailFallbackMap ? key : "movie";
};

const domainLabel = (domain?: string) =>
  DOMAIN_LABEL_MAP[domain ?? ""] ?? domain ?? "";

/**
 * 최근 출시 행 meta - "모죠 · 네이버웹툰" (목업 .row .m: 작가 · 플랫폼).
 * 플랫폼은 수집 소스(TMDB_*) 제외 한글 라벨을 콤마로 연결(목업 "티빙, 쿠팡플레이").
 * 두 값 모두 없으면 meta 줄 생략.
 */
const recentMeta = (work: WorkSummary) => {
  const creator = work.creator?.trim();
  const platforms = watchPlatformLabels(work.platforms).join(", ");
  const parts = [creator, platforms].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : undefined;
};

/**
 * 출시 예정 행 meta - "드니 빌뇌브 · 12월 18일" (목업: 제작자 · 날짜,
 * 다른 해면 연도 표기). 제작자 미수집 작품은 도메인 라벨 폴백.
 * 날짜 없으면 앞부분만 표기 - 월 그룹 라벨이 날짜 맥락을 주는 데다 API가
 * 날짜 없는 작품을 반환하지 않는 방어 분기다.
 */
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

/** 첫 등장 순서로 그룹을 만들고, 같은 키의 항목은 해당 그룹으로 병합 (API 정렬 보존) */
const groupBy = (
  works: WorkSummary[],
  toGroup: (work: WorkSummary) => Omit<ReleaseGroup, "items"> | null,
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
    diff === 0 ? "오늘" : diff === 1 ? "어제" : WEEKDAY_LABELS[date.getDay()];
  // 키는 upcomingGroupOf와 동일하게 파싱값 조립("y-m-d")으로 통일
  return { key: `${ymd.y}-${ymd.m}-${ymd.d}`, main, sub };
};

/** 출시 예정 그룹 헤더 - "M월" + 연도 */
const upcomingGroupOf = (work: WorkSummary) => {
  const ymd = parseYmd(work.releaseDate);
  if (!ymd) return null;
  return { key: `${ymd.y}-${ymd.m}`, main: `${ymd.m}월`, sub: String(ymd.y) };
};

/** 날짜 그룹 1개 - 좌 sticky 라벨(148px) + 우 행 리스트 (모바일은 라벨 인라인) */
const DateGroup = ({
  group,
  children,
}: {
  group: ReleaseGroup;
  children: ReactNode;
}) => (
  <div className="mt-[26px] grid gap-2.5 min-[768px]:grid-cols-[148px_1fr] min-[768px]:gap-6">
    <div className="flex items-baseline gap-2 min-[768px]:sticky min-[768px]:top-22 min-[768px]:block min-[768px]:self-start">
      <h3 className="text-base font-extrabold text-ink">{group.main}</h3>
      <span className="text-[13px] text-ink-3 min-[768px]:mt-0.5 min-[768px]:block">
        {group.sub}
      </span>
    </div>
    <div className="flex flex-col gap-2.5">{children}</div>
  </div>
);

/** 섹션 단위 인라인 에러 (전체 페이지 붕괴 금지) */
const SectionError = ({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) => (
  <div
    role="status"
    className="mt-[26px] flex items-center gap-2.5 rounded-panel border border-line bg-surface px-4 py-3.5 text-sm text-ink-2"
  >
    <WarningCircle size={18} className="flex-none text-ink-3" />
    <span className="min-w-0">{message}</span>
    <button
      type="button"
      onClick={onRetry}
      className="ml-auto flex-none rounded-full border border-line bg-canvas px-3.5 py-1.5 text-[13px] font-semibold text-ink transition-colors hover:border-line-strong"
    >
      다시 시도
    </button>
  </div>
);

/** ReleaseRow 형태 스켈레톤 그룹 (라벨 + 행 3개) */
const GroupSkeleton = () => (
  <div
    aria-hidden="true"
    className="mt-[26px] grid animate-pulse gap-2.5 min-[768px]:grid-cols-[148px_1fr] min-[768px]:gap-6"
  >
    <div className="flex items-baseline gap-2 min-[768px]:block min-[768px]:self-start">
      <div className="h-5 w-20 rounded-input bg-line" />
      <div className="h-3.5 w-12 rounded-input bg-line min-[768px]:mt-1.5" />
    </div>
    <div className="flex flex-col gap-2.5">
      {Array.from({ length: 3 }, (_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 rounded-panel border border-line bg-surface px-4 py-3 shadow-card"
        >
          <div className="aspect-[2/3] w-[52px] flex-none rounded-input bg-line" />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <div className="h-4 w-2/5 rounded-input bg-line" />
            <div className="h-3 w-1/4 rounded-input bg-canvas" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

export default function NewReleasesPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  // URL 쿼리(?domain=)가 상태의 단일 출처 - 직접 진입·새로고침·뒤로가기 복원
  const domainId = useMemo(() => {
    const raw = (searchParams.get("domain") ?? "all").toLowerCase();
    return DOMAIN_IDS.includes(raw) ? raw : "all";
  }, [searchParams]);
  const domainKey = domainId === "all" ? undefined : domainId.toUpperCase();

  // 도메인 칩 전환 = push (탭 성격), 동일 값이면 히스토리 no-op
  const handleDomainChange = (id: string) => {
    if (id === domainId) return;
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      if (id === "all") params.delete("domain");
      else params.set("domain", id);
      return params;
    });
    window.scrollTo({ top: 0 });
  };

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

  const emptySuffix = domainId === "all" ? "아직 없어요." : "없어요.";
  const emptyPrefix = domainId === "all" ? "" : "이 도메인의 ";

  return (
    <div className="mx-auto max-w-[1080px] px-6 pb-20 pt-7">
      <h1 className="text-[26px] font-extrabold tracking-[-0.03em] text-ink">
        신작
      </h1>

      {/* 도메인 칩 필터 */}
      <div className="mt-4 flex flex-wrap gap-1.5">
        {DOMAIN_FILTERS.map((d) => {
          const id = d.id.toLowerCase();
          return (
            <DomainChip
              key={d.id}
              active={domainId === id}
              onClick={() => handleDomainChange(id)}
            >
              {d.label}
            </DomainChip>
          );
        })}
      </div>

      {/* 최근 출시 */}
      <section className="mt-10">
        <h2 className="text-[19px] font-extrabold tracking-[-0.02em] text-ink">
          최근 출시
        </h2>
        {recent.isLoading ? (
          <>
            <GroupSkeleton />
            <GroupSkeleton />
          </>
        ) : recent.isError ? (
          <SectionError
            message="최근 출시작을 불러오지 못했어요."
            onRetry={() => recent.refetch()}
          />
        ) : recentGroups.length === 0 ? (
          <div className="mt-[26px]">
            <EmptyState
              variant="note"
              title={`${emptyPrefix}최근 출시작이 ${emptySuffix}`}
            />
          </div>
        ) : (
          recentGroups.map((group) => (
            <DateGroup key={group.key} group={group}>
              {group.items.map((work) => (
                <ReleaseRow
                  key={work.id}
                  title={work.title}
                  meta={recentMeta(work)}
                  imageUrl={work.thumbnail}
                  fallbackIconUrl={thumbnailFallbackMap[categoryOf(work.domain)]}
                  to={`/work/${work.id}`}
                  slot={
                    // 목업과 동일하게 모바일에서는 도메인 태그 숨김
                    <span className="hidden min-[768px]:inline-flex">
                      <Tag>{domainLabel(work.domain)}</Tag>
                    </span>
                  }
                />
              ))}
            </DateGroup>
          ))
        )}
      </section>

      {/* 출시 예정 */}
      <section className="mt-10">
        <h2 className="text-[19px] font-extrabold tracking-[-0.02em] text-ink">
          출시 예정
        </h2>
        {upcoming.isLoading ? (
          <GroupSkeleton />
        ) : upcoming.isError ? (
          <SectionError
            message="출시 예정작을 불러오지 못했어요."
            onRetry={() => upcoming.refetch()}
          />
        ) : upcomingGroups.length === 0 ? (
          <div className="mt-[26px]">
            <EmptyState
              variant="note"
              title={`${emptyPrefix}출시 예정작이 ${emptySuffix}`}
            />
          </div>
        ) : (
          upcomingGroups.map((group) => (
            <DateGroup key={group.key} group={group}>
              {group.items.map((work) => {
                const dday = dDayOf(work.releaseDate);
                return (
                  <ReleaseRow
                    key={work.id}
                    title={work.title}
                    meta={upcomingMeta(work)}
                    imageUrl={work.thumbnail}
                    fallbackIconUrl={
                      thumbnailFallbackMap[categoryOf(work.domain)]
                    }
                    to={`/work/${work.id}`}
                    slot={
                      <DdayPill variant={dday.variant}>{dday.label}</DdayPill>
                    }
                  />
                );
              })}
            </DateGroup>
          ))
        )}
      </section>
    </div>
  );
}

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import {
  ArrowCounterClockwise,
  Funnel,
  SortDescending,
  Star,
  WarningCircle,
} from "@phosphor-icons/react";
import { useGenres, usePlatforms, useWorks } from "../hooks/useWorks";
import { DOMAIN_FILTERS, DOMAIN_LABEL_MAP } from "../constants/domain";
import { PLATFORM_META } from "../constants/platforms";
import { thumbnailFallbackMap, type Category } from "../constants/thumbnail";
import WorkCard from "../components/ui/WorkCard";
import Chip from "../components/ui/Chip";
import DomainChip from "../components/ui/DomainChip";
import FilterGroup from "../components/ui/FilterGroup";
import Pagination from "../components/ui/Pagination";
import EmptyState from "../components/ui/EmptyState";
import SkeletonCard from "../components/ui/SkeletonCard";

/**
 * /explore - mockups/explore-light-mockup.html 이식.
 * 레이아웃: 도메인 탭 행 / 좌 256px sticky 필터 레일(모바일 details 서랍) /
 * 툴바(h1+결과수) / 활성 필터 칩 행 / 카드 그리드 / 페이지네이션.
 *
 * 히스토리 정책: 도메인 탭 전환과 페이지 이동은 push, 필터 조작(장르/플랫폼 토글,
 * 칩 제거, 초기화)은 replace. 결과 상태가 현재와 같으면 히스토리 no-op.
 *
 * 백엔드 계약(WorkController.getWorks -> ContentRepository.findWorks) 기준 편차:
 * - platforms 검색이 배열 포함(@>, AND)이라 다중 선택 OR이 불가능하다.
 *   따라서 플랫폼은 라디오(단일 선택)로 임시 처리. OR 파라미터가 백엔드에 추가되면
 *   checkbox 다중 선택으로 되돌린다.
 * - 정렬: 도메인 지정 경로와 필터 경로 모두 서버가 sortBy를 무시하고
 *   release_date DESC 고정이므로 SortSelect를 생략하고 정적 라벨만 표시한다.
 * - 목업의 출시 시기(era), 웹툰 상태·요일·연령 필터는 workApi에 파라미터가 없어
 *   렌더하지 않는다 (백엔드 도메인 컬럼 필터 추가 후 연결).
 * - 장르·플랫폼 필터는 백엔드가 domain 필수라 전체 탭에서는 노출하지 않는다.
 * - placeholderData(keepPreviousData)는 의도적으로 미적용 - 도메인 전환 시 이전
 *   도메인 카드 잔상 방지를 우선하고 페이지 전환 스켈레톤은 수용한다.
 */

const PAGE_SIZE = 20;

const DOMAIN_IDS = DOMAIN_FILTERS.map((d) => d.id.toLowerCase());

/**
 * 아직 수집 전인 플랫폼의 로드맵 표기 (목업 "준비 중" 항목).
 * 백엔드 수집 시작 시 API 목록(usePlatforms)으로 자동 대체됨 -
 * API 결과에 같은 라벨이 나타나면 아래 중복 제거 필터로 이 목록에서 빠진다.
 */
const SOON_PLATFORMS: Record<string, string[]> = {
  GAME: ["Epic Games"],
  WEBTOON: ["카카오웹툰"],
  WEBNOVEL: ["카카오페이지"],
};

const categoryOf = (domain: string): Category => {
  const key = domain?.toLowerCase() as Category;
  return key in thumbnailFallbackMap ? key : "movie";
};

interface ParamPatch {
  domain?: string;
  genres?: string[];
  platform?: string;
  page?: number;
}

/** URL 쿼리를 유효한 화면 상태로 정규화 (잘못된 값은 안전 폴백) */
const parseParams = (p: URLSearchParams) => {
  const raw = (p.get("domain") ?? "game").toLowerCase();
  const domainId = DOMAIN_IDS.includes(raw) ? raw : "game";
  const isAll = domainId === "all";
  // 전체 탭에서는 백엔드가 장르·플랫폼 필터를 무시하므로 URL 값도 무시한다.
  const genres = isAll
    ? []
    : (p.get("genres") ?? "")
        .split(",")
        .map((g) => g.trim())
        .filter(Boolean);
  const platform = isAll ? "" : (p.get("platform") ?? "");
  const rawPage = Number.parseInt(p.get("page") ?? "1", 10);
  const page = Number.isFinite(rawPage) && rawPage >= 1 ? rawPage : 1;
  return { domainId, isAll, genres, platform, page };
};

/** no-op 판정용 상태 직렬화 - URL 표기가 달라도 같은 화면이면 같은 키 */
const stateKey = (p: URLSearchParams) => {
  const s = parseParams(p);
  return [s.domainId, s.genres.join(","), s.platform, s.page].join("|");
};

/** 부분 변경(patch)만 반영하고 나머지 파라미터(미지 포함)는 보존 */
const buildParams = (base: URLSearchParams, patch: ParamPatch) => {
  const params = new URLSearchParams(base);
  if (patch.domain !== undefined) params.set("domain", patch.domain);
  if (patch.genres !== undefined) {
    if (patch.genres.length > 0) params.set("genres", patch.genres.join(","));
    else params.delete("genres");
  }
  if (patch.platform !== undefined) {
    if (patch.platform) params.set("platform", patch.platform);
    else params.delete("platform");
  }
  if (patch.page !== undefined) {
    if (patch.page > 1) params.set("page", String(patch.page));
    else params.delete("page");
  }
  return params;
};

export default function ExplorePage() {
  const [searchParams, setSearchParams] = useSearchParams();

  // URL 쿼리(?domain=&genres=&platform=&page=)가 상태의 단일 출처 -
  // 직접 URL 진입, 새로고침, 뒤로가기 모두 여기서 복원된다.
  const { domainId, isAll, genres, platform, page } = useMemo(
    () => parseParams(searchParams),
    [searchParams],
  );
  const domainKey = isAll ? undefined : domainId.toUpperCase();

  // 결과 상태가 현재와 같으면 히스토리를 건드리지 않고 false 반환 (no-op 가드)
  const writeParams = (patch: ParamPatch, opts?: { replace?: boolean }) => {
    if (stateKey(buildParams(searchParams, patch)) === stateKey(searchParams)) {
      return false;
    }
    setSearchParams(
      (prev) => buildParams(prev, patch),
      opts?.replace ? { replace: true } : undefined,
    );
    return true;
  };

  // 도메인 전환(push) 시 필터·페이지 전부 리셋 (목업 동작과 동일)
  const handleDomainChange = (id: string) => {
    if (writeParams({ domain: id, genres: [], platform: "", page: 1 })) {
      window.scrollTo({ top: 0 });
    }
  };
  const handleGenresChange = (next: string[]) =>
    writeParams({ genres: next, page: 1 }, { replace: true });
  const handlePlatformChange = (next: string) =>
    writeParams({ platform: next, page: 1 }, { replace: true });
  const handleReset = () =>
    writeParams({ genres: [], platform: "", page: 1 }, { replace: true });
  const handlePageChange = (next: number) => {
    if (writeParams({ page: next })) {
      window.scrollTo({ top: 0 });
    }
  };

  const { data, isLoading, isError, refetch } = useWorks({
    domain: domainKey,
    genres: genres.length > 0 ? genres : undefined,
    platforms: platform ? [platform] : undefined,
    page: page - 1,
    size: PAGE_SIZE,
    // 도메인 경로에서는 서버가 정렬을 무시하지만(release_date DESC 고정),
    // 전체 탭(findAll 경로)만은 이 값을 따르므로 최신순으로 통일해 보낸다.
    sortBy: "releaseDate",
    sortDirection: "desc",
  });

  const { data: genreOptions } = useGenres(domainKey, { enabled: !isAll });
  const { data: platformOptions } = usePlatforms(domainKey, { enabled: !isAll });

  const sortedGenres = useMemo(
    () => [...(genreOptions ?? [])].sort((a, b) => a.localeCompare(b, "ko")),
    [genreOptions],
  );

  const items = data?.content ?? [];
  const totalElements = data?.totalElements ?? 0;
  const totalPages = data?.totalPages ?? 0;

  // 데이터 로드 후 URL의 page가 실제 범위를 넘으면 1페이지로 정정 (replace)
  useEffect(() => {
    if (!isLoading && !isError && data && page > 1 && page > totalPages) {
      writeParams({ page: 1 }, { replace: true });
    }
    // writeParams는 매 렌더 재생성되지만 위 조건이 반응할 값은 아래가 전부다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, isError, data, page, totalPages]);

  const title = isAll ? "전체" : (DOMAIN_LABEL_MAP[domainKey!] ?? domainId);
  const variant = domainId === "game" ? "landscape" : "portrait";
  const hasActiveFilters = genres.length > 0 || platform !== "";
  const platformLabel = (key: string) => PLATFORM_META[key]?.label ?? key;

  // "준비 중" 항목 - API 목록에 이미 같은 라벨이 있으면 중복 추가하지 않는다
  // (예: WEBNOVEL은 usePlatforms가 KakaoPage를 이미 반환할 수 있음)
  const apiPlatformLabels = (platformOptions ?? []).map(platformLabel);
  const soonPlatforms = (SOON_PLATFORMS[domainKey ?? ""] ?? []).filter(
    (label) => !apiPlatformLabels.includes(label),
  );

  // 목업 반응형 그대로 - landscape 4/3/2/1열, portrait 5/4/3/2열 (1200/1023/767/479px)
  const gridClass =
    variant === "landscape"
      ? "mt-[22px] grid grid-cols-1 gap-y-3.5 gap-x-3 min-[480px]:grid-cols-2 min-[768px]:grid-cols-3 min-[768px]:gap-y-5 min-[768px]:gap-x-[18px] min-[1201px]:grid-cols-4"
      : "mt-[22px] grid grid-cols-2 gap-y-3.5 gap-x-3 min-[768px]:grid-cols-3 min-[768px]:gap-y-5 min-[768px]:gap-x-[18px] min-[1024px]:grid-cols-4 min-[1201px]:grid-cols-5";

  // 모바일에서는 서랍을 닫힌 채로, 데스크톱에서는 열린 채로 시작 (목업 동작).
  // 첫 페인트 전 설정(useLayoutEffect)으로 데스크톱 플래시를 막고,
  // 모바일에서 데스크톱으로 리사이즈 진입 시에도 change 리스너로 다시 연다.
  const drawerRef = useRef<HTMLDetailsElement>(null);
  useLayoutEffect(() => {
    const mql = window.matchMedia("(min-width: 1024px)");
    const syncOpen = () => {
      if (mql.matches && drawerRef.current) {
        drawerRef.current.open = true;
      }
    };
    syncOpen();
    mql.addEventListener("change", syncOpen);
    return () => mql.removeEventListener("change", syncOpen);
  }, []);

  const resetButton = (
    <button
      type="button"
      onClick={handleReset}
      className="rounded-full bg-ink px-[22px] py-2.5 text-sm font-semibold text-surface transition-opacity hover:opacity-85 active:scale-[0.98]"
    >
      필터 초기화
    </button>
  );

  return (
    <>
      {/* 도메인 탭 행 */}
      <div className="mx-auto flex max-w-[1440px] gap-1.5 overflow-x-auto px-6 pt-5 scrollbar-hide">
        {DOMAIN_FILTERS.map((d) => {
          const id = d.id.toLowerCase();
          return (
            <DomainChip
              key={d.id}
              size="lg"
              active={domainId === id}
              onClick={() => handleDomainChange(id)}
            >
              {d.label}
            </DomainChip>
          );
        })}
      </div>

      {/* 좌 필터 레일 + 본문 */}
      <div className="mx-auto grid max-w-[1440px] items-start gap-4 px-6 pb-[72px] pt-5 lg:grid-cols-[256px_1fr] lg:gap-8">
        <details
          ref={drawerRef}
          className="rounded-panel border border-line bg-surface px-4 py-1 lg:sticky lg:top-[84px] lg:max-h-[calc(100vh-100px)] lg:overflow-y-auto lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0"
        >
          <summary className="flex cursor-pointer select-none list-none items-center gap-2 py-3 font-bold text-ink [&::-webkit-details-marker]:hidden lg:hidden">
            <Funnel size={16} />
            필터
          </summary>
          <div className="flex items-baseline justify-between px-0.5 pb-3.5 pt-1">
            <h2 className="text-[15px] font-bold text-ink">필터</h2>
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1 text-[13px] text-ink-2 transition-colors hover:text-accent-ink"
            >
              <ArrowCounterClockwise size={13} />
              초기화
            </button>
          </div>

          {isAll ? (
            // findWorks는 domain 없이는 장르·플랫폼 필터를 적용하지 않으므로 숨긴다
            <p className="border-t border-line px-0.5 py-4 text-[13px] leading-relaxed text-ink-2">
              전체 탭에서는 필터를 지원하지 않아요. 도메인을 선택하면 장르와
              플랫폼 필터를 쓸 수 있어요.
            </p>
          ) : (
            <>
              {sortedGenres.length > 0 && (
                <FilterGroup
                  title="장르"
                  type="checkbox"
                  values={genres}
                  onChange={handleGenresChange}
                  options={sortedGenres.map((g) => ({ value: g, label: g }))}
                />
              )}
              {(platformOptions?.length ?? 0) > 0 && (
                // 백엔드 platforms 검색이 @>(AND)라 다중 선택 OR 미지원 - 단일 선택 임시 처리
                <FilterGroup
                  title="플랫폼"
                  type="radio"
                  value={platform}
                  onChange={handlePlatformChange}
                  options={[
                    { value: "", label: "전체" },
                    ...(platformOptions ?? []).map((p) => ({
                      value: p,
                      label: platformLabel(p),
                    })),
                    ...soonPlatforms.map((label) => ({
                      value: `soon-${label}`,
                      label,
                      disabled: true,
                      soonLabel: "준비 중",
                    })),
                  ]}
                />
              )}
            </>
          )}
        </details>

        <main>
          {/* 툴바: 제목 + 결과 수 + 정렬 표시 */}
          <div className="flex flex-wrap items-center gap-3.5">
            <h1 className="text-[26px] font-extrabold tracking-[-0.03em] text-ink">
              {title}
            </h1>
            {!isLoading && !isError && (
              <span
                role="status"
                className="text-[14.5px] tabular-nums text-ink-2"
              >
                {totalElements.toLocaleString()}개 작품
              </span>
            )}
            {/* 서버 정렬이 release_date DESC 고정이라 SortSelect 대신 정적 라벨 */}
            <span className="ml-auto inline-flex items-center gap-1.5 text-sm font-medium text-ink-2">
              <SortDescending size={14} />
              최신 출시순
            </span>
          </div>

          {/* 활성 필터 칩 행 */}
          {hasActiveFilters && (
            <div className="mt-3.5 flex flex-wrap gap-2">
              {platform && (
                <Chip
                  label={platformLabel(platform)}
                  onRemove={() => handlePlatformChange("")}
                />
              )}
              {genres.map((g) => (
                <Chip
                  key={g}
                  label={g}
                  onRemove={() =>
                    handleGenresChange(genres.filter((v) => v !== g))
                  }
                />
              ))}
            </div>
          )}

          {/* 상태 3종: 로딩 스켈레톤 / 에러 / 빈 결과 + 카드 그리드 */}
          {isLoading ? (
            <div className={gridClass} aria-hidden="true">
              {Array.from({ length: PAGE_SIZE }, (_, i) => (
                <SkeletonCard key={i} variant={variant} />
              ))}
            </div>
          ) : isError ? (
            <div className="mt-[22px]">
              <EmptyState
                icon={<WarningCircle size={44} />}
                title="작품을 불러오지 못했어요"
                description="네트워크 상태를 확인한 뒤 다시 시도해 주세요."
                action={
                  <button
                    type="button"
                    onClick={() => refetch()}
                    className="rounded-full bg-ink px-[22px] py-2.5 text-sm font-semibold text-surface transition-opacity hover:opacity-85 active:scale-[0.98]"
                  >
                    다시 시도
                  </button>
                }
              />
            </div>
          ) : items.length === 0 ? (
            <div className="mt-[22px]">
              <EmptyState
                title="조건에 맞는 작품이 없어요"
                description={
                  hasActiveFilters
                    ? "필터를 조금 풀어보시면 더 많은 작품을 만날 수 있어요."
                    : "아직 수집된 작품이 없어요. 조금만 기다려 주세요."
                }
                action={hasActiveFilters ? resetButton : undefined}
              />
            </div>
          ) : (
            <>
              <div className={gridClass}>
                {items.map((work) => {
                  // "yyyy-MM-dd" 문자열에서 직접 연도 추출 (타임존·NaN 문제 회피)
                  const year = work.releaseDate?.slice(0, 4) || undefined;
                  return (
                    <WorkCard
                      key={work.id}
                      variant={variant}
                      title={work.title}
                      meta={year}
                      imageUrl={work.thumbnail}
                      fallbackIconUrl={
                        thumbnailFallbackMap[categoryOf(work.domain)]
                      }
                      to={`/work/${work.id}`}
                      footer={
                        <>
                          <span>
                            {DOMAIN_LABEL_MAP[work.domain] ?? work.domain}
                          </span>
                          <span className="ml-auto inline-flex items-center gap-1 font-bold text-ink">
                            <Star
                              weight="fill"
                              size={13}
                              className="text-star"
                            />
                            {(work.score ?? 0).toFixed(1)}
                          </span>
                        </>
                      }
                    />
                  );
                })}
              </div>
              {totalPages > 1 && (
                <div className="mt-10">
                  <Pagination
                    page={page}
                    totalPages={totalPages}
                    onChange={handlePageChange}
                  />
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </>
  );
}

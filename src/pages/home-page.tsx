import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CaretRight, WarningCircle } from "@phosphor-icons/react";
import { ExternalRanking } from "../api/rankingApi";
import {
  useRecentReleases,
  useRecentReviewedWorks,
  useUpcomingReleases,
} from "../hooks/useWorks";
import { useAllRankings } from "../hooks/useRankings";
import { WorkSummary } from "../types/api";
import { DOMAIN_LABEL_MAP } from "../constants/domain";
import { thumbnailFallbackMap, type Category } from "../constants/thumbnail";
import { daysUntil, dDayOf, parseYmd } from "../utils/releaseDate";
import SearchBar from "../components/SearchBar";
import FeatureCard from "../components/ui/FeatureCard";
import RailCard from "../components/ui/RailCard";
import ReviewQuoteCard from "../components/ui/ReviewQuoteCard";
import RankRow from "../components/ui/RankRow";
import UpcomingCard from "../components/ui/UpcomingCard";
import DdayPill from "../components/ui/DdayPill";
import SkeletonCard from "../components/ui/SkeletonCard";

/**
 * /home - mockups/home-light-mockup.html 이식.
 * 레이아웃: 피처드 히어로(메인 1 + 서브 2) / 신작 릴(가로 스크롤) /
 * 방금 올라온 리뷰(3열) / 이번 주 인기(2열 랭킹) / 출시 예정(3열 D-day 카드).
 * 컨테이너 max-w 1280. 섹션별 상태 독립 - 로딩=형태 스켈레톤, 에러=인라인,
 * 0건=섹션 숨김 (홈은 EmptyState 남발 금지).
 *
 * 목업 대비 편차 (실데이터, API 기준):
 * - 히어로 sub(한 줄 소개): 시놉시스 필드가 WorkSummary에 없어 연도·평점 메타로 대체.
 * - 신작 릴·리뷰 카드 meta: 플랫폼·장르 필드가 없어 "도메인 · 연도"로 구성.
 * - 리뷰 카드: useRecentReviewedWorks가 작품 요약만 반환(리뷰 본문·닉네임 없음)
 *   -> 인용문(.rv q)·닉네임(.who) 생략, 포스터+제목+별점+메타만 렌더.
 *   목업의 "더 보기" 링크도 이동할 리뷰 목록 페이지가 없어 생략.
 * - 이번 주 인기: 크로스 도메인 집계 API가 없어 플랫폼별 외부 랭킹 상위권을
 *   도메인 순서로 교차 배치해 6개 구성 - 표시 순번은 홈 화면 임시 순번.
 *   contentId 없는 항목(상세 미보유)은 제외. 델타 필드 없음 -> DeltaBadge 생략.
 *   장르 필드 없음 -> meta는 도메인 라벨만.
 * - 출시 예정: D-day는 releaseDate로 클라 계산 (당일=D-DAY, 날짜 없음=미정 tba).
 *   이미 지난 날짜 항목은 섹션 성격상 제외.
 * - 히어로에 쓰인 작품은 중복 노출 방지 - 리뷰 섹션은 메인, 신작 릴은 서브 2건 제외.
 */

/** 홈 인기 섹션에서 교차 배치할 외부 랭킹 플랫폼 (도메인 순서 고정) */
const HOME_RANK_PLATFORMS = [
  "TMDB_MOVIE",
  "TMDB_TV",
  "Steam",
  "NaverWebtoon",
  "NaverSeries",
] as const;

const RANK_PLATFORM_DOMAIN: Record<string, string> = {
  TMDB_MOVIE: "영화",
  TMDB_TV: "시리즈",
  Steam: "게임",
  NaverWebtoon: "웹툰",
  NaverSeries: "웹소설",
};

const HOME_RANK_SIZE = 6;

const categoryOf = (domain?: string): Category => {
  const key = domain?.toLowerCase() as Category;
  return key in thumbnailFallbackMap ? key : "movie";
};

const domainLabel = (domain?: string) =>
  DOMAIN_LABEL_MAP[domain ?? ""] ?? domain ?? "";

/** "도메인 · 연도" 메타 ("yyyy-MM-dd" 문자열에서 직접 연도 추출 - 타임존 문제 회피) */
const workMeta = (work: WorkSummary) => {
  const year = work.releaseDate?.slice(0, 4);
  return [domainLabel(work.domain), year].filter(Boolean).join(" · ");
};

/** 히어로 sub - 시놉시스 부재로 연도·평점 메타 (둘 다 없으면 생략) */
const heroSub = (work: WorkSummary) => {
  const year = work.releaseDate?.slice(0, 4);
  const score = work.score > 0 ? `평점 ${work.score.toFixed(1)}` : undefined;
  const parts = [year, score].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : undefined;
};

/**
 * 출시 예정 meta - "게임 · 11월 19일" (다른 해면 연도 표기).
 * 날짜 없으면 "발매일 미정" 표기 - 홈 카드에는 날짜 맥락(그룹 라벨)이 없어
 * 명시가 필요하다. /new는 월 그룹 라벨이 맥락을 주므로 도메인만 표기 (페이지별 유지).
 */
const upcomingMeta = (work: WorkSummary) => {
  const domain = domainLabel(work.domain);
  const ymd = parseYmd(work.releaseDate);
  if (!ymd) return `${domain} · 발매일 미정`;
  const datePart =
    ymd.y === new Date().getFullYear()
      ? `${ymd.m}월 ${ymd.d}일`
      : `${ymd.y}년 ${ymd.m}월 ${ymd.d}일`;
  return `${domain} · ${datePart}`;
};

/** 섹션 헤더 (목업 .sec-head) - h2 21px + 우측 more 링크 */
const SectionHead = ({
  title,
  moreLabel,
  moreTo,
}: {
  title: string;
  moreLabel?: string;
  moreTo?: string;
}) => (
  <div className="flex items-baseline gap-3">
    <h2 className="text-[21px] font-extrabold tracking-[-0.02em] text-ink">
      {title}
    </h2>
    {moreLabel && moreTo && (
      <Link
        to={moreTo}
        className="ml-auto inline-flex items-center gap-[3px] text-sm font-semibold text-ink-2 transition-colors hover:text-accent-ink"
      >
        {moreLabel}
        <CaretRight size={14} />
      </Link>
    )}
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
    className="mt-4 flex items-center gap-2.5 rounded-panel border border-line bg-surface px-4 py-3.5 text-sm text-ink-2"
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

/** 리뷰·출시 예정 카드 형태 스켈레톤 (가로형: 썸네일 + 텍스트 2줄) */
const RowCardSkeleton = ({ thumbWidth }: { thumbWidth: string }) => (
  <div
    aria-hidden="true"
    className="flex animate-pulse items-center gap-3.5 rounded-panel border border-line bg-surface p-4"
  >
    <div className={`aspect-[2/3] ${thumbWidth} flex-none rounded-input bg-line`} />
    <div className="flex min-w-0 flex-1 flex-col gap-2">
      <div className="h-4 w-3/5 rounded-input bg-line" />
      <div className="h-3 w-2/5 rounded-input bg-canvas" />
    </div>
  </div>
);

const reviewGridClass =
  "mt-4 grid grid-cols-1 gap-4 min-[768px]:grid-cols-2 min-[1024px]:grid-cols-3";

export default function HomePage() {
  const navigate = useNavigate();

  const reviewed = useRecentReviewedWorks({ size: 6 });
  const releases = useRecentReleases({ size: 8 });
  const upcoming = useUpcomingReleases({ size: 3 });
  const rankings = useAllRankings();

  const handleSearch = (query: string) => {
    navigate(`/search?keyword=${encodeURIComponent(query)}`);
  };

  // TODO: 추천 엔진 연동 시 교체 - 현재는 최근 리뷰작 1건(메인) + 신작 상위 2건(서브) 임시 선정
  const heroMain =
    reviewed.data?.content?.[0] ?? releases.data?.content?.[0];
  const heroSides = (releases.data?.content ?? [])
    .filter((w) => w.id !== heroMain?.id)
    .slice(0, 2);
  const heroLoading = reviewed.isLoading || releases.isLoading;
  const heroError = reviewed.isError && releases.isError;

  // 히어로 중복 노출 방지 - 릴은 히어로 서브 2건(+reviewed 실패 폴백 시 메인), 리뷰 섹션은 히어로 메인 제외
  const heroSideIds = new Set(heroSides.map((w) => w.id));
  const railItems = (releases.data?.content ?? []).filter(
    (w) => !heroSideIds.has(w.id) && w.id !== heroMain?.id,
  );
  const reviewItems = (reviewed.data?.content ?? [])
    .filter((w) => w.id !== heroMain?.id)
    .slice(0, 3);
  // 출시 예정 섹션 성격상 이미 지난 날짜는 제외 (날짜 미정은 유지)
  const upcomingItems = (upcoming.data?.content ?? []).filter((w) => {
    const diff = daysUntil(w.releaseDate);
    return diff === null || diff >= 0;
  });

  // 플랫폼별 상위 랭킹을 도메인 순서로 라운드 로빈 교차 배치 (contentId 보유분만)
  const rankItems = useMemo(() => {
    const data = rankings.data ?? [];
    const lists = HOME_RANK_PLATFORMS.map((platform) =>
      data
        .filter((item) => item.platform === platform && item.contentId)
        .sort((a, b) => a.ranking - b.ranking),
    );
    const maxLen = Math.max(0, ...lists.map((list) => list.length));
    const picked: ExternalRanking[] = [];
    for (let round = 0; round < maxLen; round++) {
      for (const list of lists) {
        if (picked.length >= HOME_RANK_SIZE) return picked;
        const item = list[round];
        if (item) picked.push(item);
      }
    }
    return picked;
  }, [rankings.data]);

  return (
    <>
      <h1 className="sr-only">홈</h1>

      {/* 모바일 전용 검색 - 데스크톱(lg~)은 SiteHeader 검색이 담당 */}
      <SearchBar fixed={false} onSearch={handleSearch} />

      <div className="mx-auto max-w-[1280px] px-6 pb-[72px] pt-7">
        {/* 피처드 히어로: 메인 1 + 서브 2 */}
        {heroLoading ? (
          <div
            aria-hidden="true"
            className="grid gap-4 min-[1024px]:grid-cols-[2fr_1fr]"
          >
            <div className="min-h-[300px] animate-pulse rounded-panel border border-line bg-line min-[1024px]:min-h-[400px]" />
            <div className="grid gap-4 min-[768px]:grid-cols-2 min-[1024px]:grid-cols-1 min-[1024px]:grid-rows-2">
              <div className="min-h-[160px] animate-pulse rounded-panel border border-line bg-line" />
              <div className="min-h-[160px] animate-pulse rounded-panel border border-line bg-line" />
            </div>
          </div>
        ) : heroError ? (
          <SectionError
            message="추천 작품을 불러오지 못했어요."
            onRetry={() => {
              reviewed.refetch();
              releases.refetch();
            }}
          />
        ) : heroMain ? (
          <div
            className={`grid gap-4 ${
              heroSides.length > 0 ? "min-[1024px]:grid-cols-[2fr_1fr]" : ""
            }`}
          >
            <FeatureCard
              variant="main"
              kicker={`오늘의 추천 · ${domainLabel(heroMain.domain)}`}
              title={heroMain.title}
              sub={heroSub(heroMain)}
              imageUrl={heroMain.thumbnail}
              fallbackIconUrl={thumbnailFallbackMap[categoryOf(heroMain.domain)]}
              to={`/work/${heroMain.id}`}
            />
            {heroSides.length > 0 && (
              <div className="grid gap-4 min-[768px]:grid-cols-2 min-[1024px]:grid-cols-1 min-[1024px]:grid-rows-2">
                {heroSides.map((work) => (
                  <FeatureCard
                    key={work.id}
                    variant="side"
                    kicker={domainLabel(work.domain)}
                    title={work.title}
                    imageUrl={work.thumbnail}
                    fallbackIconUrl={
                      thumbnailFallbackMap[categoryOf(work.domain)]
                    }
                    to={`/work/${work.id}`}
                  />
                ))}
              </div>
            )}
          </div>
        ) : null}

        {/* 신작 릴 */}
        {(releases.isLoading || releases.isError || railItems.length > 0) && (
          <section className="mt-14">
            <SectionHead
              title="새로 나온 작품"
              moreLabel="전체 보기"
              moreTo="/new"
            />
            {releases.isLoading ? (
              <div aria-hidden="true" className="mt-4 flex gap-3.5 overflow-hidden pb-1.5">
                {Array.from({ length: 6 }, (_, i) => (
                  <div key={i} className="w-[168px] flex-none animate-pulse">
                    <div className="aspect-[2/3] rounded-panel border border-line bg-line" />
                    <div className="mt-[9px] h-4 w-4/5 rounded-input bg-line" />
                    <div className="mt-1.5 h-3 w-3/5 rounded-input bg-canvas" />
                  </div>
                ))}
              </div>
            ) : releases.isError ? (
              <SectionError
                message="신작을 불러오지 못했어요."
                onRetry={() => releases.refetch()}
              />
            ) : (
              <div
                role="region"
                aria-label="새로 나온 작품"
                tabIndex={0}
                className="scrollbar-rail mt-4 flex snap-x snap-mandatory gap-3.5 overflow-x-auto pb-1.5"
              >
                {railItems.map((work) => (
                  <RailCard
                    key={work.id}
                    title={work.title}
                    meta={workMeta(work)}
                    imageUrl={work.thumbnail}
                    fallbackIconUrl={
                      thumbnailFallbackMap[categoryOf(work.domain)]
                    }
                    to={`/work/${work.id}`}
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {/* 방금 올라온 리뷰 */}
        {(reviewed.isLoading || reviewed.isError || reviewItems.length > 0) && (
          <section className="mt-14">
            <SectionHead title="방금 올라온 리뷰" />
            {reviewed.isLoading ? (
              <div aria-hidden="true" className={reviewGridClass}>
                {Array.from({ length: 3 }, (_, i) => (
                  <RowCardSkeleton key={i} thumbWidth="w-16" />
                ))}
              </div>
            ) : reviewed.isError ? (
              <SectionError
                message="최근 리뷰 작품을 불러오지 못했어요."
                onRetry={() => reviewed.refetch()}
              />
            ) : (
              <div className={reviewGridClass}>
                {reviewItems.map((work) => (
                  <ReviewQuoteCard
                    key={work.id}
                    title={work.title}
                    score={work.score > 0 ? work.score : undefined}
                    caption={workMeta(work)}
                    imageUrl={work.thumbnail}
                    fallbackIconUrl={
                      thumbnailFallbackMap[categoryOf(work.domain)]
                    }
                    to={`/work/${work.id}`}
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {/* 이번 주 인기 */}
        {(rankings.isLoading || rankings.isError || rankItems.length > 0) && (
          <section className="mt-14">
            <SectionHead
              title="이번 주 인기"
              moreLabel="랭킹 전체"
              moreTo="/ranking"
            />
            {rankings.isLoading ? (
              <div
                aria-hidden="true"
                className="mt-4 grid grid-cols-1 gap-x-10 min-[1024px]:grid-cols-2"
              >
                {Array.from({ length: HOME_RANK_SIZE }, (_, i) => (
                  <SkeletonCard key={i} variant="row" />
                ))}
              </div>
            ) : rankings.isError ? (
              <SectionError
                message="랭킹을 불러오지 못했어요."
                onRetry={() => rankings.refetch()}
              />
            ) : (
              <div className="mt-4 grid grid-cols-1 gap-x-10 min-[1024px]:grid-cols-2">
                {rankItems.map((item, index) => (
                  <RankRow
                    key={item.id}
                    variant="feature"
                    accent={index < 2}
                    no={index + 1}
                    title={item.title}
                    meta={RANK_PLATFORM_DOMAIN[item.platform] ?? item.platform}
                    imageUrl={item.thumbnailUrl}
                    to={`/work/${item.contentId}`}
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {/* 출시 예정 */}
        {(upcoming.isLoading || upcoming.isError || upcomingItems.length > 0) && (
          <section className="mt-14">
            <SectionHead
              title="출시 예정"
              moreLabel="전체 보기"
              moreTo="/new"
            />
            {upcoming.isLoading ? (
              <div aria-hidden="true" className={reviewGridClass}>
                {Array.from({ length: 3 }, (_, i) => (
                  <RowCardSkeleton key={i} thumbWidth="w-14" />
                ))}
              </div>
            ) : upcoming.isError ? (
              <SectionError
                message="출시 예정작을 불러오지 못했어요."
                onRetry={() => upcoming.refetch()}
              />
            ) : (
              <div className={reviewGridClass}>
                {upcomingItems.map((work) => {
                  const dday = dDayOf(work.releaseDate);
                  return (
                    <UpcomingCard
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
              </div>
            )}
          </section>
        )}
      </div>
    </>
  );
}

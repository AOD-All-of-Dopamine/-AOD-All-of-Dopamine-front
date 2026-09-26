import { useMemo } from "react";
import { Link } from "react-router-dom";
import { CaretRight, WarningCircle } from "@phosphor-icons/react";
import { ExternalRanking } from "@aod/shared/api";
import { useRecentReviewedWorks, useReleasesByDomain } from "@aod/shared/hooks";
import { useAllRankings } from "@aod/shared/hooks";
import { WorkSummary } from "@aod/shared/types";
import { DOMAIN_LABEL_MAP, platformLabel } from "@aod/shared/constants";
import { watchPlatformLabels } from "../constants/platforms";
import { categoryOf, thumbnailFallbackMap } from "../constants/thumbnail";
import { daysUntil, dDayOf, parseYmd } from "../utils/releaseDate";
import DomainRotator, {
  type RotatorSlide,
} from "../components/ui/DomainRotator";
import FeatureCard from "../components/ui/FeatureCard";
import RailCard from "../components/ui/RailCard";
import RankRow from "../components/ui/RankRow";
import UpcomingCard from "../components/ui/UpcomingCard";
import DdayPill from "../components/ui/DdayPill";
import SkeletonCard from "../components/ui/SkeletonCard";
import HomeRecRail from "../components/home/HomeRecRail";

/**
 * /home - mockups/home-light-mockup.html 이식.
 * 레이아웃: 피처드 히어로(메인 1 + 서브 2) / 추천 릴 / 신작 릴(가로 스크롤) /
 * 이번 주 인기(2열 랭킹) / 출시 예정(3열 D-day 카드).
 * 컨테이너 max-w 1280. 섹션별 상태 독립 - 로딩=형태 스켈레톤, 에러=인라인,
 * 0건=섹션 숨김 (홈은 EmptyState 남발 금지).
 *
 * 목업 대비 편차 (실데이터, API 기준):
 * - 히어로 sub(한 줄 소개): 시놉시스 필드가 WorkSummary에 없어 연도·평점 메타로 대체.
 * - 신작 릴 meta: 목업대로 "도메인 · 플랫폼" (플랫폼 미수집 작품은 연도 폴백).
 * - 이번 주 인기: 크로스 도메인 집계 API가 없어 플랫폼별 외부 랭킹 상위권을
 *   도메인 순서로 교차 배치해 6개 구성 - 표시 순번은 홈 화면 임시 순번.
 *   contentId 없는 항목(상세 미보유)은 제외. 델타 필드 없음 -> DeltaBadge 생략.
 *   장르 필드 없음 -> meta는 도메인 라벨만.
 * - 출시 예정: D-day는 releaseDate로 클라 계산 (당일=D-DAY, 날짜 없음=미정 tba).
 *   이미 지난 날짜 항목은 섹션 성격상 제외.
 * - 히어로에 쓰인 작품은 중복 노출 방지 - 리뷰 섹션은 메인, 신작 릴은 서브 2건 제외.
 * - **추천 릴**(홈 설계 2026-09-25): 히어로 아래에 추천 한 줄(HomeRecRail)을 둔다. 예전 "방금 올라온 리뷰"
 *   섹션·모바일 홈/추천 전환은 뺐다(추천 탭은 릴의 "추천 더 보기"로 간다). 히어로 머리말은 "오늘의 작품" -
 *   개인화가 아닌 목록에 "추천"을 쓰면 바로 아래 진짜 추천과 뜻이 겹친다. 리뷰 쿼리는 히어로 메인이 쓰므로 남긴다.
 *   처음엔 빌드 플래그(VITE_HOME_REC) 뒤에 두었다가 2026-09-26 플래그 없이 항상 켜기로 했다.
 * - 새로 나온 작품 · 이번 주 인기 · 출시 예정은 **도메인별 슬라이드**(DomainRotator)다 - 시간이 지나면
 *   다음 도메인이 밀고 들어온다. 전 도메인 한 번 조회로는 매일 올라오는 도메인(웹소설·웹툰)이 목록을
 *   다 차지해서, 신작·출시 예정은 도메인마다 따로 받는다(useReleasesByDomain). 작품이 없는 도메인은
 *   슬라이드에서 빠지고, 하나만 남으면 회전 없이 그대로 보인다. 인기는 플랫폼별 실제 순위 상위 6.
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

/** 도메인별 슬라이드의 순서 (인기 섹션의 플랫폼 순서와 같다) */
const HOME_DOMAINS = ["MOVIE", "TV", "GAME", "WEBTOON", "WEBNOVEL"] as const;
const HOME_RAIL_SIZE = 10;
const HOME_UPCOMING_SIZE = 3;
/** 슬라이드 하나가 머무는 시간 · 섹션끼리 동시에 넘어가지 않게 엇갈리는 간격 */
const ROTATE_MS = 7000;
const ROTATE_STAGGER_MS = 2300;

const domainLabel = (domain?: string) =>
  DOMAIN_LABEL_MAP[domain ?? ""] ?? domain ?? "";

/**
 * 신작 릴 meta - "게임 · 스팀" (목업 .rail-card .m: 도메인 · 플랫폼).
 * 플랫폼은 수집 소스(TMDB_*) 제외 첫 항목의 한글 라벨, 없으면 연도 폴백.
 */
const railMeta = (work: WorkSummary) => {
  const platform = watchPlatformLabels(work.platforms)[0];
  const year = work.releaseDate?.slice(0, 4);
  return [domainLabel(work.domain), platform ?? year]
    .filter(Boolean)
    .join(" · ");
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
  const reviewed = useRecentReviewedWorks({ size: 6 });
  // 신작은 도메인마다 따로 받는다 - 릴의 도메인별 슬라이드와 히어로 서브 2건이 같이 쓴다
  // (전 도메인 조회를 따로 한 번 더 하지 않는다 - 서버는 같은 3개월치를 두 번 읽게 된다)
  const releasesByDomain = useReleasesByDomain("recent", HOME_DOMAINS, HOME_RAIL_SIZE);
  const upcomingByDomain = useReleasesByDomain("upcoming", HOME_DOMAINS, HOME_UPCOMING_SIZE);
  const rankings = useAllRankings();

  // 도메인 5개가 다 도착한 뒤에 고른다 - 먼저 온 도메인만 보고 골랐다가 나중에 바뀌면 화면이 튄다
  const releasesSettled = releasesByDomain.every((r) => !r.isLoading);
  const newestReleases = releasesSettled
    ? releasesByDomain
        .flatMap((r) => r.items)
        .sort((x, y) => (y.releaseDate ?? "").localeCompare(x.releaseDate ?? ""))
    : [];

  // TODO: 추천 엔진 연동 시 교체 - 현재는 최근 리뷰작 1건(메인) + 신작 상위 2건(서브) 임시 선정
  const reviewedMain = reviewed.data?.content?.[0];
  const heroMain = reviewedMain ?? newestReleases[0];
  const heroSides = newestReleases.filter((w) => w.id !== heroMain?.id).slice(0, 2);
  const heroLoading = reviewed.isLoading || (!reviewedMain && !releasesSettled);
  const heroError = reviewed.isError && releasesByDomain.every((r) => r.isError);
  /** 서브 칸 - 신작이 아직 오는 중이면 자리(스켈레톤)를 잡아 둔다 */
  const heroSidesPending = !releasesSettled;

  // 히어로 중복 노출 방지 - 릴은 히어로 서브 2건(+reviewed 실패 폴백 시 메인) 제외
  const heroSideIds = new Set(heroSides.map((w) => w.id));

  // 새로 나온 작품 - 도메인마다 한 슬라이드 (작품이 없는 도메인은 빠진다)
  const railSlides: RotatorSlide[] = (
    releasesSettled ? releasesByDomain : []
  ).flatMap(({ domain, items }) => {
    const works = items.filter(
      (w) => !heroSideIds.has(w.id) && w.id !== heroMain?.id,
    );
    if (works.length === 0) return [];
    const label = domainLabel(domain);
    return [
      {
        id: domain,
        label,
        preload: works.map((w) => w.thumbnail),
        content: (
          <div
            role="region"
            aria-label={`새로 나온 ${label}`}
            tabIndex={0}
            className="scrollbar-rail flex snap-x snap-mandatory gap-3.5 overflow-x-auto pb-1.5"
          >
            {works.map((work) => (
              <RailCard
                key={work.id}
                title={work.title}
                meta={railMeta(work)}
                imageUrl={work.thumbnail}
                domain={work.domain}
                to={`/work/${work.id}`}
              />
            ))}
          </div>
        ),
      },
    ];
  });
  const railLoading = !releasesSettled;
  const railError =
    railSlides.length === 0 &&
    !railLoading &&
    releasesByDomain.every((r) => r.isError);

  // 이번 주 인기 - 플랫폼(=도메인)마다 실제 순위 상위 6 (contentId 보유분만)
  const rankSlides: RotatorSlide[] = useMemo(() => {
    const data = rankings.data ?? [];
    return HOME_RANK_PLATFORMS.flatMap((platform) => {
      const items: ExternalRanking[] = data
        .filter((item) => item.platform === platform && item.contentId)
        .sort((x, y) => x.ranking - y.ranking)
        .slice(0, HOME_RANK_SIZE);
      if (items.length === 0) return [];
      return [
        {
          id: platform,
          label: RANK_PLATFORM_DOMAIN[platform],
          preload: items.map((item) => item.thumbnailUrl),
          content: (
            <div className="grid grid-cols-1 gap-x-10 min-[1024px]:grid-cols-2">
              {items.map((item, index) => (
                <RankRow
                  key={item.id}
                  variant="feature"
                  accent={index < 2}
                  no={item.ranking}
                  title={item.title}
                  meta={platformLabel(item.platform)}
                  imageUrl={item.thumbnailUrl}
                  to={`/work/${item.contentId}`}
                />
              ))}
            </div>
          ),
        },
      ];
    });
  }, [rankings.data]);

  // 출시 예정 - 도메인마다 3건. 섹션 성격상 이미 지난 날짜는 제외 (날짜 미정은 유지)
  const upcomingSlides: RotatorSlide[] = upcomingByDomain.flatMap(({ domain, items }) => {
    const works = items.filter((w) => {
      const diff = daysUntil(w.releaseDate);
      return diff === null || diff >= 0;
    });
    if (works.length === 0) return [];
    return [
      {
        id: domain,
        label: domainLabel(domain),
        preload: works.map((w) => w.thumbnail),
        content: (
          <div className="grid grid-cols-1 gap-4 min-[768px]:grid-cols-2 min-[1024px]:grid-cols-3">
            {works.map((work) => {
              const dday = dDayOf(work.releaseDate);
              return (
                <UpcomingCard
                  key={work.id}
                  title={work.title}
                  meta={upcomingMeta(work)}
                  imageUrl={work.thumbnail}
                  fallbackIconUrl={thumbnailFallbackMap[categoryOf(work.domain)]}
                  to={`/work/${work.id}`}
                  slot={<DdayPill variant={dday.variant}>{dday.label}</DdayPill>}
                />
              );
            })}
          </div>
        ),
      },
    ];
  });
  const upcomingLoading =
    upcomingSlides.length === 0 && upcomingByDomain.some((r) => r.isLoading);
  const upcomingError =
    upcomingSlides.length === 0 &&
    !upcomingLoading &&
    upcomingByDomain.every((r) => r.isError);

  return (
    <>
      <h1 className="sr-only">홈</h1>

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
            message="작품을 불러오지 못했어요."
            onRetry={() => {
              reviewed.refetch();
              releasesByDomain.forEach((r) => r.refetch());
            }}
          />
        ) : heroMain ? (
          <div
            className={`grid gap-4 ${
              heroSidesPending || heroSides.length > 0
                ? "min-[1024px]:grid-cols-[2fr_1fr]"
                : ""
            }`}
          >
            <FeatureCard
              variant="main"
              kicker={`오늘의 작품 · ${domainLabel(heroMain.domain)}`}
              title={heroMain.title}
              sub={heroSub(heroMain)}
              imageUrl={heroMain.thumbnail}
              domain={heroMain.domain}
              to={`/work/${heroMain.id}`}
            />
            {heroSidesPending && (
              <div
                aria-hidden="true"
                className="grid gap-4 min-[768px]:grid-cols-2 min-[1024px]:grid-cols-1 min-[1024px]:grid-rows-2"
              >
                <div className="min-h-[160px] animate-pulse rounded-panel border border-line bg-line" />
                <div className="min-h-[160px] animate-pulse rounded-panel border border-line bg-line" />
              </div>
            )}
            {heroSides.length > 0 && (
              <div className="grid gap-4 min-[768px]:grid-cols-2 min-[1024px]:grid-cols-1 min-[1024px]:grid-rows-2">
                {heroSides.map((work) => (
                  <FeatureCard
                    key={work.id}
                    variant="side"
                    kicker={domainLabel(work.domain)}
                    title={work.title}
                    imageUrl={work.thumbnail}
                    domain={work.domain}
                    to={`/work/${work.id}`}
                  />
                ))}
              </div>
            )}
          </div>
        ) : null}

        {/* 추천 릴 - 히어로 바로 아래 */}
        <HomeRecRail />

        {/* 신작 릴 - 도메인별 슬라이드 */}
        {railSlides.length > 0 ? (
          <DomainRotator
            title="새로 나온 작품"
            moreLabel="전체 보기"
            moreTo="/new"
            slides={railSlides}
            intervalMs={ROTATE_MS}
          />
        ) : (
          (railLoading || railError) && (
            <section className="mt-14">
              <SectionHead title="새로 나온 작품" moreLabel="전체 보기" moreTo="/new" />
              {railLoading ? (
                <div aria-hidden="true" className="mt-4 flex gap-3.5 overflow-hidden pb-1.5">
                  {Array.from({ length: 6 }, (_, i) => (
                    <div key={i} className="w-[168px] flex-none animate-pulse">
                      <div className="aspect-[2/3] rounded-panel border border-line bg-line" />
                      <div className="mt-[9px] h-4 w-4/5 rounded-input bg-line" />
                      <div className="mt-1.5 h-3 w-3/5 rounded-input bg-canvas" />
                    </div>
                  ))}
                </div>
              ) : (
                <SectionError
                  message="신작을 불러오지 못했어요."
                  onRetry={() => releasesByDomain.forEach((r) => r.refetch())}
                />
              )}
            </section>
          )
        )}

        {/* 이번 주 인기 - 플랫폼(도메인)별 슬라이드 */}
        {rankSlides.length > 0 ? (
          <DomainRotator
            title="이번 주 인기"
            moreLabel="랭킹 전체"
            moreTo="/ranking"
            slides={rankSlides}
            intervalMs={ROTATE_MS}
            startDelayMs={ROTATE_STAGGER_MS}
          />
        ) : (
          (rankings.isLoading || rankings.isError) && (
            <section className="mt-14">
              <SectionHead title="이번 주 인기" moreLabel="랭킹 전체" moreTo="/ranking" />
              {rankings.isLoading ? (
                <div
                  aria-hidden="true"
                  className="mt-4 grid grid-cols-1 gap-x-10 min-[1024px]:grid-cols-2"
                >
                  {Array.from({ length: HOME_RANK_SIZE }, (_, i) => (
                    <SkeletonCard key={i} variant="row" />
                  ))}
                </div>
              ) : (
                <SectionError
                  message="랭킹을 불러오지 못했어요."
                  onRetry={() => rankings.refetch()}
                />
              )}
            </section>
          )
        )}

        {/* 출시 예정 - 도메인별 슬라이드 */}
        {upcomingSlides.length > 0 ? (
          <DomainRotator
            title="출시 예정"
            moreLabel="전체 보기"
            moreTo="/new"
            slides={upcomingSlides}
            intervalMs={ROTATE_MS}
            startDelayMs={ROTATE_STAGGER_MS * 2}
          />
        ) : (
          (upcomingLoading || upcomingError) && (
            <section className="mt-14">
              <SectionHead title="출시 예정" moreLabel="전체 보기" moreTo="/new" />
              {upcomingLoading ? (
                <div aria-hidden="true" className={reviewGridClass}>
                  {Array.from({ length: 3 }, (_, i) => (
                    <RowCardSkeleton key={i} thumbWidth="w-14" />
                  ))}
                </div>
              ) : (
                <SectionError
                  message="출시 예정작을 불러오지 못했어요."
                  onRetry={() => upcomingByDomain.forEach((r) => r.refetch())}
                />
              )}
            </section>
          )
        )}
      </div>
    </>
  );
}

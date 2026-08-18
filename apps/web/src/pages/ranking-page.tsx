import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { WarningCircle } from "@phosphor-icons/react";
import { usePlatformRankings } from "@aod/shared/hooks";
import { DOMAIN_LABEL_MAP } from "@aod/shared/constants";
import { platformLabel } from "../constants/platforms";
import DomainChip from "../components/ui/DomainChip";
import RankRow from "../components/ui/RankRow";
import EmptyState from "../components/ui/EmptyState";

/**
 * /ranking - mockups/ranking-mockup.html 이식 + 포디움 제거 개편(2026-08-18).
 * 레이아웃: h1 랭킹 + 도메인 칩 / 플랫폼 칩(랭킹 원천) / 출처 캡션 /
 * 전 순위 동일 컴팩트 순위 행(RankRow compact, 1~3위 순번 accent-ink) -
 * 전 브레이크포인트 공통(모바일 문법 통일, 톱3 대형 포디움 카드 폐지).
 * 게임 도메인 행 썸네일은 460:215 가로(Steam header 원본 비율), 타 도메인은
 * 기존 세로. 컨테이너 max-w 1080, <lg 칩 행은 가로 스크롤.
 *
 * 히스토리 정책: 도메인 칩 전환은 push (탭 성격), 플랫폼은 replace (필터 성격).
 * URL 쿼리(?domain=&platform=)가 상태의 단일 출처, 기본값은 파라미터 생략.
 *
 * 백엔드 계약(RankingController + ExternalRanking 엔티티) 기준 편차:
 * - 목업의 기간(일간/주간/월간) 세그먼트·집계 기준 select·장르 부문 칩 미렌더:
 *   API가 플랫폼·도메인 축만 제공(GET /api/rankings/{platform} 등 3개)하고,
 *   external_ranking 테이블에 기간·기준·장르 컬럼이 없다. RankingScheduler가
 *   매일 04시 플랫폼당 단일 스냅샷만 upsert하므로 축 자체가 수집되지 않는다.
 * - DeltaBadge(순위 변동) 생략: RankingResponse에 변동 필드가 없다
 *   (이전 스냅샷을 덮어써 비교 원본도 없음). 컴팩트 행의 우측
 *   변동 표시(↑n/-/NEW)도 같은 이유로 생략.
 * - 행 meta(목업 "장르 · 작가") 생략: RankingResponse에 해당 필드가 없다.
 * - 플랫폼 칩은 현재 도메인당 수집 원천이 1개라 사실상 출처 표시 +
 *   로드맵(준비 중 disabled) 역할. 모델은 원천 목록(platforms 배열)이라
 *   원천이 추가되면 칩·URL이 그대로 선택 축으로 동작한다. ?platform=은
 *   목록 멤버십으로 검증하고 기본 원천(첫 항목)이면 파라미터를 생략한다.
 * - contentId 없는 항목(상세 미수집)은 비링크 정적 행 (구 페이지의 안내 모달 대체).
 * - 플랫폼 칩 라벨 "스팀": 목업은 "Steam"이나 PLATFORM_META 전역 관례를 따라
 *   의도적 유지 (탐색 등 다른 페이지와 표기 통일).
 */

/** 도메인 칩 순서 - 목업 순서(웹툰·게임·영화·웹소설)에 시리즈를 영화 옆에 추가 */
const RANKING_DOMAINS = ["webtoon", "game", "movie", "tv", "webnovel"] as const;

/**
 * 도메인별 랭킹 원천 목록 (첫 항목 = 기본 원천). platforms 값은
 * RankingCrawlerService가 저장하는 문자열과 동일해야 한다.
 * caption은 실제 수집 방식 기준의 정직한 출처 문구:
 * 네이버웹툰=요일별 인기, 시리즈=일간 Top 100, Steam=한국 최고 판매,
 * TMDB=인기 점수 내림차순 + 국내 OTT 5사(watch_region=KR) 제공작 +
 * 최소 투표수 필터(TmdbRankingFetcher/Mapper).
 * 전 플랫폼 매일 새벽 갱신(RankingScheduler 04시).
 */
const RANKING_SOURCES: Record<
  string,
  { platforms: string[]; caption: string; soonPlatforms: string[] }
> = {
  webtoon: {
    platforms: ["NaverWebtoon"],
    caption: "네이버웹툰 요일별 인기 순위 기준, 매일 갱신",
    soonPlatforms: ["카카오웹툰"],
  },
  game: {
    platforms: ["Steam"],
    caption: "스팀 한국 최고 판매 순위 기준, 매일 갱신",
    soonPlatforms: ["Epic Games"],
  },
  movie: {
    platforms: ["TMDB_MOVIE"],
    caption: "TMDB 인기 순위 기준 (국내 OTT 제공작), 매일 갱신",
    soonPlatforms: [],
  },
  tv: {
    platforms: ["TMDB_TV"],
    caption: "TMDB 인기 순위 기준 (국내 OTT 제공작), 매일 갱신",
    soonPlatforms: [],
  },
  webnovel: {
    platforms: ["NaverSeries"],
    caption: "네이버시리즈 일간 Top 100 기준, 매일 갱신",
    soonPlatforms: ["카카오페이지"],
  },
};

const DEFAULT_DOMAIN = "webtoon";

/** URL 쿼리를 유효한 화면 상태로 정규화 (잘못된 값은 안전 폴백) */
const parseParams = (p: URLSearchParams) => {
  const raw = (p.get("domain") ?? DEFAULT_DOMAIN).toLowerCase();
  const domainId = (RANKING_DOMAINS as readonly string[]).includes(raw)
    ? raw
    : DEFAULT_DOMAIN;
  const source = RANKING_SOURCES[domainId];
  // 원천 목록 멤버십 검사 - 목록 밖 값은 기본 원천(첫 항목)으로 정규화
  const rawPlatform = p.get("platform");
  const platform =
    rawPlatform && source.platforms.includes(rawPlatform)
      ? rawPlatform
      : source.platforms[0];
  return { domainId, platform, source };
};

/** 컴팩트 순위 행 형태 스켈레톤 - 게임 도메인은 460:215 가로 썸네일 골격 */
const RankRowSkeleton = ({ landscape }: { landscape: boolean }) => (
  <div className="flex animate-pulse items-center gap-3 rounded-panel border border-line bg-surface py-2.5 pl-3 pr-3.5">
    <div className="h-6 w-[26px] flex-none rounded-input bg-line" />
    <div
      className={`h-[62px] flex-none rounded-md bg-line ${
        landscape ? "aspect-[460/215]" : "w-12"
      }`}
    />
    <div className="h-4 w-3/5 rounded-input bg-line" />
  </div>
);

export default function RankingPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  // URL 쿼리(?domain=&platform=)가 상태의 단일 출처
  const { domainId, platform, source } = useMemo(
    () => parseParams(searchParams),
    [searchParams],
  );

  // 도메인 칩 전환 = push (탭 성격), 동일 값이면 히스토리 no-op
  const handleDomainChange = (id: string) => {
    if (id === domainId) return;
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      if (id === DEFAULT_DOMAIN) params.delete("domain");
      else params.set("domain", id);
      params.delete("platform");
      return params;
    });
    window.scrollTo({ top: 0 });
  };

  // 플랫폼 전환 = replace (필터 성격). 현재는 원천 1개라 항상 no-op
  const handlePlatformChange = (next: string) => {
    if (next === platform) return;
    setSearchParams(
      (prev) => {
        const params = new URLSearchParams(prev);
        // 기본값 생략 정책 - 기본 원천이면 파라미터 자체를 지운다
        if (next === source.platforms[0]) params.delete("platform");
        else params.set("platform", next);
        return params;
      },
      { replace: true },
    );
  };

  const rankings = usePlatformRankings(platform);

  // 순위 오름차순 정렬 - 전 순위가 동일한 컴팩트 행이라 슬라이싱 없음
  const sorted = useMemo(
    () => [...(rankings.data ?? [])].sort((a, b) => a.ranking - b.ranking),
    [rankings.data],
  );
  // 게임 도메인은 460:215 가로 썸네일 (Steam header 원본 비율 - 세로 크롭 제거)
  const isGame = domainId === "game";

  return (
    <div className="mx-auto max-w-[1080px] px-6 pb-20 pt-7">
      <h1 className="text-[26px] font-extrabold tracking-[-0.03em] text-ink">
        랭킹
      </h1>

      {/* 도메인 칩 - <lg 가로 스크롤, lg 이상 기존 래핑 유지 */}
      <div className="mt-4 flex gap-1.5 overflow-x-auto scrollbar-hide lg:flex-wrap lg:overflow-visible">
        {RANKING_DOMAINS.map((id) => (
          <DomainChip
            key={id}
            active={domainId === id}
            onClick={() => handleDomainChange(id)}
          >
            {DOMAIN_LABEL_MAP[id.toUpperCase()]}
          </DomainChip>
        ))}
      </div>

      {/* 플랫폼 칩 - 도메인별 랭킹 원천, 미수집 플랫폼은 준비 중 disabled */}
      <div className="mt-3 flex gap-1.5 overflow-x-auto scrollbar-hide lg:flex-wrap lg:overflow-visible">
        {source.platforms.map((key) => (
          <DomainChip
            key={key}
            size="sm"
            active={platform === key}
            onClick={() => handlePlatformChange(key)}
          >
            {platformLabel(key)}
          </DomainChip>
        ))}
        {source.soonPlatforms.map((label) => (
          <DomainChip key={label} size="sm" disabled soonLabel="준비 중">
            {label}
          </DomainChip>
        ))}
      </div>

      {/* 출처 캡션 (목업 .source) */}
      <p className="mt-3.5 text-[13.5px] text-ink-3">{source.caption}</p>

      {rankings.isLoading ? (
        // 실물과 동일한 컴팩트 행 골격 - 게임 도메인은 가로 썸네일 형상
        <div aria-hidden="true" className="mt-3 flex flex-col gap-2">
          {Array.from({ length: 10 }, (_, i) => (
            <RankRowSkeleton key={i} landscape={isGame} />
          ))}
        </div>
      ) : rankings.isError ? (
        <div className="mt-7">
          <EmptyState
            icon={<WarningCircle size={44} />}
            title="랭킹을 불러오지 못했어요"
            description="네트워크 상태를 확인한 뒤 다시 시도해 주세요."
            action={
              <button
                type="button"
                onClick={() => rankings.refetch()}
                className="rounded-full bg-ink px-[22px] py-2.5 text-sm font-semibold text-surface transition-opacity hover:opacity-85 active:scale-[0.98]"
              >
                다시 시도
              </button>
            }
          />
        </div>
      ) : sorted.length === 0 ? (
        <div className="mt-7">
          <EmptyState
            title="아직 랭킹 데이터가 없어요"
            description="랭킹은 매일 새벽에 갱신돼요. 잠시 후 다시 확인해 주세요."
          />
        </div>
      ) : (
        // 전 순위 동일 컴팩트 순위 행 - 1위부터 전체, 1~3위 순번 accent-ink
        <div className="mt-3 flex flex-col gap-2">
          {sorted.map((item) => (
            <RankRow
              key={item.id}
              variant="compact"
              accent={item.ranking <= 3}
              no={item.ranking}
              title={item.title}
              imageUrl={item.thumbnailUrl}
              thumbShape={isGame ? "landscape" : "portrait"}
              to={item.contentId ? `/work/${item.contentId}` : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}

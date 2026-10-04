import type { WorksQueryParams } from "@aod/shared/api";

/**
 * 탐색 "전체" 테마 선반(설계 2026-10-04-trend-explore-design.md E1 · v2 #8).
 * 테마 = 저장된 필터 + 정렬 — 서버 목록 API 를 그대로 부른다(ranking 은 순위 API).
 * 1단계는 지금 API 로 되는 것만. "전체 ›" 는 같은 조건이 걸린 탐색 그리드(또는 트렌드)로.
 */
export type ExploreTheme =
  | { id: string; title: string; rule: string; domain: string; kind: "works"; query: WorksQueryParams; moreTo: string }
  | { id: string; title: string; rule: string; domain: string; kind: "ranking"; platform: string; moreTo: string };

export const EXPLORE_THEME_SIZE = 12;

export const exploreThemes = (today: string): ExploreTheme[] => [
  {
    id: "game-reviews",
    title: "리뷰 1만 이상 게임",
    rule: "스팀 리뷰 10,000개 이상 · 리뷰 많은 순",
    domain: "GAME",
    kind: "works",
    query: { domain: "GAME", reviewCountMin: 10000, releaseTo: today, sortBy: "steamReviews", sortDirection: "desc" },
    moreTo: "/explore?domain=game&reviewMin=10000",
  },
  {
    id: "tv-netflix-watcha",
    title: "넷플릭스 · 왓챠 시리즈",
    rule: "넷플릭스 또는 왓챠에서 볼 수 있는 시리즈 · 최신순",
    domain: "TV",
    kind: "works",
    query: { domain: "TV", platforms: ["Netflix", "Watcha"], releaseTo: today, sortBy: "releaseDate", sortDirection: "desc" },
    moreTo: "/explore?domain=tv&platforms=Netflix,Watcha",
  },
  {
    id: "webtoon-completed",
    title: "완결 웹툰 몰아보기",
    rule: "네이버웹툰 완결작 · 최신순",
    domain: "WEBTOON",
    kind: "works",
    query: { domain: "WEBTOON", status: "완결", sortBy: "releaseDate", sortDirection: "desc" },
    moreTo: "/explore?domain=webtoon&status=%EC%99%84%EA%B2%B0",
  },
  {
    id: "webnovel-ranked",
    title: "오늘 순위에 오른 웹소설",
    rule: "네이버 시리즈 일간 순위 · 순위순",
    domain: "WEBNOVEL",
    kind: "ranking",
    platform: "NaverSeries",
    moreTo: "/trend?hot=webnovel#hot",
  },
];

import type { WorksQueryParams, ReleasesQueryParams } from "../api/workApi";

// 기존 웹 훅의 인라인 키와 요소·순서·타입·중첩 구조가 동일해야 한다.
// 파라미터 정규화(기본값 주입) 금지 — 기본값은 API 함수 내부에서만 적용된다.

export const workKeys = {
  list: (params: WorksQueryParams) => ["works", params] as const,
  detail: (id: number | undefined) => ["work", id] as const,
  search: (keyword: string, params: Omit<WorksQueryParams, "keyword">) =>
    ["works", "search", keyword, params] as const,
  infinite: (params: WorksQueryParams) => ["works-infinite", params] as const,
  recentReviewed: (params: ReleasesQueryParams) =>
    ["works", "recent-reviews", params] as const,
};

export const releaseKeys = {
  recent: (params: ReleasesQueryParams) => ["releases", "recent", params] as const,
  upcoming: (params: ReleasesQueryParams) => ["releases", "upcoming", params] as const,
};

export const metaKeys = {
  genres: (domain?: string) => ["genres", domain] as const,
  genresWithCount: (domain?: string) => ["genres-with-count", domain] as const,
  platforms: (domain?: string) => ["platforms", domain] as const,
};

export const reviewKeys = {
  byContent: (contentId: number) => ["reviews", contentId] as const,
  list: (contentId: number, page: number, size: number) =>
    ["reviews", contentId, page, size] as const,
};

export const interactionKeys = {
  likeStats: (contentId: number) => ["likeStats", contentId] as const,
  bookmarkStatus: (contentId: number) => ["bookmarkStatus", contentId] as const,
};

export const myKeys = {
  reviews: (page: number, size: number) => ["myReviews", page, size] as const,
  bookmarksRoot: () => ["myBookmarks"] as const,
  bookmarks: (page: number, size: number) => ["myBookmarks", page, size] as const,
  likes: (page: number, size: number) => ["myLikes", page, size] as const,
};

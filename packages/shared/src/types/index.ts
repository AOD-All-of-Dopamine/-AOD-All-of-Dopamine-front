// API 응답 타입 정의
export interface WorkSummary {
  id: number;
  domain: string;
  title: string;
  thumbnail: string | null;
  /** 게임 세로 표지(Steam 라이브러리 캡슐 600×900) — 세로 카드 틀용, 없으면 null. 가로 틀은 thumbnail (2026-10-01) */
  portraitThumbnail?: string | null;
  score: number;
  rank?: number;
  rankChange?: string;
  releaseDate?: string;
  /** 마스터 장르 (contents.genres) */
  genres?: string[] | null;
  /** 수집 소스 + OTT (예: ["TMDB_MOVIE", "Netflix"]) */
  platforms?: string[] | null;
  /** 게임=개발사, 웹툰/웹소설=작가, 영화=감독 */
  creator?: string | null;
  /** 웹툰 연재 요일 mon~sun 소문자 (완결작은 빈 문자열 "") */
  weekday?: string | null;
  /** 웹툰 연재 상태 - "연재중" | "완결" */
  status?: string | null;
  /** 웹툰/웹소설 연령 등급 (예: "전체이용가", "12세이용가" - 공백 없음) */
  ageRating?: string | null;
  /** 게임 Steam 평가 desc 영문 (예: "Very Positive") */
  steamReviewDesc?: string | null;
  /** 게임 Steam 긍정 리뷰 % (정수, 예: 94) */
  steamPositivePct?: number | null;
  /** 영화/TV TMDB 평점 (예: 7.4) */
  externalRating?: number | null;
  /** 영화/TV TMDB 투표 수 — 적으면 별점을 숨긴다 (수집 시점 값, 없을 수 있음) */
  externalVoteCount?: number | null;
  /** 게임 Steam 리뷰 수 — 적으면 긍정 %를 숨긴다 */
  steamReviewCount?: number | null;
}

export interface WorkDetail {
  id: number;
  domain: string;
  title: string;
  originalTitle?: string;
  releaseDate?: string; // yyyy-MM-dd format
  thumbnail: string;
  synopsis: string;
  score: number;
  domainInfo: Record<string, any>;
  platformInfo: Record<string, Record<string, any>>;
}

export interface Review {
  id: number;
  author: string;
  score: number;
  content: string;
  createdAt: string;
}

export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}

/** 홈 "오늘의 작품" 근거 — 뽑을 때의 값(그날 안에서 바뀌지 않는다). */
export interface FeaturedReason {
  /** "Steam" | "TMDB_MOVIE" | "TMDB_TV" */
  platform: string;
  /** 그날 랭킹 순위 */
  ranking: number;
  /** "steam" | "tmdb" */
  basis: string;
  /** 게임: 긍정 비율(0~1, 반올림 전) · 영화/시리즈: TMDB 평점 */
  ratingScore?: number | null;
  /** 게임: 리뷰 수 · 영화/시리즈: 투표 수 */
  ratingCount?: number | null;
  /** 게임: Steam 판정 영문 (예: "Very Positive") */
  ratingLabel?: string | null;
}

/** 히어로 그림 (2026-10-03) — 값이 null 일 수 있다. */
export interface FeaturedMedia {
  /** 넓은 배경 (Steam library_hero · TMDB backdrop) */
  backdropUrl?: string | null;
  /** 투명 로고 (PNG) */
  logoUrl?: string | null;
  /** "ko" | "other" */
  logoLang?: string | null;
}

/** 리뷰 한 줄 — 우리 사이트(OURS) 또는 Steam. */
export interface FeaturedQuote {
  source: "OURS" | "STEAM" | string;
  text: string;
  /** STEAM: 작성자 이름(없으면 null) */
  author?: string | null;
  /** STEAM: 도움이 됨 수 */
  votes?: number | null;
  /** STEAM: 리뷰 당시 플레이 시간(시간) */
  hours?: number | null;
  /** OURS: 별점 0~5 */
  rating?: number | null;
  /** STEAM: 원문 주소 */
  url?: string | null;
}

/**
 * GET /api/works/featured-today (200). 204 는 null 로 받는다.
 * 히어로 칸(synopsis · facts · media · quote)은 모두 선택 — 옛 캐시 응답에는 없다.
 */
export interface FeaturedWork {
  /** yyyy-MM-dd — 05:00 KST 에 바뀐다 */
  date: string;
  work: WorkSummary;
  reason: FeaturedReason;
  synopsis?: string | null;
  facts?: { seasons?: number | null; runtimeMinutes?: number | null } | null;
  media?: FeaturedMedia | null;
  quote?: FeaturedQuote | null;
}

export interface ApiError {
  message: string;
  status: number;
}

export * from "./rec";

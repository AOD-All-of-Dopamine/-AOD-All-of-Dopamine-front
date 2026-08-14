// API 응답 타입 정의
export interface WorkSummary {
  id: number;
  domain: string;
  title: string;
  thumbnail: string | null;
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

export interface ApiError {
  message: string;
  status: number;
}

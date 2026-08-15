import { privateApi } from "./client";
import { PageResponse } from "../types/api";

/**
 * 컬렉션 API - 플랜(docs/plans/2026-08-15-collections.md) 계약 + 편차 기록의
 * C-BE 부가 필드(visibility/owner/itemId/createdAt/updatedAt 등)를 그대로 반영.
 * 타입의 진실 원천: back 레포 api/dto/collection/*.java (2026-08-15 대조).
 *
 * 인증: 전 엔드포인트 privateApi 사용 - 인터셉터가 localStorage 토큰이 있을 때만
 * Authorization을 붙이므로 비로그인 열람 표면(목록/상세)도 그대로 동작하고,
 * 로그인 상태에서는 likedByMe가 반영된다. mine/like는 서버가 401로 게이트.
 */

export type CollectionDomain = "MOVIE" | "TV" | "GAME" | "WEBTOON" | "WEBNOVEL";
export type CollectionTint =
  | "PINE"
  | "OLIVE"
  | "SLATE"
  | "TERRACOTTA"
  | "MOCHA"
  | "PLUM";
export type CollectionVisibility = "PUBLIC" | "PRIVATE";

/** 목록 카드 (발견 페이지 / 내 컬렉션 공용) - CollectionSummaryDTO */
export interface CollectionSummary {
  id: number;
  title: string;
  description: string | null;
  domain: string;
  tint: CollectionTint;
  /** 편차(C-BE): 내 컬렉션 "나만 보기" 배지용 */
  visibility: CollectionVisibility;
  likeCount: number;
  viewCount: number;
  itemCount: number;
  curatorNickname: string;
  /** 상위 3개 포스터 URL (조회 시 파생, 빈 배열 가능) */
  coverPosters: string[];
  /** 비로그인 시 항상 false */
  likedByMe: boolean;
  /** 편차(C-BE): LocalDateTime ISO 문자열 */
  createdAt: string;
}

/** 상세의 아이템 한 건 - CollectionItemDTO (WorkSummary 보강 필드 전체 포함) */
export interface CollectionItem {
  /** 편차(C-BE): 아이템 수정/삭제 경로용 */
  itemId: number;
  contentId: number;
  /** 큐레이터 한 줄 코멘트 (없으면 null) */
  comment: string | null;
  position: number;
  title: string;
  posterUrl: string | null;
  releaseDate: string | null;
  domain: string;
  score: number | null;
  /** 도메인별 대표 제작자: 감독/개발사/작가 */
  creator: string | null;
  genres: string[] | null;
  platforms: string[] | null;
  /** 웹툰 연재 요일 mon~sun (완결작은 빈 문자열 가능) */
  weekday: string | null;
  /** 웹툰 연재 상태 */
  status: string | null;
  /** 웹툰/웹소설 연령 등급 */
  ageRating: string | null;
  /** 게임 Steam 평가 desc 영문 */
  steamReviewDesc: string | null;
  /** 게임 Steam 긍정 리뷰 % */
  steamPositivePct: number | null;
  /** 영화/TV TMDB 평점 */
  externalRating: number | null;
}

/** 상세 - CollectionDetailDTO (목록 필드 + owner/updatedAt/items) */
export interface CollectionDetail extends CollectionSummary {
  /** 편차(C-BE): 요청자가 소유자인지 (편집 진입 판단용) */
  owner: boolean;
  /** 편차(C-BE): LocalDateTime ISO 문자열 */
  updatedAt: string;
  items: CollectionItem[];
}

/** 좋아요/취소 응답 - 편차(C-BE): 기존 LikeService Map 관례 */
export interface CollectionLikeResponse {
  collectionId: number;
  liked: boolean;
  likeCount: number;
}

export interface CollectionsQueryParams {
  sort?: "popular" | "latest";
  /** Domain enum명 단수 (MOVIE/TV/GAME/WEBTOON/WEBNOVEL) */
  domain?: string;
  page?: number;
  size?: number;
}

export const collectionApi = {
  /**
   * 공개 컬렉션 목록 (발견 페이지)
   */
  getCollections: async (
    params: CollectionsQueryParams = {},
  ): Promise<PageResponse<CollectionSummary>> => {
    const { data } = await privateApi.get<PageResponse<CollectionSummary>>(
      "/api/collections",
      {
        params: {
          sort: params.sort ?? "popular",
          domain: params.domain,
          page: params.page ?? 0,
          size: params.size ?? 20,
        },
      },
    );
    return data;
  },

  /**
   * 내 컬렉션 목록 (비공개 포함, 로그인 필수)
   */
  getMyCollections: async (
    page = 0,
    size = 20,
  ): Promise<PageResponse<CollectionSummary>> => {
    const { data } = await privateApi.get<PageResponse<CollectionSummary>>(
      "/api/collections/mine",
      {
        params: { page, size },
      },
    );
    return data;
  },

  /**
   * 컬렉션 상세 + 조회수 +1 (PRIVATE는 소유자 외 403, 미존재 404)
   */
  getCollectionDetail: async (id: number): Promise<CollectionDetail> => {
    const { data } = await privateApi.get<CollectionDetail>(
      `/api/collections/${id}`,
    );
    return data;
  },

  /**
   * 좋아요 (멱등, 로그인 필수)
   */
  like: async (id: number): Promise<CollectionLikeResponse> => {
    const { data } = await privateApi.post<CollectionLikeResponse>(
      `/api/collections/${id}/like`,
    );
    return data;
  },

  /**
   * 좋아요 취소 (멱등, 로그인 필수)
   */
  unlike: async (id: number): Promise<CollectionLikeResponse> => {
    const { data } = await privateApi.delete<CollectionLikeResponse>(
      `/api/collections/${id}/like`,
    );
    return data;
  },
};

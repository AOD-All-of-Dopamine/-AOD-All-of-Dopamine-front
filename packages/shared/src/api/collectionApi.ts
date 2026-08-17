import type { AxiosInstance } from "axios";
import type { PageResponse } from "../types";

/**
 * 컬렉션 API - 플랜(docs/plans/2026-08-15-collections.md) 계약 + 편차 기록의
 * C-BE 부가 필드(visibility/owner/itemId/createdAt/updatedAt 등)를 그대로 반영.
 * 타입의 진실 원천: back 레포 api/dto/collection/*.java (2026-08-15 대조).
 *
 * 인증: 전 엔드포인트 privateApi 사용 - 인터셉터가 주입된 getToken이 토큰을 줄
 * 때만 Authorization을 붙이므로 비로그인 열람 표면(목록/상세)도 그대로 동작하고,
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

/** 담기 팝오버용 내 컬렉션 요약 - MyCollectionSummaryDTO */
export interface MyCollectionSummary {
  id: number;
  title: string;
  domain: string;
  tint: CollectionTint;
  visibility: CollectionVisibility;
  itemCount: number;
  /** 조회한 contentId가 이미 담겨 있는지 */
  containsContent: boolean;
}

/** 생성 요청 - CollectionCreateRequest */
export interface CollectionCreateBody {
  /** 필수, 60자 이내 */
  title: string;
  /** 선택, 300자 이내 */
  description?: string;
  /** 필수, Domain enum명 */
  domain: string;
  /** 선택, 기본 PINE */
  tint?: CollectionTint;
  /** 선택, 기본 PUBLIC */
  visibility?: CollectionVisibility;
}

/**
 * 부분 수정 요청 - CollectionUpdateRequest.
 * 미포함(undefined) 필드는 미변경. 편차(C-BE): domain은 변경 불가.
 */
export interface CollectionUpdateBody {
  title?: string;
  description?: string;
  tint?: CollectionTint;
  visibility?: CollectionVisibility;
}

/** 아이템 부분 수정 - null 필드 미변경, comment 빈 문자열은 코멘트 삭제 */
export interface CollectionItemUpdateBody {
  comment?: string;
  /** 편차(C-BE): 직접 설정(주변 시프트 없음) - 재정렬은 reorderItems 사용 */
  position?: number;
}

export interface CollectionsQueryParams {
  sort?: "popular" | "latest";
  /** Domain enum명 단수 (MOVIE/TV/GAME/WEBTOON/WEBNOVEL) */
  domain?: string;
  page?: number;
  size?: number;
}

export function createCollectionApi(privateApi: AxiosInstance) {
  return {
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

  // ========== 소유 표면 (C-FE2) - 전부 로그인 필수(401), 소유자 아님 403 ==========

  /**
   * 담기 팝오버용 - 해당 작품 도메인의 내 컬렉션 + 각각의 포함 여부.
   * 편차(C-BE): 타 도메인 컬렉션은 반환하지 않는다 (담기 불가 - 400).
   */
  getMyCollectionSummaries: async (
    contentId: number,
  ): Promise<MyCollectionSummary[]> => {
    const { data } = await privateApi.get<MyCollectionSummary[]>(
      "/api/collections/mine/summary",
      { params: { contentId } },
    );
    return data;
  },

  /** 컬렉션 생성 - 검증 실패 400 (제목 필수·60자, 설명 300자, domain enum) */
  createCollection: async (
    body: CollectionCreateBody,
  ): Promise<CollectionSummary> => {
    const { data } = await privateApi.post<CollectionSummary>(
      "/api/collections",
      body,
    );
    return data;
  },

  /** 컬렉션 메타 수정 - 미포함 필드 미변경, domain 변경 불가 */
  updateCollection: async (
    id: number,
    body: CollectionUpdateBody,
  ): Promise<CollectionSummary> => {
    const { data } = await privateApi.patch<CollectionSummary>(
      `/api/collections/${id}`,
      body,
    );
    return data;
  },

  /** 컬렉션 삭제 (아이템·좋아요 cascade) */
  deleteCollection: async (id: number): Promise<void> => {
    await privateApi.delete(`/api/collections/${id}`);
  },

  /** 아이템 추가 - 말미 position, 도메인 불일치 400, 중복 409 */
  addItem: async (
    collectionId: number,
    body: { contentId: number; comment?: string },
  ): Promise<CollectionItem> => {
    const { data } = await privateApi.post<CollectionItem>(
      `/api/collections/${collectionId}/items`,
      body,
    );
    return data;
  },

  /** 아이템 수정 (코멘트/위치) */
  updateItem: async (
    collectionId: number,
    itemId: number,
    body: CollectionItemUpdateBody,
  ): Promise<CollectionItem> => {
    const { data } = await privateApi.patch<CollectionItem>(
      `/api/collections/${collectionId}/items/${itemId}`,
      body,
    );
    return data;
  },

  /** 아이템 삭제 */
  deleteItem: async (collectionId: number, itemId: number): Promise<void> => {
    await privateApi.delete(`/api/collections/${collectionId}/items/${itemId}`);
  },

  /**
   * 일괄 재정렬 - itemIds는 컬렉션 전체 아이템과 완전 일치해야 한다
   * (편차 C-BE: 부분 목록은 400)
   */
  reorderItems: async (
    collectionId: number,
    itemIds: number[],
  ): Promise<void> => {
    await privateApi.put(`/api/collections/${collectionId}/items/order`, {
      itemIds,
    });
  },
  };
}

export type CollectionApi = ReturnType<typeof createCollectionApi>;

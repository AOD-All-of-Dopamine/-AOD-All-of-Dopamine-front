import { publicApi } from "./client";
import { PageResponse, WorkSummary, WorkDetail } from "../types/api";

export interface WorksQueryParams {
  domain?: string;
  keyword?: string;
  /** contents.platforms && 겹침 매칭 (다중 OR) */
  platforms?: string[];
  /** contents.genres @> 포함 매칭 (다중 AND) */
  genres?: string[];
  /** contents.release_date 범위 (yyyy-MM-dd) */
  releaseFrom?: string;
  releaseTo?: string;
  /** 웹툰 도메인 컬럼 축 - 웹툰 외 도메인에 보내면 결과가 0건이 되므로 웹툰에서만 사용 */
  status?: string;
  weekdays?: string[];
  ageRatings?: string[];
  page?: number;
  size?: number;
  sortBy?: string;
  sortDirection?: "asc" | "desc";
}

export interface ReleasesQueryParams {
  domain?: string;
  platforms?: string[];
  page?: number;
  size?: number;
}

export const workApi = {
  /**
   * 작품 목록 조회
   */
  getWorks: async (
    params: WorksQueryParams = {},
  ): Promise<PageResponse<WorkSummary>> => {
    const { data } = await publicApi.get<PageResponse<WorkSummary>>(
      "/api/works",
      {
        params: {
          domain: params.domain,
          keyword: params.keyword,
          platforms: params.platforms,
          genres: params.genres,
          releaseFrom: params.releaseFrom,
          releaseTo: params.releaseTo,
          status: params.status,
          weekdays: params.weekdays,
          ageRatings: params.ageRatings,
          page: params.page ?? 0,
          size: params.size ?? 20,
          sortBy: params.sortBy ?? "masterTitle",
          sortDirection: params.sortDirection ?? "asc",
        },
      },
    );
    return data;
  },

  /**
   * 작품 상세 조회
   */
  getWorkDetail: async (id: number): Promise<WorkDetail> => {
    const { data } = await publicApi.get<WorkDetail>(`/api/works/${id}`);
    return data;
  },

  /**
   * 최근 출시작 조회 (신작)
   */
  getRecentReleases: async (
    params: ReleasesQueryParams = {},
  ): Promise<PageResponse<WorkSummary>> => {
    const { data } = await publicApi.get<PageResponse<WorkSummary>>(
      "/api/works/releases/recent",
      {
        params: {
          domain: params.domain,
          platforms: params.platforms,
          page: params.page ?? 0,
          size: params.size ?? 20,
        },
      },
    );
    return data;
  },

  /**
   * [✨ 신규 기능] 최근 리뷰가 달린 작품 조회
   * (기존에는 신작 조회 API를 잘못 쓰고 있었음 -> 신규 API 연동)
   */
  getRecentReviewedWorks: async (
    params: ReleasesQueryParams = {},
  ): Promise<PageResponse<WorkSummary>> => {
    const { data } = await publicApi.get<PageResponse<WorkSummary>>(
      "/api/works/recent-reviews",
      {
        params: {
          domain: params.domain,
          platforms: params.platforms,
          page: params.page ?? 0,
          size: params.size ?? 20,
        },
      },
    );
    return data;
  },

  /**
   * 출시 예정작 조회
   */
  getUpcomingReleases: async (
    params: ReleasesQueryParams = {},
  ): Promise<PageResponse<WorkSummary>> => {
    const { data } = await publicApi.get<PageResponse<WorkSummary>>(
      "/api/works/releases/upcoming",
      {
        params: {
          domain: params.domain,
          platforms: params.platforms,
          page: params.page ?? 0,
          size: params.size ?? 20,
        },
      },
    );
    return data;
  },

  /**
   * 도메인별 사용 가능한 장르 목록 조회
   */
  getGenres: async (domain?: string): Promise<string[]> => {
    const { data } = await publicApi.get<string[]>("/api/works/genres", {
      params: domain ? { domain } : {},
    });
    return data;
  },

  /**
   * 도메인별 장르별 작품 수 조회 (작품 수 내림차순)
   */
  getGenresWithCount: async (
    domain?: string,
  ): Promise<Record<string, number>> => {
    const { data } = await publicApi.get<Record<string, number>>(
      "/api/works/genres-with-count",
      {
        params: domain ? { domain } : {},
      },
    );
    return data;
  },

  /**
   * 도메인별 사용 가능한 플랫폼 목록 조회
   */
  getPlatforms: async (domain?: string): Promise<string[]> => {
    const { data } = await publicApi.get<string[]>("/api/works/platforms", {
      params: domain ? { domain } : {},
    });
    return data;
  },
};

import apiClient from './client'
import { PageResponse, WorkSummary, WorkDetail } from '../types/api'

export interface WorksQueryParams {
  domain?: string
  keyword?: string
  platforms?: string[]
  genres?: string[]
  page?: number
  size?: number
  sortBy?: string
  sortDirection?: 'asc' | 'desc'
}

export interface ReleasesQueryParams {
  domain?: string
  platforms?: string[]
  page?: number
  size?: number
}

export const workApi = {
  /**
   * 작품 목록 조회
   */
  getWorks: async (params: WorksQueryParams = {}): Promise<PageResponse<WorkSummary>> => {
    const { data } = await apiClient.get<PageResponse<WorkSummary>>('/api/works', {
      params: {
        domain: params.domain,
        keyword: params.keyword,
        platforms: params.platforms,
        genres: params.genres,
        page: params.page ?? 0,
        size: params.size ?? 20,
        sortBy: params.sortBy ?? 'masterTitle',
        sortDirection: params.sortDirection ?? 'asc',
      },
    })
    return data
  },

  /**
   * 작품 상세 조회
   */
  getWorkDetail: async (id: number): Promise<WorkDetail> => {
    const { data } = await apiClient.get<WorkDetail>(`/api/works/${id}`)
    return data
  },

  /**
   * 최근 출시작 조회 (신작)
   */
  getRecentReleases: async (params: ReleasesQueryParams = {}): Promise<PageResponse<WorkSummary>> => {
    const { data } = await apiClient.get<PageResponse<WorkSummary>>('/api/works/releases/recent', {
      params: {
        domain: params.domain,
        platforms: params.platforms,
        page: params.page ?? 0,
        size: params.size ?? 20,
      },
    })
    return data
  },

  /**
   * 출시 예정작 조회
   */
  getUpcomingReleases: async (params: ReleasesQueryParams = {}): Promise<PageResponse<WorkSummary>> => {
    const { data } = await apiClient.get<PageResponse<WorkSummary>>('/api/works/releases/upcoming', {
      params: {
        domain: params.domain,
        platforms: params.platforms,
        page: params.page ?? 0,
        size: params.size ?? 20,
      },
    })
    return data
  },

  /**
   * 도메인별 사용 가능한 장르 목록 조회
   */
  getGenres: async (domain?: string): Promise<string[]> => {
    const { data } = await apiClient.get<string[]>('/api/works/genres', {
      params: domain ? { domain } : {},
    })
    return data
  },

  /**
   * 도메인별 장르별 작품 수 조회 (작품 수 내림차순)
   */
  getGenresWithCount: async (domain?: string): Promise<Record<string, number>> => {
    const { data } = await apiClient.get<Record<string, number>>('/api/works/genres-with-count', {
      params: domain ? { domain } : {},
    })
    return data
  },

  /**
   * 도메인별 사용 가능한 플랫폼 목록 조회
   */
  getPlatforms: async (domain?: string): Promise<string[]> => {
    const { data } = await apiClient.get<string[]>('/api/works/platforms', {
      params: domain ? { domain } : {},
    })
    return data
  },
}

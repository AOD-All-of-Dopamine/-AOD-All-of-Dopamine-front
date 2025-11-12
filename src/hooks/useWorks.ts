import { useQuery, UseQueryOptions } from '@tanstack/react-query'
import { workApi, WorksQueryParams, ReleasesQueryParams } from '../api/workApi'
import { PageResponse, WorkSummary, WorkDetail } from '../types/api'

/**
 * 작품 목록 조회 hook
 */
export const useWorks = (
  params: WorksQueryParams = {},
  options?: Omit<UseQueryOptions<PageResponse<WorkSummary>>, 'queryKey' | 'queryFn'>
) => {
  return useQuery<PageResponse<WorkSummary>>({
    queryKey: ['works', params],
    queryFn: () => workApi.getWorks(params),
    ...options,
  })
}

/**
 * 작품 상세 조회 hook
 */
export const useWorkDetail = (
  id: number | undefined,
  options?: Omit<UseQueryOptions<WorkDetail>, 'queryKey' | 'queryFn'>
) => {
  return useQuery<WorkDetail>({
    queryKey: ['work', id],
    queryFn: () => workApi.getWorkDetail(id!),
    enabled: !!id,
    ...options,
  })
}

/**
 * 최근 출시작 조회 hook (신작)
 */
export const useRecentReleases = (
  params: ReleasesQueryParams = {},
  options?: Omit<UseQueryOptions<PageResponse<WorkSummary>>, 'queryKey' | 'queryFn'>
) => {
  return useQuery<PageResponse<WorkSummary>>({
    queryKey: ['releases', 'recent', params],
    queryFn: () => workApi.getRecentReleases(params),
    ...options,
  })
}

/**
 * 출시 예정작 조회 hook
 */
export const useUpcomingReleases = (
  params: ReleasesQueryParams = {},
  options?: Omit<UseQueryOptions<PageResponse<WorkSummary>>, 'queryKey' | 'queryFn'>
) => {
  return useQuery<PageResponse<WorkSummary>>({
    queryKey: ['releases', 'upcoming', params],
    queryFn: () => workApi.getUpcomingReleases(params),
    ...options,
  })
}

/**
 * 장르 목록 조회 hook
 */
export const useGenres = (
  domain?: string,
  options?: Omit<UseQueryOptions<string[]>, 'queryKey' | 'queryFn'>
) => {
  return useQuery<string[]>({
    queryKey: ['genres', domain],
    queryFn: () => workApi.getGenres(domain),
    ...options,
  })
}

/**
 * 플랫폼 목록 조회 hook
 */
export const usePlatforms = (
  domain?: string,
  options?: Omit<UseQueryOptions<string[]>, 'queryKey' | 'queryFn'>
) => {
  return useQuery<string[]>({
    queryKey: ['platforms', domain],
    queryFn: () => workApi.getPlatforms(domain),
    ...options,
  })
}

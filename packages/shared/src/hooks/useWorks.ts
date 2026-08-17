import {
  useQuery,
  UseQueryOptions,
  keepPreviousData,
  useInfiniteQuery,
} from "@tanstack/react-query";
import type { WorksQueryParams, ReleasesQueryParams } from "../api/workApi";
import type { PageResponse, WorkSummary, WorkDetail } from "../types";
import { useApis } from "./ApiProvider";
import { workKeys, releaseKeys, metaKeys } from "../queries/keys";

/**
 * 작품 목록 조회 hook
 *
 * queryKey는 params 객체 전체를 그대로 포함하므로 releaseFrom/To, status,
 * weekdays, ageRatings 등 WorksQueryParams의 모든 필터 축이 캐시 키에 반영된다.
 * (undefined 값은 react-query 해시에서 일관되게 탈락하므로 키 안정성 유지)
 */
export const useWorks = (
  params: WorksQueryParams = {},
  options?: Omit<
    UseQueryOptions<PageResponse<WorkSummary>>,
    "queryKey" | "queryFn"
  >,
) => {
  const { workApi } = useApis();
  return useQuery<PageResponse<WorkSummary>>({
    queryKey: workKeys.list(params),
    queryFn: () => workApi.getWorks(params),
    ...options,
  });
};

/**
 * 작품 상세 조회 hook
 */
export const useWorkDetail = (
  id: number | undefined,
  options?: Omit<UseQueryOptions<WorkDetail>, "queryKey" | "queryFn">,
) => {
  const { workApi } = useApis();
  return useQuery<WorkDetail>({
    queryKey: workKeys.detail(id),
    queryFn: () => workApi.getWorkDetail(id!),
    enabled: !!id,
    ...options,
  });
};

/**
 * 최근 출시작 조회 hook (신작)
 */
export const useRecentReleases = (
  params: ReleasesQueryParams = {},
  options?: Omit<
    UseQueryOptions<PageResponse<WorkSummary>>,
    "queryKey" | "queryFn"
  >,
) => {
  const { workApi } = useApis();
  return useQuery<PageResponse<WorkSummary>>({
    queryKey: releaseKeys.recent(params),
    queryFn: () => workApi.getRecentReleases(params),
    ...options,
  });
};

/**
 * 최근 리뷰가 남은 작품 조회 hook
 */
export const useRecentReviewedWorks = (
  params: ReleasesQueryParams = {},
  options?: Omit<
    UseQueryOptions<PageResponse<WorkSummary>>,
    "queryKey" | "queryFn"
  >,
) => {
  const { workApi } = useApis();
  return useQuery<PageResponse<WorkSummary>>({
    queryKey: workKeys.recentReviewed(params),
    queryFn: () => workApi.getRecentReviewedWorks(params),
    ...options,
  });
};

/**
 * 출시 예정작 조회 hook
 */
export const useUpcomingReleases = (
  params: ReleasesQueryParams = {},
  options?: Omit<
    UseQueryOptions<PageResponse<WorkSummary>>,
    "queryKey" | "queryFn"
  >,
) => {
  const { workApi } = useApis();
  return useQuery<PageResponse<WorkSummary>>({
    queryKey: releaseKeys.upcoming(params),
    queryFn: () => workApi.getUpcomingReleases(params),
    ...options,
  });
};

/**
 * 장르 목록 조회 hook
 */
export const useGenres = (
  domain?: string,
  options?: Omit<UseQueryOptions<string[]>, "queryKey" | "queryFn">,
) => {
  const { workApi } = useApis();
  return useQuery<string[]>({
    queryKey: metaKeys.genres(domain),
    queryFn: () => workApi.getGenres(domain),
    ...options,
  });
};

/**
 * 장르별 작품 수 조회 hook (작품 수 기준 내림차순 정렬)
 */
export const useGenresWithCount = (
  domain?: string,
  options?: Omit<
    UseQueryOptions<Record<string, number>>,
    "queryKey" | "queryFn"
  >,
) => {
  const { workApi } = useApis();
  return useQuery<Record<string, number>>({
    queryKey: metaKeys.genresWithCount(domain),
    queryFn: () => workApi.getGenresWithCount(domain),
    ...options,
  });
};

/**
 * 플랫폼 목록 조회 hook
 */
export const usePlatforms = (
  domain?: string,
  options?: Omit<UseQueryOptions<string[]>, "queryKey" | "queryFn">,
) => {
  const { workApi } = useApis();
  return useQuery<string[]>({
    queryKey: metaKeys.platforms(domain),
    queryFn: () => workApi.getPlatforms(domain),
    ...options,
  });
};

/**
 * 작품 통합 검색 hook
 */
export const useSearchWorks = (
  keyword: string,
  params: Omit<WorksQueryParams, "keyword"> = {},
  options?: Omit<
    UseQueryOptions<PageResponse<WorkSummary>>,
    "queryKey" | "queryFn"
  >,
) => {
  const { workApi } = useApis();
  return useQuery<PageResponse<WorkSummary>>({
    queryKey: workKeys.search(keyword, params),
    queryFn: () =>
      workApi.getWorks({
        ...params,
        keyword, // ⭐ 여기서 keyword만 추가
      }),
    enabled: keyword.trim().length > 0, // 검색어 있을 때만 실행
    placeholderData: keepPreviousData,
    ...options,
  });
};

export function useInfiniteWorks(params: WorksQueryParams) {
  const { workApi } = useApis();
  return useInfiniteQuery<PageResponse<WorkSummary>>({
    queryKey: workKeys.infinite(params),
    queryFn: ({ pageParam = 0 }) =>
      workApi.getWorks({
        ...params,
        page: pageParam as number,
        size: params.size ?? 20,
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => {
      if (lastPage.last) return undefined;
      return lastPage.page + 1;
    },
  });
}

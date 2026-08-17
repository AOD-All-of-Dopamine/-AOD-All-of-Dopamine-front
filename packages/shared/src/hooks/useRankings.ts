import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import type { ExternalRanking } from "../api/rankingApi";
import { useApis } from "./ApiProvider";
import { rankingKeys } from "../queries/keys";

/**
 * 외부 랭킹 전체 조회 hook (전 플랫폼 통합 목록)
 */
export const useAllRankings = (
  options?: Omit<UseQueryOptions<ExternalRanking[]>, "queryKey" | "queryFn">,
) => {
  const { rankingApi } = useApis();
  return useQuery<ExternalRanking[]>({
    queryKey: rankingKeys.all(),
    queryFn: () => rankingApi.getAllRankings(),
    ...options,
  });
};

/**
 * 플랫폼별 외부 랭킹 조회 hook
 * platform: NaverWebtoon | NaverSeries | Steam | TMDB_MOVIE | TMDB_TV
 */
export const usePlatformRankings = (
  platform: string,
  options?: Omit<UseQueryOptions<ExternalRanking[]>, "queryKey" | "queryFn">,
) => {
  const { rankingApi } = useApis();
  return useQuery<ExternalRanking[]>({
    queryKey: rankingKeys.platform(platform),
    queryFn: () => rankingApi.getRankingsByPlatform(platform),
    enabled: !!platform,
    ...options,
  });
};

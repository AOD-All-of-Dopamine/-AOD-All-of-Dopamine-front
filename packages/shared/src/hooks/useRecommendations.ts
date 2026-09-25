import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { interactionKeys, myKeys, recKeys } from "../queries/keys";
import { nextChainParam } from "../rec/recList";
import type { RecRequestContext } from "../tracking/types";
import type {
  NotInterestedResult,
  ReactionResult,
  ReactionState,
  RecResponse,
  RecTab,
} from "../types";
import { useApis } from "./ApiProvider";

/** 추천 캐시 수명 — 상세에 갔다 돌아오는 동안 살아 있어야 한다 (설계 §4). */
export const REC_GC_TIME_MS = 30 * 60 * 1000;

export interface UseRecommendationsOptions {
  /** 이 세션에서 이미 열어 둔 체인. 없으면 null 로 두고 새 체인을 연다. */
  initialChainId?: string | null;
  size?: number;
  enabled?: boolean;
  /** 요청을 보낸 화면 (RecListParams.surface). 추천 탭은 넘기지 않는다. */
  surface?: string;
}

/**
 * 칩 하나의 추천 목록 (설계 §4).
 * **이 쿼리만** staleTime 무한 · gcTime 30분 · 포커스/재연결/마운트 재조회 없음 · 재시도 없음 —
 * 추천은 매번 다른 결과를 주므로 자동 재조회가 목록을 바꿔 버리면 안 되고,
 * 404 는 재시도가 아니라 새 체인(nonce 교체)으로 풀어야 한다.
 */
export function useRecommendations(
  tab: RecTab,
  chainNonce: string,
  options: UseRecommendationsOptions = {},
) {
  const { recApi } = useApis();
  const { initialChainId = null, size, enabled = true, surface } = options;

  return useInfiniteQuery({
    queryKey: recKeys.list(tab, chainNonce),
    queryFn: ({ pageParam }) => recApi.list({ tab, chainId: pageParam, size, surface }),
    initialPageParam: initialChainId,
    getNextPageParam: (lastPage: RecResponse) => nextChainParam(lastPage),
    enabled,
    staleTime: Infinity,
    gcTime: REC_GC_TIME_MS,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    retry: false,
  });
}

export interface SetReactionVars {
  contentId: number;
  state: ReactionState;
  rec?: RecRequestContext;
}

/**
 * 반응 상태 지정 (LIKE·DISLIKE·NONE). 토글이 아니므로 되돌리기가 단순하다.
 * 추천 목록은 일부러 무효화하지 않는다 — 보이는 목록은 다시 받지 않는다(설계 §3).
 */
export function useSetReaction() {
  const { recApi } = useApis();
  const queryClient = useQueryClient();

  return useMutation<ReactionResult, Error, SetReactionVars>({
    mutationFn: ({ contentId, state, rec }) => recApi.setReaction(contentId, state, rec),
    onSuccess: (_result, { contentId }) => {
      queryClient.invalidateQueries({ queryKey: interactionKeys.likeStats(contentId) });
      queryClient.invalidateQueries({ queryKey: myKeys.likesRoot() });
    },
  });
}

export interface SetNotInterestedVars {
  contentId: number;
  on: boolean;
  rec?: RecRequestContext;
}

export function useSetNotInterested() {
  const { recApi } = useApis();

  return useMutation<NotInterestedResult, Error, SetNotInterestedVars>({
    mutationFn: ({ contentId, on, rec }) => recApi.setNotInterested(contentId, on, rec),
  });
}

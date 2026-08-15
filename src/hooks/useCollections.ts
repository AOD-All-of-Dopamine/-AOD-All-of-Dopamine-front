import {
  useMutation,
  useQuery,
  useQueryClient,
  UseQueryOptions,
} from "@tanstack/react-query";
import {
  collectionApi,
  CollectionDetail,
  CollectionSummary,
  CollectionsQueryParams,
} from "../api/collectionApi";
import { PageResponse } from "../types/api";

/**
 * 공개 컬렉션 목록 조회 (발견 페이지)
 */
export const useCollections = (
  params: CollectionsQueryParams = {},
  options?: Omit<
    UseQueryOptions<PageResponse<CollectionSummary>>,
    "queryKey" | "queryFn"
  >,
) => {
  return useQuery<PageResponse<CollectionSummary>>({
    queryKey: ["collections", "public", params],
    queryFn: () => collectionApi.getCollections(params),
    ...options,
  });
};

/**
 * 내 컬렉션 목록 (비공개 포함) - 비로그인에서는 enabled로 발사를 막는다 (401 방지)
 */
export const useMyCollections = (page = 0, size = 20, enabled = true) => {
  return useQuery<PageResponse<CollectionSummary>>({
    queryKey: ["collections", "mine", page, size],
    queryFn: () => collectionApi.getMyCollections(page, size),
    enabled,
  });
};

/**
 * 컬렉션 상세 조회.
 * 서버가 GET마다 조회수를 +1 하므로(중복 방지 없음 - 플랜 문서화 한계),
 * 전역 기본값(refetchOnWindowFocus: false, staleTime 5분)에 기대어
 * 불필요한 재조회로 조회수가 부풀지 않게 둔다.
 */
export const useCollectionDetail = (
  id: number | undefined,
  options?: Omit<UseQueryOptions<CollectionDetail>, "queryKey" | "queryFn">,
) => {
  return useQuery<CollectionDetail>({
    queryKey: ["collection", id],
    queryFn: () => collectionApi.getCollectionDetail(id!),
    enabled: !!id && Number.isFinite(id),
    ...options,
  });
};

/**
 * 컬렉션 좋아요/취소 토글 (멱등 API 2종을 현재 상태로 분기).
 * 옵티미스틱 ±1: 상세 캐시의 likedByMe/likeCount를 즉시 전이하고 실패 시 롤백.
 * 성공 시 상세는 서버 응답값으로 직접 보정한다 - 상세 쿼리를 invalidate하면
 * 재조회가 조회수를 또 +1 시키므로 의도적으로 invalidate하지 않는다.
 * 목록 캐시(["collections", ...])는 조회수 부작용이 없어 invalidate로 동기화.
 */
export const useToggleCollectionLike = (collectionId: number) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (currentlyLiked: boolean) =>
      currentlyLiked
        ? collectionApi.unlike(collectionId)
        : collectionApi.like(collectionId),

    onMutate: async (currentlyLiked) => {
      await queryClient.cancelQueries({
        queryKey: ["collection", collectionId],
      });

      const previous = queryClient.getQueryData<CollectionDetail>([
        "collection",
        collectionId,
      ]);

      queryClient.setQueryData<CollectionDetail>(
        ["collection", collectionId],
        (old) =>
          old
            ? {
                ...old,
                likedByMe: !currentlyLiked,
                likeCount: Math.max(
                  0,
                  old.likeCount + (currentlyLiked ? -1 : 1),
                ),
              }
            : old,
      );

      return { previous };
    },

    onError: (_err, _var, context) => {
      if (context?.previous) {
        queryClient.setQueryData(
          ["collection", collectionId],
          context.previous,
        );
      }
    },

    onSuccess: (res) => {
      queryClient.setQueryData<CollectionDetail>(
        ["collection", collectionId],
        (old) =>
          old ? { ...old, likedByMe: res.liked, likeCount: res.likeCount } : old,
      );
      queryClient.invalidateQueries({ queryKey: ["collections"] });
    },
  });
};

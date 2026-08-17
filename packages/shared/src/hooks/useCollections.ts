import {
  useMutation,
  useQuery,
  useQueryClient,
  UseQueryOptions,
} from "@tanstack/react-query";
import axios from "axios";
import type {
  CollectionCreateBody,
  CollectionDetail,
  CollectionSummary,
  CollectionsQueryParams,
  MyCollectionSummary,
} from "../api/collectionApi";
import type { PageResponse } from "../types";
import { useApis } from "./ApiProvider";
import { collectionKeys } from "../queries/keys";

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
  const { collectionApi } = useApis();
  return useQuery<PageResponse<CollectionSummary>>({
    queryKey: collectionKeys.publicList(params),
    queryFn: () => collectionApi.getCollections(params),
    ...options,
  });
};

/**
 * 내 컬렉션 목록 (비공개 포함) - 비로그인에서는 enabled로 발사를 막는다 (401 방지)
 */
export const useMyCollections = (page = 0, size = 20, enabled = true) => {
  const { collectionApi } = useApis();
  return useQuery<PageResponse<CollectionSummary>>({
    queryKey: collectionKeys.mine(page, size),
    queryFn: () => collectionApi.getMyCollections(page, size),
    enabled,
  });
};

/**
 * 컬렉션 상세 조회.
 * 서버가 GET마다 조회수를 +1 하므로(중복 방지 없음 - 플랜 문서화 한계),
 * 전역 기본값(refetchOnWindowFocus: false, staleTime 5분)에 기대어
 * 불필요한 재조회로 조회수가 부풀지 않게 둔다.
 * retry: 4xx(403 비공개·404 미존재 등)는 재시도해도 결과가 같으므로 즉시
 * 포기해 에러 화면을 바로 띄운다 - 기본 3회 재시도는 5xx·네트워크 오류만.
 */
export const useCollectionDetail = (
  id: number | undefined,
  options?: Omit<UseQueryOptions<CollectionDetail>, "queryKey" | "queryFn">,
) => {
  const { collectionApi } = useApis();
  return useQuery<CollectionDetail>({
    queryKey: collectionKeys.detail(id),
    queryFn: () => collectionApi.getCollectionDetail(id!),
    enabled: !!id && Number.isFinite(id),
    retry: (failureCount, error) => {
      const status = axios.isAxiosError(error)
        ? error.response?.status
        : undefined;
      if (status !== undefined && status >= 400 && status < 500) return false;
      return failureCount < 3;
    },
    ...options,
  });
};

/**
 * 컬렉션 좋아요/취소 토글 (멱등 API 2종을 현재 상태로 분기).
 * 옵티미스틱 ±1: 상세 캐시의 likedByMe/likeCount를 즉시 전이하고 실패 시 롤백.
 * 성공 시 상세는 서버 응답값으로 직접 보정한다 - 상세 쿼리를 invalidate하면
 * 재조회가 조회수를 또 +1 시키므로 의도적으로 invalidate하지 않는다.
 * 목록 캐시(["collections", ...])는 조회수 부작용이 없어 invalidate로 동기화.
 * 실패 안내(토스트 등)는 호출부의 mutate 콜백 몫 - 훅은 롤백만 담당한다.
 */
export const useToggleCollectionLike = (collectionId: number) => {
  const { collectionApi } = useApis();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (currentlyLiked: boolean) =>
      currentlyLiked
        ? collectionApi.unlike(collectionId)
        : collectionApi.like(collectionId),

    onMutate: async (currentlyLiked) => {
      await queryClient.cancelQueries({
        queryKey: collectionKeys.detail(collectionId),
      });

      const previous = queryClient.getQueryData<CollectionDetail>(
        collectionKeys.detail(collectionId),
      );

      queryClient.setQueryData<CollectionDetail>(
        collectionKeys.detail(collectionId),
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
          collectionKeys.detail(collectionId),
          context.previous,
        );
      }
    },

    onSuccess: (res) => {
      queryClient.setQueryData<CollectionDetail>(
        collectionKeys.detail(collectionId),
        (old) =>
          old ? { ...old, likedByMe: res.liked, likeCount: res.likeCount } : old,
      );
      queryClient.invalidateQueries({ queryKey: collectionKeys.root() });
    },
  });
};

// ========== 소유 표면 (C-FE2) ==========

/**
 * 담기 팝오버용 - 해당 작품 도메인의 내 컬렉션 + 포함 여부.
 * enabled로 발사 제어 (메뉴 열림 + 로그인 시에만).
 */
export const useMyCollectionSummaries = (contentId: number, enabled = true) => {
  const { collectionApi } = useApis();
  return useQuery<MyCollectionSummary[]>({
    queryKey: collectionKeys.mineSummary(contentId),
    queryFn: () => collectionApi.getMyCollectionSummaries(contentId),
    enabled: enabled && !!contentId,
  });
};

/** 컬렉션 생성 - 성공 시 목록·요약 캐시 무효화 (["collections"] 전체) */
export const useCreateCollection = () => {
  const { collectionApi } = useApis();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CollectionCreateBody) =>
      collectionApi.createCollection(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: collectionKeys.root() });
    },
  });
};

/** 컬렉션 삭제 - 상세 캐시 제거 + 목록·요약 캐시 무효화 */
export const useDeleteCollection = () => {
  const { collectionApi } = useApis();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (collectionId: number) =>
      collectionApi.deleteCollection(collectionId),
    onSuccess: (_res, collectionId) => {
      queryClient.removeQueries({
        queryKey: collectionKeys.detail(collectionId),
      });
      queryClient.invalidateQueries({ queryKey: collectionKeys.root() });
    },
  });
};

/**
 * 담기 성공 후 캐시 동기화 공용 - mine-summary는 직접 갱신, 목록은 무효화.
 * countDelta: 실제 추가/삭제가 일어났을 때만 ±1 (이미 빠져 있던 멱등 케이스는 0)
 */
const syncContainment = (
  queryClient: ReturnType<typeof useQueryClient>,
  contentId: number,
  collectionId: number,
  contains: boolean,
  countDelta: number,
) => {
  queryClient.setQueryData<MyCollectionSummary[]>(
    collectionKeys.mineSummary(contentId),
    (old) =>
      old?.map((s) =>
        s.id === collectionId
          ? {
              ...s,
              containsContent: contains,
              itemCount: Math.max(0, s.itemCount + countDelta),
            }
          : s,
      ),
  );
  // 목록 카드(itemCount·커버)만 무효화 - mine-summary는 위에서 이미 동기화됨
  queryClient.invalidateQueries({ queryKey: collectionKeys.publicRoot() });
  queryClient.invalidateQueries({ queryKey: collectionKeys.mineRoot() });
};

/**
 * 담기 (작품 -> 컬렉션). 성공 시 상세 캐시에 아이템을 말미 추가하고
 * mine-summary의 포함 여부를 직접 전이한다. 409(이미 담김)는 호출부에서
 * isAlreadyInCollectionError로 판별해 포함 상태 동기화에 쓴다.
 */
export const useAddCollectionItem = (contentId: number) => {
  const { collectionApi } = useApis();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      collectionId,
      comment,
    }: {
      collectionId: number;
      comment?: string;
    }) => collectionApi.addItem(collectionId, { contentId, comment }),
    onSuccess: (item, { collectionId }) => {
      queryClient.setQueryData<CollectionDetail>(
        collectionKeys.detail(collectionId),
        (old) =>
          old
            ? {
                ...old,
                itemCount: old.itemCount + 1,
                items: [...old.items, item],
              }
            : old,
      );
      syncContainment(queryClient, contentId, collectionId, true, 1);
    },
  });
};

/** 409(이미 컬렉션에 담긴 작품) 판별 */
export const isAlreadyInCollectionError = (error: unknown): boolean =>
  axios.isAxiosError(error) && error.response?.status === 409;

/**
 * 빼기 (컬렉션에서 작품 제거).
 * 편차: mine/summary 계약에 itemId가 없어 상세를 조회해 itemId를 해석한다 -
 * 캐시된 상세가 있으면 재사용, 없으면 1회 조회(조회수 +1 부작용, 백로그 기록).
 * 이미 빠져 있으면(미발견·404) 멱등 성공 처리.
 */
export const useRemoveCollectionItem = (contentId: number) => {
  const { collectionApi } = useApis();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ collectionId }: { collectionId: number }) => {
      const cached = queryClient.getQueryData<CollectionDetail>(
        collectionKeys.detail(collectionId),
      );
      let item = cached?.items.find((i) => i.contentId === contentId);
      if (!item) {
        const fetched = await queryClient.fetchQuery<CollectionDetail>({
          queryKey: collectionKeys.detail(collectionId),
          queryFn: () => collectionApi.getCollectionDetail(collectionId),
          staleTime: 0,
        });
        item = fetched.items.find((i) => i.contentId === contentId);
      }
      if (!item) return false; // 이미 빠져 있음 - 삭제 없음
      try {
        await collectionApi.deleteItem(collectionId, item.itemId);
      } catch (error) {
        if (!(axios.isAxiosError(error) && error.response?.status === 404)) {
          throw error;
        }
      }
      return true;
    },
    onSuccess: (deleted, { collectionId }) => {
      // 실제 삭제된 경우에만 상세 아이템/카운트 보정 - 미발견 멱등 케이스에서
      // 카운트가 -1로 어긋나지 않게 한다
      if (deleted) {
        queryClient.setQueryData<CollectionDetail>(
          collectionKeys.detail(collectionId),
          (old) =>
            old
              ? {
                  ...old,
                  itemCount: Math.max(0, old.itemCount - 1),
                  items: old.items.filter((i) => i.contentId !== contentId),
                }
              : old,
        );
      }
      syncContainment(
        queryClient,
        contentId,
        collectionId,
        false,
        deleted ? -1 : 0,
      );
    },
  });
};

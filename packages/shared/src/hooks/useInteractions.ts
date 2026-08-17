import {
  useQuery,
  useMutation,
  useQueryClient,
  UseQueryOptions,
} from "@tanstack/react-query";
import type { ReviewRequest, Review, LikeStats } from "../api/interactionApi";
import type { PageResponse } from "../types";
import { useApis } from "./ApiProvider";
import { reviewKeys, interactionKeys, myKeys, workKeys } from "../queries/keys";

/**
 * 리뷰 목록 조회
 * options는 하위호환용 optional - placeholderData(keepPreviousData) 등 전달 경로
 */
export const useReviews = (
  contentId: number,
  page = 0,
  size = 20,
  options?: Omit<
    UseQueryOptions<PageResponse<Review>>,
    "queryKey" | "queryFn"
  >,
) => {
  const { reviewApi } = useApis();
  return useQuery<PageResponse<Review>>({
    queryKey: reviewKeys.list(contentId, page, size),
    queryFn: () => reviewApi.getReviews(contentId, page, size),
    enabled: !!contentId,
    ...options,
  });
};

/**
 * 리뷰 작성
 */
export const useCreateReview = (contentId: number) => {
  const { reviewApi } = useApis();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (reviewData: ReviewRequest) =>
      reviewApi.createReview(contentId, reviewData),
    onSuccess: () => {
      // 리뷰 목록 + 내 리뷰 목록/카운트 + 작품 평점 갱신
      queryClient.invalidateQueries({ queryKey: reviewKeys.byContent(contentId) });
      queryClient.invalidateQueries({ queryKey: myKeys.reviewsRoot() });
      queryClient.invalidateQueries({ queryKey: workKeys.detail(contentId) });
    },
  });
};

/**
 * 리뷰 수정
 */
export const useUpdateReview = (contentId: number) => {
  const { reviewApi } = useApis();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      reviewId,
      reviewData,
    }: {
      reviewId: number;
      reviewData: ReviewRequest;
    }) => reviewApi.updateReview(reviewId, reviewData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reviewKeys.byContent(contentId) });
    },
  });
};

/**
 * 리뷰 삭제
 */
export const useDeleteReview = (contentId: number) => {
  const { reviewApi } = useApis();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (reviewId: number) => reviewApi.deleteReview(reviewId),
    onSuccess: () => {
      // 내 리뷰 화면(my-reviews)은 contentId를 모른 채 0을 넘기므로
      // myReviews 전체 무효화가 없으면 삭제 후 목록이 갱신되지 않는다.
      queryClient.invalidateQueries({ queryKey: reviewKeys.byContent(contentId) });
      queryClient.invalidateQueries({ queryKey: myKeys.reviewsRoot() });
    },
  });
};

/**
 * 좋아요/싫어요 통계
 */
export const useLikeStats = (contentId: number) => {
  const { interactionApi } = useApis();
  return useQuery<LikeStats>({
    queryKey: interactionKeys.likeStats(contentId),
    queryFn: () => interactionApi.getLikeStats(contentId),
    enabled: !!contentId,
  });
};

/**
 * 좋아요 토글
 * 옵티미스틱 전이는 서버 LikeService.toggleLikeType과 동일:
 * LIKE -> NONE(해제), DISLIKE -> LIKE(전환), NONE -> LIKE(생성)
 */
export const useToggleLike = (contentId: number) => {
  const { interactionApi } = useApis();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => interactionApi.toggleLike(contentId),

    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: interactionKeys.likeStats(contentId) });

      const previous = queryClient.getQueryData<LikeStats>(
        interactionKeys.likeStats(contentId),
      );

      queryClient.setQueryData<LikeStats>(
        interactionKeys.likeStats(contentId),
        (old) => {
        if (!old) return old;
        if (old.userLikeType === "LIKE") {
          return {
            ...old,
            userLikeType: "NONE",
            likeCount: Math.max(0, old.likeCount - 1),
          };
        }
        return {
          ...old,
          userLikeType: "LIKE",
          likeCount: old.likeCount + 1,
          dislikeCount:
            old.userLikeType === "DISLIKE"
              ? Math.max(0, old.dislikeCount - 1)
              : old.dislikeCount,
        };
      });

      return { previous };
    },

    onError: (_err, _var, context) => {
      queryClient.setQueryData(interactionKeys.likeStats(contentId), context?.previous);
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: interactionKeys.likeStats(contentId) });
      queryClient.invalidateQueries({ queryKey: myKeys.likesRoot() });
    },
  });
};

/**
 * 싫어요 토글
 * 옵티미스틱 전이는 서버 LikeService.toggleLikeType과 동일:
 * DISLIKE -> NONE(해제), LIKE -> DISLIKE(전환), NONE -> DISLIKE(생성)
 */
export const useToggleDislike = (contentId: number) => {
  const { interactionApi } = useApis();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => interactionApi.toggleDislike(contentId),

    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: interactionKeys.likeStats(contentId) });

      const previous = queryClient.getQueryData<LikeStats>(
        interactionKeys.likeStats(contentId),
      );

      queryClient.setQueryData<LikeStats>(
        interactionKeys.likeStats(contentId),
        (old) => {
        if (!old) return old;
        if (old.userLikeType === "DISLIKE") {
          return {
            ...old,
            userLikeType: "NONE",
            dislikeCount: Math.max(0, old.dislikeCount - 1),
          };
        }
        return {
          ...old,
          userLikeType: "DISLIKE",
          dislikeCount: old.dislikeCount + 1,
          likeCount:
            old.userLikeType === "LIKE"
              ? Math.max(0, old.likeCount - 1)
              : old.likeCount,
        };
      });

      return { previous };
    },

    onError: (_err, _var, context) => {
      queryClient.setQueryData(interactionKeys.likeStats(contentId), context?.previous);
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: interactionKeys.likeStats(contentId) });
      queryClient.invalidateQueries({ queryKey: myKeys.likesRoot() });
    },
  });
};

/**
 * 북마크 상태 (privateApi - 비로그인 401 회피를 위해 enabled 게이트 제공)
 */
export const useBookmarkStatus = (contentId: number, enabled = true) => {
  const { interactionApi } = useApis();
  return useQuery({
    queryKey: interactionKeys.bookmarkStatus(contentId),
    queryFn: () => interactionApi.getBookmarkStatus(contentId),
    enabled: enabled && !!contentId,
  });
};

/**
 * 북마크 토글
 */
export const useToggleBookmark = (contentId: number) => {
  const { interactionApi } = useApis();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => interactionApi.toggleBookmark(contentId),
    onMutate: async () => {
      await queryClient.cancelQueries({
        queryKey: interactionKeys.bookmarkStatus(contentId),
      });

      const previous = queryClient.getQueryData<any>(
        interactionKeys.bookmarkStatus(contentId),
      );

      queryClient.setQueryData(
        interactionKeys.bookmarkStatus(contentId),
        (old: any) => {
          if (!old) return { bookmarked: true };
          return {
            ...old,
            bookmarked: !old.bookmarked,
          };
        }
      );

      return { previous };
    },
    onError: (_err, _var, context) => {
      queryClient.setQueryData(
        interactionKeys.bookmarkStatus(contentId),
        context?.previous
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: interactionKeys.bookmarkStatus(contentId),
      });
      queryClient.invalidateQueries({ queryKey: myKeys.bookmarksRoot() });
    },
  });
};

/**
 * 내 리뷰 목록
 */
export const useMyReviews = (page = 0, size = 20, enabled = true) => {
  const { reviewApi } = useApis();
  return useQuery({
    queryKey: myKeys.reviews(page, size),
    queryFn: () => reviewApi.getMyReviews(page, size),
    enabled,
  });
};

/**
 * 내 북마크 목록
 */
export const useMyBookmarks = (page = 0, size = 20, enabled = true) => {
  const { interactionApi } = useApis();
  return useQuery({
    queryKey: myKeys.bookmarks(page, size),
    queryFn: () => interactionApi.getMyBookmarks(page, size),
    enabled,
  });
};

/**
 * 내가 좋아요한 작품 목록
 */
export const useMyLikes = (page = 0, size = 20, enabled = true) => {
  const { interactionApi } = useApis();
  return useQuery({
    queryKey: myKeys.likes(page, size),
    queryFn: () => interactionApi.getMyLikes(page, size),
    enabled,
  });
};

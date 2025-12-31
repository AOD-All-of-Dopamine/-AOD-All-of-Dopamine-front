import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  reviewApi,
  interactionApi,
  ReviewRequest,
} from "../api/interactionApi";

/**
 * 리뷰 목록 조회
 */
export const useReviews = (contentId: number, page = 0, size = 20) => {
  return useQuery({
    queryKey: ["reviews", contentId, page, size],
    queryFn: () => reviewApi.getReviews(contentId, page, size),
    enabled: !!contentId,
  });
};

/**
 * 리뷰 작성
 */
export const useCreateReview = (contentId: number) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (reviewData: ReviewRequest) =>
      reviewApi.createReview(contentId, reviewData),
    onSuccess: () => {
      // 리뷰 목록 다시 불러오기
      queryClient.invalidateQueries({ queryKey: ["reviews", contentId] });
    },
  });
};

/**
 * 리뷰 수정
 */
export const useUpdateReview = (contentId: number) => {
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
      queryClient.invalidateQueries({ queryKey: ["reviews", contentId] });
    },
  });
};

/**
 * 리뷰 삭제
 */
export const useDeleteReview = (contentId: number) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (reviewId: number) => reviewApi.deleteReview(reviewId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reviews", contentId] });
    },
  });
};

/**
 * 좋아요/싫어요 통계
 */
export const useLikeStats = (contentId: number) => {
  return useQuery({
    queryKey: ["likeStats", contentId],
    queryFn: () => interactionApi.getLikeStats(contentId),
    enabled: !!contentId,
  });
};

/**
 * 좋아요 토글
 */
export const useToggleLike = (contentId: number) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => interactionApi.toggleLike(contentId),

    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["likeStats", contentId] });

      const previous = queryClient.getQueryData<any>(["likeStats", contentId]);

      queryClient.setQueryData(["likeStats", contentId], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          isLiked: !old.isLiked,
          isDisliked: false,
          likeCount: old.isLiked ? old.likeCount - 1 : old.likeCount + 1,
          dislikeCount: old.isDisliked ? old.dislikeCount - 1 : old.dislikeCount,
        };
      });

      return { previous };
    },

    onError: (_err, _var, context) => {
      queryClient.setQueryData(["likeStats", contentId], context?.previous);
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["likeStats", contentId] });
    },
  });
};

/**
 * 싫어요 토글
 */
export const useToggleDislike = (contentId: number) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => interactionApi.toggleDislike(contentId),

    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["likeStats", contentId] });

      const previous = queryClient.getQueryData<any>(["likeStats", contentId]);

      queryClient.setQueryData(["likeStats", contentId], (old: any) => {
        if (!old) return old;

        return {
          ...old,
          isDisliked: !old.isDisliked,
          isLiked: false,
          dislikeCount: old.isDisliked
            ? old.dislikeCount - 1
            : old.dislikeCount + 1,
          likeCount: old.isLiked ? old.likeCount - 1 : old.likeCount,
        };
      });

      return { previous };
    },

    onError: (_err, _var, context) => {
      queryClient.setQueryData(["likeStats", contentId], context?.previous);
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["likeStats", contentId] });
    },
  });
};

/**
 * 북마크 상태
 */
export const useBookmarkStatus = (contentId: number) => {
  return useQuery({
    queryKey: ["bookmarkStatus", contentId],
    queryFn: () => interactionApi.getBookmarkStatus(contentId),
    enabled: !!contentId,
  });
};

/**
 * 북마크 토글
 */
export const useToggleBookmark = (contentId: number) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => interactionApi.toggleBookmark(contentId),
    onMutate: async () => {
      await queryClient.cancelQueries({
        queryKey: ["bookmarkStatus", contentId],
      });

      const previous = queryClient.getQueryData<any>([
        "bookmarkStatus",
        contentId,
      ]);

      queryClient.setQueryData(
        ["bookmarkStatus", contentId],
        (old: any) => {
          if (!old) return old;
          return {
            ...old,
            isBookmarked: !old.isBookmarked,
          };
        }
      );

      return { previous };
    },
    onError: (_err, _var, context) => {
      queryClient.setQueryData(
        ["bookmarkStatus", contentId],
        context?.previous
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ["bookmarkStatus", contentId],
      });
      queryClient.invalidateQueries({ queryKey: ["myBookmarks"] });
    },
  });
};

/**
 * 내 리뷰 목록
 */
export const useMyReviews = (page = 0, size = 20) => {
  return useQuery({
    queryKey: ["myReviews", page, size],
    queryFn: () => reviewApi.getMyReviews(page, size),
  });
};

/**
 * 내 북마크 목록
 */
export const useMyBookmarks = (page = 0, size = 20) => {
  return useQuery({
    queryKey: ["myBookmarks", page, size],
    queryFn: () => interactionApi.getMyBookmarks(page, size),
  });
};

/**
 * 내가 좋아요한 작품 목록
 */
export const useMyLikes = (page = 0, size = 20) => {
  return useQuery({
    queryKey: ["myLikes", page, size],
    queryFn: () => interactionApi.getMyLikes(page, size),
  });
};

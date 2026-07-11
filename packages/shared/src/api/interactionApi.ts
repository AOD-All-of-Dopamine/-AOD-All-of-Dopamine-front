import type { AxiosInstance } from "axios";
import type { PageResponse } from "../types";

export interface ReviewRequest {
  rating: number;
  title?: string;
  content: string;
}

export interface Review {
  reviewId: number;
  contentId: number;
  contentTitle: string;
  userId: number;
  username: string;
  rating: number;
  title?: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  isMyReview?: boolean;
}

export function createReviewApi(publicApi: AxiosInstance, privateApi: AxiosInstance) {
  return {
    /**
     * 특정 작품의 리뷰 목록 조회
     */
    getReviews: async (
      contentId: number,
      page = 0,
      size = 20,
    ): Promise<PageResponse<Review>> => {
      const { data } = await publicApi.get<PageResponse<Review>>(
        `/api/works/${contentId}/reviews`,
        {
          params: { page, size },
        },
      );
      return data;
    },

    /**
     * 리뷰 작성
     */
    createReview: async (
      contentId: number,
      reviewData: ReviewRequest,
    ): Promise<Review> => {
      const { data } = await privateApi.post<Review>(
        `/api/works/${contentId}/reviews`,
        reviewData,
      );
      return data;
    },

    /**
     * 리뷰 수정
     */
    updateReview: async (
      reviewId: number,
      reviewData: ReviewRequest,
    ): Promise<Review> => {
      const { data } = await privateApi.put<Review>(
        `/api/reviews/${reviewId}`,
        reviewData,
      );
      return data;
    },

    /**
     * 리뷰 삭제
     */
    deleteReview: async (reviewId: number): Promise<void> => {
      await privateApi.delete(`/api/reviews/${reviewId}`);
    },

    /**
     * 내 리뷰 목록
     */
    getMyReviews: async (page = 0, size = 20): Promise<PageResponse<Review>> => {
      const { data } = await privateApi.get<PageResponse<Review>>(
        "/api/my/reviews",
        {
          params: { page, size },
        },
      );
      return data;
    },
  };
}

export type ReviewApi = ReturnType<typeof createReviewApi>;

export interface LikeStats {
  likeCount: number;
  dislikeCount: number;
  myStatus?: "LIKE" | "DISLIKE" | "NONE";
}

export interface BookmarkStatus {
  bookmarked: boolean;
}

export function createInteractionApi(publicApi: AxiosInstance, privateApi: AxiosInstance) {
  return {
    /**
     * 좋아요 토글
     */
    toggleLike: async (contentId: number) => {
      const { data } = await privateApi.post(`/api/works/${contentId}/like`);
      return data;
    },

    /**
     * 싫어요 토글
     */
    toggleDislike: async (contentId: number) => {
      const { data } = await privateApi.post(`/api/works/${contentId}/dislike`);
      return data;
    },

    /**
     * 좋아요/싫어요 통계
     */
    getLikeStats: async (contentId: number) => {
      const { data } = await publicApi.get(`/api/works/${contentId}/likes`);
      return data;
    },

    /**
     * 북마크 토글
     */
    toggleBookmark: async (contentId: number) => {
      const { data } = await privateApi.post(`/api/works/${contentId}/bookmark`);
      return data;
    },

    /**
     * 북마크 상태 확인
     */
    getBookmarkStatus: async (contentId: number) => {
      const { data } = await privateApi.get(`/api/works/${contentId}/bookmark`);
      return data;
    },

    /**
     * 내 북마크 목록
     */
    getMyBookmarks: async (page = 0, size = 20) => {
      const { data } = await privateApi.get("/api/my/bookmarks", {
        params: { page, size },
      });
      return data;
    },

    /**
     * 내가 좋아요한 작품 목록
     */
    getMyLikes: async (page = 0, size = 20) => {
      const { data } = await privateApi.get("/api/my/likes", {
        params: { page, size },
      });
      return data;
    },
  };
}

export type InteractionApi = ReturnType<typeof createInteractionApi>;

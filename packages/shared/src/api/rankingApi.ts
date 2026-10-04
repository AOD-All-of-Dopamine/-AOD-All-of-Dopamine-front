import type { AxiosInstance } from "axios";

export interface ContentInfo {
  contentId: number;
  domain: string;
  masterTitle: string;
  posterImageUrl: string;
}

export interface ExternalRanking {
  id: number;
  contentId?: number; // 매핑된 Content ID (있는 경우만)
  title: string;
  ranking: number;
  platform: string;
  thumbnailUrl: string;
  content?: ContentInfo; // 상세 정보 (선택적)
  watchProviders?: string[]; // OTT 플랫폼 정보 (TMDB만 해당)
  // ===== 트렌드 (2026-10-04) — 옛 응답에는 없다 =====
  /** 게임 세로 표지 */
  portraitImageUrl?: string | null;
  /** 순위를 받을 때의 평가 — 게임: 긍정 비율(0~1) · 영화/시리즈: TMDB 평점 */
  ratingScore?: number | null;
  /** 게임: 리뷰 수 · 영화/시리즈: 투표 수 */
  ratingCount?: number | null;
  /** 게임: Steam 판정(영문) */
  ratingLabel?: string | null;
  /** 비교 기준일 순위 — 기준일 기록에 없으면 null(= NEW, rankBaseDate 가 있을 때만) */
  previousRanking?: number | null;
  /** 비교 기준일 yyyy-MM-dd — null 이면 비교할 기록이 없다(변동 칸을 비운다) */
  rankBaseDate?: string | null;
}

export function createRankingApi(publicApi: AxiosInstance) {
  return {
    getAllRankings: async () => {
      const response =
        await publicApi.get<ExternalRanking[]>("/api/rankings/all");
      return response.data;
    },

    getRankingsByPlatform: async (platform: string) => {
      const response = await publicApi.get<ExternalRanking[]>(
        `/api/rankings/${platform}`,
      );
      return response.data;
    },

    /**
     * 특정 도메인(GAME 등) 문자열을 기준으로 랭킹 조회
     */
    getRankingsByDomain: async (domain: string) => {
      const response = await publicApi.get<ExternalRanking[]>(
        `/api/rankings/domain/${domain}`,
      );
      return response.data;
    },
  };
}

export type RankingApi = ReturnType<typeof createRankingApi>;

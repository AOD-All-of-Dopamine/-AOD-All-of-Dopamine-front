import type { AxiosInstance } from "axios";
import { REC_PAGE_SIZE } from "../constants/rec";
import { recHeaders } from "../tracking/recHeaders";
import type { RecRequestContext } from "../tracking/types";
import type {
  NotInterestedResult,
  ReactionResult,
  ReactionState,
  RecResponse,
  RecTab,
} from "../types";

export interface RecListParams {
  tab: RecTab;
  /** 이어 볼 체인. 없거나 null 이면 새 체인을 연다. */
  chainId?: string | null;
  /** 기본 20 (백엔드 상한). */
  size?: number;
  /**
   * 요청을 보낸 화면(백엔드 rec_request.surface). 없으면 보내지 않는다 — 서버가 추천 탭으로 적는다.
   * 허용 값은 서버가 거른다({rec_tab, home_rec}).
   */
  surface?: string;
}

/**
 * 추천 API (REC_TAB_DESIGN §4-1).
 * 목록도 privateApi 로 부른다 — 토큰이 있으면 개인화, 없으면 백엔드가 401 이 아니라
 * anonymous 대체(200)를 준다. 익명·세션 헤더도 privateApi 가 자동으로 싣는다.
 */
export function createRecApi(privateApi: AxiosInstance) {
  return {
    list: async ({ tab, chainId, size = REC_PAGE_SIZE, surface }: RecListParams): Promise<RecResponse> => {
      const params: Record<string, string | number> = { tab, size };
      if (chainId) params.chainId = chainId;
      if (surface) params.surface = surface;
      const { data } = await privateApi.get<RecResponse>("/api/recommendations", { params });
      return data;
    },

    /** 반응 상태 지정(토글이 아니다). 되돌리기는 응답의 previousState 를 다시 보내면 된다. */
    setReaction: async (
      contentId: number,
      state: ReactionState,
      rec?: RecRequestContext,
    ): Promise<ReactionResult> => {
      const { data } = await privateApi.put<ReactionResult>(
        `/api/works/${contentId}/reaction`,
        { state, source: rec?.source, requestId: rec?.requestId, impressionId: rec?.impressionId },
        { headers: recHeaders(rec) },
      );
      return data;
    },

    /** 관심 없음 켜기(PUT)·끄기(DELETE). 끄기는 본문을 받지 않으므로 맥락을 헤더로만 보낸다. */
    setNotInterested: async (
      contentId: number,
      on: boolean,
      rec?: RecRequestContext,
    ): Promise<NotInterestedResult> => {
      const url = `/api/recommendations/not-interested/${contentId}`;
      const headers = recHeaders(rec);
      if (on) {
        const { data } = await privateApi.put<NotInterestedResult>(
          url,
          { requestId: rec?.requestId, impressionId: rec?.impressionId },
          { headers },
        );
        return data;
      }
      const { data } = await privateApi.delete<NotInterestedResult>(url, { headers });
      return data;
    },
  };
}

export type RecApi = ReturnType<typeof createRecApi>;

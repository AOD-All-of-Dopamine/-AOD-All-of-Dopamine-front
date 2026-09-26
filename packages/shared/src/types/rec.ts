import type { WorkSummary } from "./index";

/** 추천 분야 칩(홈). 백엔드 RecommendService.TABS 와 같아야 한다. */
export const REC_TABS = ["all", "movie", "tv", "game", "webtoon", "webnovel"] as const;

export type RecTab = (typeof REC_TABS)[number];

/** 백엔드가 내는 대체 사유. 모르는 값이 와도 화면이 깨지지 않게 응답 타입은 string 으로 둔다. */
export const REC_FALLBACK_REASONS = [
  "anonymous",
  "no_seed",
  "no_seed_platform",
  "service_error",
  "timeout",
  "circuit_open",
  "disabled",
  "empty",
] as const;

export type RecFallbackReason = (typeof REC_FALLBACK_REASONS)[number];

/** 카드에 붙는 이유 한 줄 (RecReason 레코드). type 은 like·bookmark·review. */
export interface RecReason {
  type: string;
  seedContentId: number | null;
  text: string;
}

/** GET /api/recommendations 의 items[] 한 장 (RecommendItem 레코드). rank 는 0부터. */
export interface RecItem {
  impressionId: string;
  rank: number;
  work: WorkSummary;
  reason: RecReason | null;
}

/** 화면이 다루는 카드 — 어느 요청에서 온 카드인지(requestId)를 붙인 것. */
export interface RecCard extends RecItem {
  requestId: string;
}

/** GET /api/recommendations 200 본문 (RecommendResponse 레코드). */
export interface RecResponse {
  requestId: string;
  chainId: string;
  pageDepth: number;
  fallback: boolean;
  fallbackReason: string | null;
  items: RecItem[];
  hasMore: boolean;
}

export type ReactionState = "LIKE" | "DISLIKE" | "NONE";

/** PUT /api/works/{id}/reaction 응답 (ReactionResponse 레코드). */
export interface ReactionResult {
  state: ReactionState;
  previousState: ReactionState;
  likeCount: number;
  dislikeCount: number;
}

/** PUT·DELETE /api/recommendations/not-interested/{id} 응답. */
export interface NotInterestedResult {
  on: boolean;
}

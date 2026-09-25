import { recErrorStatus } from "./chainStore";

/**
 * 홈 추천 릴의 화면 모드 (홈 설계 2026-09-25 "모드").
 * - personal: 개인화 추천 — 이유 줄 · 👍/👎 · 좋아요 미니 포스터
 * - anon: 비로그인(또는 토큰 만료 401) — 로그인 안내 + 대체 목록, 반응 없음
 * - pick: 취향 없음(no_seed) — 홈에서 바로 작품 고르기
 * - popular: 그 밖의 대체 목록 — "추천"·이유 문구 없이, 로그인 사용자라 👍/👎 는 받는다
 * - error: 요청 자체가 실패(401 제외) — 다시 시도
 */
export type HomeRecMode = "personal" | "anon" | "pick" | "popular" | "error";

export interface HomeRecModeInput {
  /** 받은 응답의 대체 여부. 아직 없으면 null. */
  view: { fallback: boolean; fallbackReason: string | null } | null;
  /** 요청 오류. 없으면 null. */
  error: unknown;
  isAuthenticated: boolean;
}

/**
 * 응답·오류·로그인 여부 → 모드. 판정할 것이 없으면(로딩) null.
 * 추천 탭의 recNotice 는 쓰지 않는다 — no_seed_platform 을 탐색으로 보내는 등 추천 탭 전용 분기다.
 * 모르는 사유는 popular 다: 백엔드가 사유를 늘려도 화면이 개인화처럼 보이지 않게.
 */
export function homeRecMode({ view, error, isAuthenticated }: HomeRecModeInput): HomeRecMode | null {
  // 받아 둔 목록이 있으면 그걸 보여 준다 — 재조회 실패로 멀쩡한 줄을 오류로 바꾸지 않는다.
  if (!view) {
    if (error === null || error === undefined) return null;
    return recErrorStatus(error) === 401 ? "anon" : "error";
  }
  if (!view.fallback) return "personal";
  switch (view.fallbackReason) {
    case "anonymous":
      return "anon";
    case "no_seed":
      // 비로그인에는 no_seed 가 오지 않지만(서버가 먼저 anonymous 로 답한다), 오면 고르게 하지 않는다.
      return isAuthenticated ? "pick" : "anon";
    default:
      return "popular";
  }
}

/** 섹션 제목. 모드를 모르는 동안(로딩·오류)은 로그인 여부로 고른다. */
export function homeRecTitle(mode: HomeRecMode | null, isAuthenticated: boolean): string {
  switch (mode) {
    case "personal":
      return "내 취향 추천";
    case "pick":
      return "취향을 알려주세요";
    case "anon":
    case "popular":
      return "지금 많이 찾는 작품";
    default:
      return isAuthenticated ? "내 취향 추천" : "지금 많이 찾는 작품";
  }
}

/** 카드에 👍/👎 를 붙일지. 비로그인은 저장되지 않으므로 없다 (추천 탭 recFeedbackEnabled 와 같은 규칙). */
export function homeRecFeedbackEnabled(mode: HomeRecMode | null): boolean {
  return mode === "personal" || mode === "popular";
}

/** 카드에 이유 한 줄을 붙일지. 대체 목록에 이유를 붙이면 인기 목록이 개인화처럼 보인다. */
export function homeRecShowsReason(mode: HomeRecMode | null): boolean {
  return mode === "personal";
}

/**
 * 좋아요 미니 포스터 옆 문구. 보여 준 포스터 수를 뺀 나머지가 있을 때만 "외 N개".
 * 좋아요가 하나도 없으면 null — 부제를 그리지 않는다(북마크·리뷰만으로 시드가 있는 경우).
 */
export function homeLikesCaption(totalLiked: number, shown: number): string | null {
  if (!Number.isFinite(totalLiked) || totalLiked <= 0) return null;
  const rest = Math.floor(totalLiked) - Math.max(0, Math.floor(shown));
  return rest > 0 ? `좋아요한 작품 외 ${rest}개` : "좋아요한 작품";
}

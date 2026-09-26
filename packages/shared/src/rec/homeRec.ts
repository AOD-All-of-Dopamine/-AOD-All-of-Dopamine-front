import type { RecTab } from "../types";
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

/** 카드에 👍/👎 를 붙일지. 비로그인은 저장되지 않으므로 없다. */
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

/**
 * "새 추천 받기"를 보일지 — 개인 추천이고 서버가 더 줄 수 있을 때만.
 * 대체 목록은 늘 같은 인기 목록이라 "새로" 받을 게 없다(설계 "모드").
 */
export function homeRecCanRefresh(mode: HomeRecMode | null, hasNextPage: boolean): boolean {
  return mode === "personal" && hasNextPage;
}

/**
 * 대체(인기) 목록에서 👍 를 눌렀으면 "내 취향으로 다시 받기"를 보인다 — 대체 목록은 다음 쪽이 없고
 * 캐시는 무한이라, 👍 가 시드가 됐어도 다시 요청할 길이 없었다(설계 검수 B7).
 */
export function homeRecCanRestart(mode: HomeRecMode | null, likedCount: number): boolean {
  return mode === "popular" && likedCount > 0;
}

/** 이 분야에 시드가 없을 때(no_seed_platform) 부제. 전체 칩이면 웹툰만 좋아한 사용자다 — tab=all 은 웹툰을 부르지 않는다. */
export function noSeedPlatformHint(tab: RecTab): { text: string; switchTo: RecTab | null } {
  if (tab === "all") return { text: "좋아요한 웹툰으로 추천을 볼 수 있어요", switchTo: "webtoon" };
  return { text: "이 분야에서 좋아요한 작품이 아직 없어요", switchTo: null };
}

/** 새로 받은 묶음 표시 — 서버 pageDepth(0부터) 기준. 첫 묶음은 표시하지 않는다. */
export function homeRecSetLabel(pageDepth: number): string | null {
  if (!Number.isFinite(pageDepth) || pageDepth <= 0) return null;
  return `새로 고른 추천 · ${Math.floor(pageDepth) + 1}번째`;
}

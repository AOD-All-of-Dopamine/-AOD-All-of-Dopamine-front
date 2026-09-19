import { REC_TABS, type RecTab } from "../types";

/** URL 쿼리(?tab=)를 칩 상태로. 모르는 값은 전체로 떨어뜨린다. */
export function parseRecTab(value: string | null | undefined): RecTab {
  const normalized = (value ?? "").trim().toLowerCase();
  return (REC_TABS as readonly string[]).includes(normalized) ? (normalized as RecTab) : "all";
}

export type RecNoticeKind = "login" | "seed" | "seed_platform";

/** 목록 위에 띄울 안내 한 장 (설계 §3 표). */
export interface RecNotice {
  kind: RecNoticeKind;
  title: string;
  description: string;
  actionLabel: string;
  actionTo: string;
}

const LOGIN_NOTICE: RecNotice = {
  kind: "login",
  title: "로그인하면 취향 추천을 볼 수 있어요",
  description: "지금은 인기 작품을 보여드리고 있어요.",
  actionLabel: "로그인",
  actionTo: "/login",
};

/** 온보딩(6번)이 나오기 전까지는 탐색으로 보낸다 (설계 §7). */
const SEED_NOTICE: RecNotice = {
  kind: "seed",
  title: "좋아하는 작품을 담으면 추천이 시작돼요",
  description: "마음에 든 작품에 좋아요를 눌러 보세요.",
  actionLabel: "작품 둘러보기",
  actionTo: "/explore",
};

const SEED_PLATFORM_NOTICE: RecNotice = {
  kind: "seed_platform",
  title: "이 분야에서 좋아하는 작품을 담아보세요",
  description: "이 탭에는 아직 취향을 알 만한 작품이 없어요.",
  actionLabel: "작품 둘러보기",
  actionTo: "/explore",
};

/** 대체 사유가 사용자 행동으로 풀리는 것일 때만 안내한다. 서버 사정은 조용히 넘어간다. */
export function recNotice(view: { fallback: boolean; fallbackReason: string | null }): RecNotice | null {
  if (!view.fallback) return null;
  switch (view.fallbackReason) {
    case "anonymous":
      return LOGIN_NOTICE;
    case "no_seed":
      return SEED_NOTICE;
    case "no_seed_platform":
      return SEED_PLATFORM_NOTICE;
    default:
      return null;
  }
}

/** 비로그인 대체 목록에는 피드백 버튼을 달지 않는다 — 배너가 로그인을 유도한다. */
export function recFeedbackEnabled(view: { fallback: boolean; fallbackReason: string | null }): boolean {
  return !(view.fallback && view.fallbackReason === "anonymous");
}

import { REC_TABS, type RecTab } from "../types";

/** URL 쿼리(홈 `?rec=` · 옛 추천 탭 `?tab=`)를 칩 상태로. 모르는 값은 전체로 떨어뜨린다. */
export function parseRecTab(value: string | null | undefined): RecTab {
  const normalized = (value ?? "").trim().toLowerCase();
  return (REC_TABS as readonly string[]).includes(normalized) ? (normalized as RecTab) : "all";
}

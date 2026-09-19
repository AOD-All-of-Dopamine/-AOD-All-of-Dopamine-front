import type { RecTab } from "../types";

/** 칩 라벨. 도메인 라벨(DOMAIN_LABEL_MAP)과 표기를 맞춘다 — tv 는 "시리즈". */
export const REC_TAB_LABELS: Record<RecTab, string> = {
  all: "전체",
  movie: "영화",
  tv: "시리즈",
  game: "게임",
  webtoon: "웹툰",
  webnovel: "웹소설",
};

/** 한 쪽 카드 수. 백엔드 RecommendController.MAX_SIZE 상한이 20 이다. */
export const REC_PAGE_SIZE = 20;

/** 이벤트·헤더의 출처 값 (RecommendService.SURFACE). */
export const REC_SURFACE = "rec_tab";

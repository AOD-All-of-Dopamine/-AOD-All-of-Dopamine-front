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

/** 한 쪽 카드 수 기본값 (recApi.list 의 size 기본). 백엔드 상한은 RecommendController.MAX_SIZE = 30. */
export const REC_PAGE_SIZE = 20;

/**
 * 옛 추천 탭(/for-you, 2026-09-26 제거)의 출처 값 (RecommendService.SURFACE — 백엔드 기본값).
 * 지금 쓰는 곳은 없다 — 과거 로그의 surface 를 읽을 때의 기준으로만 남긴다.
 */
export const REC_SURFACE = "rec_tab";

/** 홈 추천 릴의 출처 값 (RecommendService.HOME_SURFACE) — 요청·이벤트·반응에 싣는다. */
export const HOME_REC_SURFACE = "home_rec";

/** 홈에서 바로 고른 좋아요의 출처 — 온보딩 페이지("onboarding")와 로그에서 구분한다. 시드 규칙은 같다. */
export const HOME_PICK_SOURCE = "home_pick";

/** 홈 추천 한 묶음 카드 수 (설계 2026-09-26-home-rec-only). 백엔드 상한 30 이 먼저 나가야 한다. */
export const HOME_REC_SET_SIZE = 30;

/** 취향 고르기(pick) 후보 수 — 묶음이 30 이 돼도 고르기 줄은 지금 길이로 둔다. */
export const HOME_PICK_CANDIDATES = 12;

/** 홈 추천 분야 칩의 URL 매개변수 — `/home?rec=webtoon`. 전체는 매개변수 없음. 옛 `/for-you?tab=` 은 이리로 넘긴다. */
export const HOME_REC_TAB_PARAM = "rec";

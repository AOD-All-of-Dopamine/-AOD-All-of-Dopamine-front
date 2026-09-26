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

/** 홈 추천 릴의 출처 값 (RecommendService.HOME_SURFACE) — 요청·이벤트·반응을 추천 탭과 갈라 적는다. */
export const HOME_REC_SURFACE = "home_rec";

/** 홈에서 바로 고른 좋아요의 출처 — 온보딩 페이지("onboarding")와 로그에서 구분한다. 시드 규칙은 같다. */
export const HOME_PICK_SOURCE = "home_pick";

/** 홈 추천 릴 카드 수 (홈 설계 2026-09-25). */
export const HOME_REC_SIZE = 12;

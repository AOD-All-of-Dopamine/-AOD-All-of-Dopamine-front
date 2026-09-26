import type { RecEventFields, RecRequestContext } from "../tracking/types";
import type { RecCard, RecTab } from "../types";

/**
 * 카드 1장의 이벤트 식별자 (impression_viewed · card_clicked 공용).
 * `surface` 는 필수다 — 기본값이 있으면 새 화면이 조용히 옛 값(rec_tab)으로 기록된다(백엔드는 surface 를 검증하지 않는다).
 */
export function recCardFields(card: RecCard, surface: string): RecEventFields {
  return {
    contentId: card.work.id,
    requestId: card.requestId,
    impressionId: card.impressionId,
    surface,
  };
}

/** 반응·관심 없음·북마크 요청에 실을 맥락 (X-Rec-* 헤더가 된다). */
export function recCardContext(card: RecCard, surface: string): RecRequestContext {
  return { source: surface, requestId: card.requestId, impressionId: card.impressionId };
}

/** "새 추천 받기" — `pageDepth` 는 **떠나는** 묶음의 깊이다(옛 추천 탭 "더 보기"와 같은 정의). */
export function recLoadedMoreFields(args: {
  requestId: string | null;
  pageDepth: number;
  tab: RecTab;
  surface: string;
}): RecEventFields {
  return {
    requestId: args.requestId ?? undefined,
    surface: args.surface,
    payload: { page_depth: args.pageDepth, tab: args.tab },
  };
}

/** 분야 칩을 **눌러서** 바꿨을 때만 보낸다 — URL 로 바뀐 경우(온보딩 도착 · 뒤로가기)는 사용자 선택이 아니다. */
export function recTabChangedFields(args: {
  from: RecTab;
  to: RecTab;
  surface: string;
  /** 칩이 아니라 안내 버튼(예: "웹툰 추천 보기")으로 바꿨으면 "hint". */
  via?: "hint";
}): RecEventFields {
  return {
    surface: args.surface,
    payload: args.via ? { from: args.from, to: args.to, via: args.via } : { from: args.from, to: args.to },
  };
}

/** 상세 링크. 2번 트래커가 상세에서 ?rid=&iid= 를 읽어 체류·반응을 노출에 잇는다. */
export function recWorkPath(card: RecCard): string {
  const query = new URLSearchParams({ rid: card.requestId, iid: card.impressionId });
  return `/work/${card.work.id}?${query.toString()}`;
}

import { REC_SURFACE } from "../constants/rec";
import type { RecEventFields, RecRequestContext } from "../tracking/types";
import type { RecCard, RecTab } from "../types";

/** 카드 1장의 이벤트 식별자 (impression_viewed · card_clicked 공용). */
export function recCardFields(card: RecCard, surface: string = REC_SURFACE): RecEventFields {
  return {
    contentId: card.work.id,
    requestId: card.requestId,
    impressionId: card.impressionId,
    surface,
  };
}

/** 반응·관심 없음·북마크 요청에 실을 맥락 (X-Rec-* 헤더가 된다). */
export function recCardContext(card: RecCard, surface: string = REC_SURFACE): RecRequestContext {
  return { source: surface, requestId: card.requestId, impressionId: card.impressionId };
}

export function recLoadedMoreFields(args: {
  requestId: string | null;
  pageDepth: number;
  tab: RecTab;
}): RecEventFields {
  return {
    requestId: args.requestId ?? undefined,
    surface: REC_SURFACE,
    payload: { page_depth: args.pageDepth, tab: args.tab },
  };
}

export function recTabChangedFields(args: { from: RecTab; to: RecTab }): RecEventFields {
  return { surface: REC_SURFACE, payload: { from: args.from, to: args.to } };
}

/** 상세 링크. 2번 트래커가 상세에서 ?rid=&iid= 를 읽어 체류·반응을 노출에 잇는다. */
export function recWorkPath(card: RecCard): string {
  const query = new URLSearchParams({ rid: card.requestId, iid: card.impressionId });
  return `/work/${card.work.id}?${query.toString()}`;
}

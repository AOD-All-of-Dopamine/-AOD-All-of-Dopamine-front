import type { RecCard, RecResponse, ReactionState } from "../types";

/** 여러 쪽을 이어 붙인 화면 상태. 컴포넌트는 이 값만 보고 그린다. */
export interface RecListView {
  cards: RecCard[];
  /** 마지막 쪽의 requestId — rec_loaded_more 가 싣는다. */
  requestId: string | null;
  /** 마지막 쪽의 chainId — 대체가 아닐 때만 저장한다. */
  chainId: string | null;
  pageDepth: number;
  /** 첫 쪽이 대체면 화면 전체가 대체다. */
  fallback: boolean;
  fallbackReason: string | null;
  hasMore: boolean;
  /** 개인화 체인이 끝났다 — "여기까지 봤어요". 대체는 해당 없음. */
  exhausted: boolean;
}

const EMPTY_VIEW: RecListView = {
  cards: [],
  requestId: null,
  chainId: null,
  pageDepth: 0,
  fallback: false,
  fallbackReason: null,
  hasMore: false,
  exhausted: false,
};

/**
 * 쪽들을 화면 상태로 접는다. 같은 작품이 두 번 오면 앞쪽만 남기고(체인이 깨졌을 때 방어),
 * 숨긴 작품은 뺀다 — 피드백은 보이는 목록을 다시 받지 않는다(설계 §3).
 */
export function mergeRecPages(
  pages: readonly RecResponse[],
  hidden: ReadonlySet<number> = new Set<number>(),
): RecListView {
  if (pages.length === 0) return { ...EMPTY_VIEW };

  const cards: RecCard[] = [];
  const seen = new Set<number>();
  for (const page of pages) {
    for (const item of page.items ?? []) {
      const contentId = item.work?.id;
      if (typeof contentId !== "number" || seen.has(contentId)) continue;
      seen.add(contentId);
      if (hidden.has(contentId)) continue;
      cards.push({ ...item, requestId: page.requestId });
    }
  }

  const first = pages[0];
  const last = pages[pages.length - 1];
  return {
    cards,
    requestId: last.requestId ?? null,
    chainId: last.chainId ?? null,
    pageDepth: last.pageDepth ?? 0,
    fallback: first.fallback,
    fallbackReason: first.fallbackReason ?? null,
    hasMore: last.hasMore && !last.fallback && !!last.chainId,
    exhausted: !last.hasMore && !last.fallback,
  };
}

/** useInfiniteQuery 의 getNextPageParam. 대체 응답의 chainId 는 저장된 값이 아니라 보내면 404 다. */
export function nextChainParam(lastPage: RecResponse): string | undefined {
  if (!lastPage.hasMore || lastPage.fallback) return undefined;
  return lastPage.chainId ? lastPage.chainId : undefined;
}

export type RecFeedbackKind = "dislike" | "not_interested";

/** 화면에서 감춘 카드 1장. 되돌리기에 필요한 것만 담는다. */
export interface RecHiddenEntry {
  contentId: number;
  kind: RecFeedbackKind;
  /** 토스트 문구에 쓴다. */
  title: string;
  requestId: string;
  impressionId: string;
  /** 싫어요를 되돌릴 때 돌려놓을 상태. 서버 응답 전에는 NONE. */
  previousState: ReactionState;
  /**
   * true 면 목록에서 빼지 않고 **그 자리에 흐리게 남긴다**(홈 추천 릴). 자리를 닫으면(collapse) false.
   * 없으면 지금처럼 곧바로 목록에서 빠진다(추천 탭) — 선택 필드라 기존 동작은 그대로다.
   */
  slotVisible?: boolean;
}

export type RecHiddenAction =
  | { type: "hide"; entry: RecHiddenEntry }
  | { type: "confirm"; contentId: number; previousState: ReactionState }
  | { type: "restore"; contentId: number }
  /** 흐리게 남겨 둔 자리를 모두 닫는다 — 그 작품들은 이제 목록에서 빠진다(화면을 다시 열 때). */
  | { type: "collapse" }
  | { type: "clear" };

/** 카드 제거는 서버 재요청이 아니라 화면 상태다 (설계 §4). 체인 nonce 단위로 비운다. */
export function recHiddenReducer(
  state: readonly RecHiddenEntry[],
  action: RecHiddenAction,
): readonly RecHiddenEntry[] {
  switch (action.type) {
    case "hide":
      return [...state.filter((e) => e.contentId !== action.entry.contentId), action.entry];
    case "confirm":
      return state.map((e) =>
        e.contentId === action.contentId ? { ...e, previousState: action.previousState } : e,
      );
    case "restore":
      return state.filter((e) => e.contentId !== action.contentId);
    case "collapse":
      return state.some((e) => e.slotVisible === true)
        ? state.map((e) => (e.slotVisible === true ? { ...e, slotVisible: false } : e))
        : state;
    case "clear":
      return state.length === 0 ? state : [];
  }
}

export function hiddenIds(state: readonly RecHiddenEntry[]): Set<number> {
  return new Set(state.map((e) => e.contentId));
}

/**
 * 목록에서 뺄 id — 자리를 유지하는 항목(slotVisible)은 빼지 않는다. mergeRecPages 에 넘긴다.
 * slotVisible 이 없는 항목(추천 탭)은 hiddenIds 와 같다.
 */
export function collapsedIds(state: readonly RecHiddenEntry[]): Set<number> {
  return new Set(state.filter((e) => e.slotVisible !== true).map((e) => e.contentId));
}

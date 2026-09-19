import { describe, it, expect } from "vitest";
import { hiddenIds, mergeRecPages, nextChainParam, recHiddenReducer } from "../src/rec";
import type { RecHiddenEntry } from "../src/rec";
import type { RecResponse } from "../src/types";

const work = (id: number) => ({ id, domain: "GAME", title: `작품 ${id}`, thumbnail: null, score: 0 });

const page = (over: Partial<RecResponse> & { ids: number[] }): RecResponse => ({
  requestId: over.requestId ?? "req-1",
  chainId: over.chainId ?? "chain-1",
  pageDepth: over.pageDepth ?? 0,
  fallback: over.fallback ?? false,
  fallbackReason: over.fallbackReason ?? null,
  hasMore: over.hasMore ?? true,
  items: over.ids.map((id, rank) => ({
    impressionId: `imp-${id}`,
    rank,
    work: work(id),
    reason: { type: "like", seedContentId: 1, text: `X를 좋아해서` },
  })),
});

describe("mergeRecPages", () => {
  it("페이지 순서대로 이어 붙이고 카드마다 그 페이지의 requestId 를 붙인다", () => {
    const view = mergeRecPages([
      page({ ids: [1, 2], requestId: "req-1" }),
      page({ ids: [3], requestId: "req-2", chainId: "chain-1", pageDepth: 1, hasMore: false }),
    ]);
    expect(view.cards.map((c) => c.work.id)).toEqual([1, 2, 3]);
    expect(view.cards.map((c) => c.requestId)).toEqual(["req-1", "req-1", "req-2"]);
    expect(view.requestId).toBe("req-2");
    expect(view.pageDepth).toBe(1);
    expect(view.chainId).toBe("chain-1");
  });

  it("같은 작품이 두 쪽에 오면 앞쪽만 남긴다", () => {
    const view = mergeRecPages([page({ ids: [1, 2] }), page({ ids: [2, 3], requestId: "req-2" })]);
    expect(view.cards.map((c) => c.work.id)).toEqual([1, 2, 3]);
  });

  it("숨긴 작품은 목록에서 뺀다 — 서버를 다시 부르지 않는다", () => {
    const view = mergeRecPages([page({ ids: [1, 2, 3] })], new Set([2]));
    expect(view.cards.map((c) => c.work.id)).toEqual([1, 3]);
  });

  it("더 보기 여부는 마지막 쪽 기준이고, 대체는 절대 이어 보지 않는다", () => {
    expect(mergeRecPages([page({ ids: [1], hasMore: true })]).hasMore).toBe(true);
    expect(mergeRecPages([page({ ids: [1], hasMore: false })]).hasMore).toBe(false);
    expect(
      mergeRecPages([page({ ids: [1], hasMore: true, fallback: true, fallbackReason: "anonymous" })]).hasMore,
    ).toBe(false);
  });

  it("개인화 체인이 끝났을 때만 exhausted 다 (대체는 아니다)", () => {
    expect(mergeRecPages([page({ ids: [1], hasMore: false })]).exhausted).toBe(true);
    expect(mergeRecPages([page({ ids: [1], hasMore: true })]).exhausted).toBe(false);
    expect(
      mergeRecPages([page({ ids: [1], hasMore: false, fallback: true, fallbackReason: "no_seed" })]).exhausted,
    ).toBe(false);
  });

  it("대체 여부·사유는 첫 쪽 기준이다", () => {
    const view = mergeRecPages([page({ ids: [1], fallback: true, fallbackReason: "no_seed", hasMore: false })]);
    expect(view.fallback).toBe(true);
    expect(view.fallbackReason).toBe("no_seed");
  });

  it("쪽이 하나도 없으면 빈 화면 상태를 준다", () => {
    expect(mergeRecPages([])).toEqual({
      cards: [], requestId: null, chainId: null, pageDepth: 0,
      fallback: false, fallbackReason: null, hasMore: false, exhausted: false,
    });
  });
});

describe("nextChainParam", () => {
  it("이어 볼 수 있으면 그 쪽의 chainId 를 준다", () => {
    expect(nextChainParam(page({ ids: [1], chainId: "chain-7", hasMore: true }))).toBe("chain-7");
  });

  it("hasMore=false·대체·chainId 없음이면 undefined (더 안 부른다)", () => {
    expect(nextChainParam(page({ ids: [1], hasMore: false }))).toBeUndefined();
    expect(nextChainParam(page({ ids: [1], hasMore: true, fallback: true }))).toBeUndefined();
    expect(nextChainParam(page({ ids: [1], hasMore: true, chainId: "" }))).toBeUndefined();
  });
});

describe("recHiddenReducer", () => {
  const entry: RecHiddenEntry = {
    contentId: 7, kind: "dislike", title: "작품 7",
    requestId: "req-1", impressionId: "imp-7", previousState: "NONE",
  };

  it("숨기면 목록 끝에 쌓이고 같은 작품은 하나만 남는다", () => {
    const once = recHiddenReducer([], { type: "hide", entry });
    const twice = recHiddenReducer(once, { type: "hide", entry: { ...entry, kind: "not_interested" } });
    expect(twice).toHaveLength(1);
    expect(twice[0].kind).toBe("not_interested");
  });

  it("서버 응답이 오면 되돌리기에 쓸 previousState 를 덮어쓴다", () => {
    const state = recHiddenReducer([], { type: "hide", entry });
    const confirmed = recHiddenReducer(state, { type: "confirm", contentId: 7, previousState: "LIKE" });
    expect(confirmed[0].previousState).toBe("LIKE");
    expect(recHiddenReducer(confirmed, { type: "confirm", contentId: 999, previousState: "DISLIKE" })).toEqual(confirmed);
  });

  it("되돌리면 집합에서 빠지고, 체인이 바뀌면 비운다", () => {
    const state = recHiddenReducer([], { type: "hide", entry });
    expect(recHiddenReducer(state, { type: "restore", contentId: 7 })).toEqual([]);
    expect(recHiddenReducer(state, { type: "clear" })).toEqual([]);
  });

  it("hiddenIds 는 숨긴 작품 id 집합이다", () => {
    const state = recHiddenReducer([], { type: "hide", entry });
    expect([...hiddenIds(state)]).toEqual([7]);
    expect(hiddenIds([]).size).toBe(0);
  });
});

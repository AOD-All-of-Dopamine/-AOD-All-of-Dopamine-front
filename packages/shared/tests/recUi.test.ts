import { describe, it, expect } from "vitest";
import {
  parseRecTab,
  recCardContext,
  recCardFields,
  recFeedbackEnabled,
  recLoadedMoreFields,
  recNotice,
  recTabChangedFields,
  recWorkPath,
} from "../src/rec";
import type { RecCard } from "../src/types";

const card: RecCard = {
  impressionId: "imp-1",
  rank: 0,
  requestId: "req-1",
  work: { id: 42, domain: "MOVIE", title: "영화", thumbnail: null, score: 0 },
  reason: { type: "like", seedContentId: 9, text: "A를 좋아해서" },
};

describe("parseRecTab", () => {
  it("유효한 탭은 그대로, 나머지는 all 로 떨어진다", () => {
    expect(parseRecTab("game")).toBe("game");
    expect(parseRecTab("WEBTOON")).toBe("webtoon");
    expect(parseRecTab(" tv ")).toBe("tv");
    expect(parseRecTab(null)).toBe("all");
    expect(parseRecTab("")).toBe("all");
    expect(parseRecTab("없는탭")).toBe("all");
  });
});

describe("recNotice", () => {
  it("추천이 나오면 아무 안내도 없다", () => {
    expect(recNotice({ fallback: false, fallbackReason: null })).toBeNull();
  });

  it("비로그인은 로그인 배너, 시드 0 은 온보딩으로 보낸다", () => {
    expect(recNotice({ fallback: true, fallbackReason: "anonymous" })).toMatchObject({ kind: "login", actionTo: "/login" });
    expect(recNotice({ fallback: true, fallbackReason: "no_seed" })).toMatchObject({
      kind: "seed",
      actionTo: "/onboarding",
      actionLabel: "작품 고르기",
    });
  });

  it("이 분야에만 시드가 없으면 온보딩이 아니라 탐색으로 보낸다 (시드 자체는 있다)", () => {
    expect(recNotice({ fallback: true, fallbackReason: "no_seed_platform" })).toMatchObject({
      kind: "seed_platform",
      actionTo: "/explore",
    });
  });

  it("서버 사정(실패·타임아웃·차단기·꺼짐·0건)은 조용히 대체 목록만 보여 준다", () => {
    for (const reason of ["service_error", "timeout", "circuit_open", "disabled", "empty", "모르는값"]) {
      expect(recNotice({ fallback: true, fallbackReason: reason })).toBeNull();
    }
  });
});

describe("recFeedbackEnabled", () => {
  it("비로그인 대체에서만 피드백 버튼을 감춘다", () => {
    expect(recFeedbackEnabled({ fallback: false, fallbackReason: null })).toBe(true);
    expect(recFeedbackEnabled({ fallback: true, fallbackReason: "no_seed" })).toBe(true);
    expect(recFeedbackEnabled({ fallback: true, fallbackReason: "anonymous" })).toBe(false);
  });
});

describe("이벤트 필드", () => {
  it("카드 이벤트는 contentId·requestId·impressionId·surface 를 싣는다", () => {
    expect(recCardFields(card)).toEqual({
      contentId: 42, requestId: "req-1", impressionId: "imp-1", surface: "rec_tab",
    });
  });

  it("쓰기 요청 맥락은 source=rec_tab 이다", () => {
    expect(recCardContext(card)).toEqual({ source: "rec_tab", requestId: "req-1", impressionId: "imp-1" });
  });

  it("홈 추천 릴은 surface 를 넘겨 노출·클릭·반응을 추천 탭과 갈라 적는다", () => {
    expect(recCardFields(card, "home_rec").surface).toBe("home_rec");
    expect(recCardContext(card, "home_rec")).toEqual({ source: "home_rec", requestId: "req-1", impressionId: "imp-1" });
  });

  it("더 보기는 직전 쪽의 requestId 와 page_depth·tab 을 싣는다", () => {
    expect(recLoadedMoreFields({ requestId: "req-9", pageDepth: 2, tab: "game" })).toEqual({
      requestId: "req-9", surface: "rec_tab", payload: { page_depth: 2, tab: "game" },
    });
    expect(recLoadedMoreFields({ requestId: null, pageDepth: 0, tab: "all" }).requestId).toBeUndefined();
  });

  it("탭 전환은 from·to 만 싣는다", () => {
    expect(recTabChangedFields({ from: "all", to: "tv" })).toEqual({
      surface: "rec_tab", payload: { from: "all", to: "tv" },
    });
  });

  it("상세 링크에 rid·iid 를 붙인다 (2번이 상세에서 읽는다)", () => {
    expect(recWorkPath(card)).toBe("/work/42?rid=req-1&iid=imp-1");
  });
});

import { describe, it, expect } from "vitest";
import {
  parseRecTab,
  recCardContext,
  recCardFields,
  recLoadedMoreFields,
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

describe("이벤트 필드", () => {
  it("카드 이벤트는 contentId·requestId·impressionId 와 받은 surface 를 싣는다", () => {
    expect(recCardFields(card, "home_rec")).toEqual({
      contentId: 42, requestId: "req-1", impressionId: "imp-1", surface: "home_rec",
    });
  });

  it("쓰기 요청 맥락은 받은 surface 를 source 로 싣는다", () => {
    expect(recCardContext(card, "home_rec")).toEqual({ source: "home_rec", requestId: "req-1", impressionId: "imp-1" });
  });

  it("새 추천 받기는 떠나는 묶음의 requestId 와 page_depth·tab, 받은 surface 를 싣는다", () => {
    expect(recLoadedMoreFields({ requestId: "req-9", pageDepth: 2, tab: "game", surface: "home_rec" })).toEqual({
      requestId: "req-9", surface: "home_rec", payload: { page_depth: 2, tab: "game" },
    });
    expect(recLoadedMoreFields({ requestId: null, pageDepth: 0, tab: "all", surface: "home_rec" }).requestId).toBeUndefined();
  });

  it("칩 전환은 from·to 와 받은 surface 를 싣는다", () => {
    expect(recTabChangedFields({ from: "all", to: "tv", surface: "home_rec" })).toEqual({
      surface: "home_rec", payload: { from: "all", to: "tv" },
    });
  });

  it("안내 버튼으로 바꾸면 via=hint 를 붙여 칩 클릭과 가른다", () => {
    expect(recTabChangedFields({ from: "all", to: "webtoon", surface: "home_rec", via: "hint" }).payload).toEqual({
      from: "all", to: "webtoon", via: "hint",
    });
  });

  it("상세 링크에 rid·iid 를 붙인다 (2번이 상세에서 읽는다)", () => {
    expect(recWorkPath(card)).toBe("/work/42?rid=req-1&iid=imp-1");
  });
});

import { describe, it, expect } from "vitest";
import {
  chainIdForFirstRequest,
  homeRecCanRefresh,
  homeRecCanRestart,
  homeRecSetLabel,
  noSeedPlatformHint,
  railNextLeft,
  railPrevLeft,
  railWindow,
  railWindowLabel,
  type RailMetrics,
} from "../src/rec";

// 카드 168 · 간격 14 → 한 칸 182. 보이는 폭 1092 = 6장. 카드 30 + 끝 카드 = 31칸.
const base: RailMetrics = {
  scrollLeft: 0,
  clientWidth: 1092,
  scrollWidth: 31 * 182 - 14,
  itemWidth: 168,
  gap: 14,
  count: 30,
  hasEndCard: true,
};
const maxLeft = base.scrollWidth - base.clientWidth;

describe("railWindow", () => {
  it("처음 화면은 1–6, 쪽 막대는 끝 카드를 포함해 6쪽", () => {
    const w = railWindow(base);
    expect(w).toEqual({ first: 1, last: 6, total: 30, pages: 6, page: 0 });
    expect(railWindowLabel(w)).toBe("1–6 / 30");
  });

  it("한 화면 넘기면 7–12 · 2쪽", () => {
    expect(railWindow({ ...base, scrollLeft: 6 * 182 })).toMatchObject({ first: 7, last: 12, page: 1 });
  });

  it("끝까지 가면 숫자는 카드만(끝 카드 제외) · 막대는 마지막 쪽", () => {
    const w = railWindow({ ...base, scrollLeft: maxLeft });
    expect(w.last).toBe(30);
    expect(w.first).toBe(26);
    expect(w.page).toBe(5);
    expect(railWindowLabel(w)).toBe("26–30 / 30");
  });

  it("짧은 묶음(23장)도 전체를 카드 수로 센다", () => {
    const w = railWindow({ ...base, count: 23, scrollWidth: 24 * 182 - 14 });
    expect(w.total).toBe(23);
    expect(w.pages).toBe(4);
  });

  it("한 장만 보이면 '7 / 30' 모양", () => {
    const w = railWindow({ ...base, clientWidth: 168, scrollLeft: 6 * 182 });
    expect(railWindowLabel(w)).toBe("7 / 30");
  });

  it("화면이 줄 전체보다 넓어도 한 쪽", () => {
    const w = railWindow({ ...base, count: 3, hasEndCard: false, clientWidth: 2000, scrollWidth: 2000 });
    expect(w).toMatchObject({ first: 1, last: 3, pages: 1, page: 0 });
  });

  it("카드가 없으면 빈 값", () => {
    expect(railWindow({ ...base, count: 0 })).toEqual({ first: 0, last: 0, total: 0, pages: 0, page: 0 });
    expect(railWindowLabel(railWindow({ ...base, count: 0 }))).toBe("");
  });

  it("끝 판정에 4px 오차를 둔다 (소수점 스크롤)", () => {
    expect(railWindow({ ...base, scrollLeft: maxLeft - 3 }).page).toBe(5);
  });
});

describe("railWindow — 경계", () => {
  it("간격에 걸친 위치(170px)면 첫 카드는 2", () => {
    expect(railWindow({ ...base, scrollLeft: 170 }).first).toBe(2);
  });

  it("화면 폭이 한 칸의 배수가 아니면(1000px) 한 화면 5장 · 7쪽", () => {
    const w = railWindow({ ...base, clientWidth: 1000 });
    expect(w).toMatchObject({ first: 1, last: 5, pages: 7, page: 0 });
  });
});

describe("railNextLeft · railPrevLeft — 순환", () => {
  it("처음 쪽 오차 경계 — 4px 까지는 처음, 5px 부터는 한 화면 앞으로", () => {
    expect(railPrevLeft({ ...base, scrollLeft: 4 }).wrapped).toBe(true);
    expect(railPrevLeft({ ...base, scrollLeft: 5 })).toEqual({ left: 0, wrapped: false });
  });

  it("중간에서는 한 화면씩", () => {
    expect(railNextLeft(base)).toEqual({ left: 6 * 182, wrapped: false });
    expect(railPrevLeft({ ...base, scrollLeft: 12 * 182 })).toEqual({ left: 6 * 182, wrapped: false });
  });

  it("끝 근처에서는 끝까지만", () => {
    expect(railNextLeft({ ...base, scrollLeft: maxLeft - 100 })).toEqual({ left: maxLeft, wrapped: false });
  });

  it("끝에서 다음은 처음(즉시), 처음에서 이전은 끝(즉시)", () => {
    expect(railNextLeft({ ...base, scrollLeft: maxLeft })).toEqual({ left: 0, wrapped: true });
    expect(railNextLeft({ ...base, scrollLeft: maxLeft - 2 })).toEqual({ left: 0, wrapped: true });
    expect(railPrevLeft(base)).toEqual({ left: maxLeft, wrapped: true });
  });
});

describe("홈 추천 버튼 · 문구", () => {
  it("새 추천 받기는 개인 추천이고 다음 쪽이 있을 때만", () => {
    expect(homeRecCanRefresh("personal", true)).toBe(true);
    expect(homeRecCanRefresh("personal", false)).toBe(false);
    for (const mode of ["popular", "anon", "pick", "error", null] as const) {
      expect(homeRecCanRefresh(mode, true)).toBe(false);
    }
  });

  it("인기 목록에서 👍 가 있으면 내 취향으로 다시 받기", () => {
    expect(homeRecCanRestart("popular", 1)).toBe(true);
    expect(homeRecCanRestart("popular", 0)).toBe(false);
    expect(homeRecCanRestart("personal", 3)).toBe(false);
    expect(homeRecCanRestart("anon", 3)).toBe(false);
  });

  it("no_seed_platform 부제 — 전체 칩은 웹툰으로 안내, 그 밖은 안내만", () => {
    expect(noSeedPlatformHint("all")).toEqual({ text: "좋아요한 웹툰으로 추천을 볼 수 있어요", switchTo: "webtoon" });
    expect(noSeedPlatformHint("game").switchTo).toBeNull();
  });

  it("묶음 표시는 서버 깊이 기준, 첫 묶음은 없음", () => {
    expect(homeRecSetLabel(0)).toBeNull();
    expect(homeRecSetLabel(1)).toBe("새로 고른 추천 · 2번째");
    expect(homeRecSetLabel(4)).toBe("새로 고른 추천 · 5번째");
    expect(homeRecSetLabel(Number.NaN)).toBeNull();
  });
});

describe("chainIdForFirstRequest — 캐시 없을 때 이어 받기", () => {
  it("캐시가 있으면 저장된 체인을 싣는다", () => {
    expect(chainIdForFirstRequest({ storedChainId: "c", hasCachedPages: true, continueWithoutCache: false })).toBe("c");
  });

  it("쪽을 합치는 화면은 캐시가 없으면 싣지 않는다", () => {
    expect(chainIdForFirstRequest({ storedChainId: "c", hasCachedPages: false, continueWithoutCache: false })).toBeNull();
  });

  it("홈(마지막 묶음만)은 캐시가 없어도 이어 받는다", () => {
    expect(chainIdForFirstRequest({ storedChainId: "c", hasCachedPages: false, continueWithoutCache: true })).toBe("c");
    expect(chainIdForFirstRequest({ storedChainId: null, hasCachedPages: false, continueWithoutCache: true })).toBeNull();
  });
});

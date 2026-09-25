import { describe, it, expect } from "vitest";
import {
  homeLikesCaption,
  homeRecFeedbackEnabled,
  homeRecMode,
  homeRecShowsReason,
  homeRecTitle,
  type HomeRecMode,
} from "../src/rec";

const view = (fallback: boolean, fallbackReason: string | null = null) => ({ fallback, fallbackReason });
const httpError = (status: number) => ({ response: { status } });

describe("homeRecMode", () => {
  it("개인화 응답이면 personal", () => {
    expect(homeRecMode({ view: view(false), error: null, isAuthenticated: true })).toBe("personal");
  });

  it("비로그인 대체는 anon", () => {
    expect(homeRecMode({ view: view(true, "anonymous"), error: null, isAuthenticated: false })).toBe("anon");
  });

  it("취향 없음은 로그인이면 pick, 아니면 anon (고를 수 없다)", () => {
    expect(homeRecMode({ view: view(true, "no_seed"), error: null, isAuthenticated: true })).toBe("pick");
    expect(homeRecMode({ view: view(true, "no_seed"), error: null, isAuthenticated: false })).toBe("anon");
  });

  it.each(["no_seed_platform", "service_error", "timeout", "circuit_open", "disabled", "empty"])(
    "대체 사유 %s 는 popular",
    (reason) => {
      expect(homeRecMode({ view: view(true, reason), error: null, isAuthenticated: true })).toBe("popular");
    },
  );

  it("모르는 사유·사유 없음도 popular — 개인화처럼 보이지 않게", () => {
    expect(homeRecMode({ view: view(true, "brand_new_reason"), error: null, isAuthenticated: true })).toBe("popular");
    expect(homeRecMode({ view: view(true, null), error: null, isAuthenticated: true })).toBe("popular");
  });

  it("응답 없이 401 이면 anon (토큰 만료 — 섹션을 없애지 않고 로그인 안내)", () => {
    expect(homeRecMode({ view: null, error: httpError(401), isAuthenticated: true })).toBe("anon");
  });

  it("응답 없이 그 밖의 실패면 error", () => {
    expect(homeRecMode({ view: null, error: httpError(500), isAuthenticated: true })).toBe("error");
    expect(homeRecMode({ view: null, error: new Error("network"), isAuthenticated: true })).toBe("error");
  });

  it("응답이 있으면 재조회 오류가 있어도 받아 둔 목록으로 판정한다", () => {
    expect(homeRecMode({ view: view(false), error: httpError(500), isAuthenticated: true })).toBe("personal");
  });

  it("응답도 오류도 없으면 로딩(null)", () => {
    expect(homeRecMode({ view: null, error: null, isAuthenticated: true })).toBeNull();
    expect(homeRecMode({ view: null, error: undefined, isAuthenticated: false })).toBeNull();
  });
});

describe("homeRecTitle", () => {
  it("모드별 제목 — 대체 목록에는 '추천'·'취향'을 쓰지 않는다", () => {
    expect(homeRecTitle("personal", true)).toBe("내 취향 추천");
    expect(homeRecTitle("pick", true)).toBe("취향을 알려주세요");
    expect(homeRecTitle("popular", true)).toBe("지금 많이 찾는 작품");
    expect(homeRecTitle("anon", false)).toBe("지금 많이 찾는 작품");
  });

  it("모드를 모르면(로딩·오류) 로그인 여부로 고른다", () => {
    expect(homeRecTitle(null, true)).toBe("내 취향 추천");
    expect(homeRecTitle(null, false)).toBe("지금 많이 찾는 작품");
    expect(homeRecTitle("error", true)).toBe("내 취향 추천");
    expect(homeRecTitle("error", false)).toBe("지금 많이 찾는 작품");
  });
});

describe("homeRecFeedbackEnabled · homeRecShowsReason", () => {
  const modes: (HomeRecMode | null)[] = ["personal", "anon", "pick", "popular", "error", null];

  it("👍/👎 는 personal·popular 에만 (비로그인은 저장되지 않는다)", () => {
    expect(modes.filter(homeRecFeedbackEnabled)).toEqual(["personal", "popular"]);
  });

  it("이유 줄은 personal 에만", () => {
    expect(modes.filter(homeRecShowsReason)).toEqual(["personal"]);
  });
});

describe("homeLikesCaption", () => {
  it("좋아요가 없으면 null — 부제를 그리지 않는다", () => {
    expect(homeLikesCaption(0, 0)).toBeNull();
    expect(homeLikesCaption(Number.NaN, 3)).toBeNull();
  });

  it("보여 준 것보다 많을 때만 '외 N개'", () => {
    expect(homeLikesCaption(3, 3)).toBe("좋아요한 작품");
    expect(homeLikesCaption(2, 2)).toBe("좋아요한 작품");
    expect(homeLikesCaption(4, 3)).toBe("좋아요한 작품 외 1개");
    expect(homeLikesCaption(15, 3)).toBe("좋아요한 작품 외 12개");
  });
});

import { describe, it, expect } from "vitest";
import { REC_TABS, REC_FALLBACK_REASONS } from "../src/types";
import { HOME_REC_SET_SIZE, REC_TAB_LABELS, REC_PAGE_SIZE, REC_SURFACE } from "../src/constants";
import { recKeys } from "../src/queries";

describe("추천 탭 타입·상수", () => {
  it("탭 목록은 백엔드 RecommendService.TABS 와 같다", () => {
    expect([...REC_TABS]).toEqual(["all", "movie", "tv", "game", "webtoon", "webnovel"]);
  });

  it("탭마다 한글 라벨이 하나씩 있다", () => {
    expect(REC_TABS.every((tab) => typeof REC_TAB_LABELS[tab] === "string" && REC_TAB_LABELS[tab].length > 0)).toBe(true);
    expect(REC_TAB_LABELS.all).toBe("전체");
    expect(REC_TAB_LABELS.tv).toBe("시리즈");
  });

  it("대체 사유 목록은 백엔드가 내는 8종과 같다", () => {
    expect([...REC_FALLBACK_REASONS].sort()).toEqual(
      ["anonymous", "circuit_open", "disabled", "empty", "no_seed", "no_seed_platform", "service_error", "timeout"],
    );
  });

  it("한 쪽 기본 크기 20 · 홈 묶음 30(백엔드 상한) · 옛 추천 탭 surface 는 rec_tab 이다", () => {
    expect(REC_PAGE_SIZE).toBe(20);
    expect(HOME_REC_SET_SIZE).toBe(30);
    expect(REC_SURFACE).toBe("rec_tab");
  });

  it("recKeys 는 탭·체인 nonce 로 갈라지고 root 가 접두다", () => {
    expect(recKeys.root()).toEqual(["recommendations"]);
    expect(recKeys.list("game", "n-1")).toEqual(["recommendations", "game", "n-1"]);
    expect(recKeys.list("game", "n-2")).not.toEqual(recKeys.list("game", "n-1"));
    expect(recKeys.list("game", "n-1").slice(0, 1)).toEqual(recKeys.root());
  });
});

import { describe, it, expect } from "vitest";
import { recCardMeta, recCardMetaText } from "../src/constants";
import type { WorkSummary } from "../src/types";

const TODAY = new Date("2026-10-01T12:00:00");
const game = (over: Partial<WorkSummary> = {}): WorkSummary => ({
  id: 1, domain: "GAME", title: "Wuthering Waves", thumbnail: null, score: 0, releaseDate: "2025-05-22",
  steamReviewDesc: "Very Positive", steamPositivePct: 88, steamReviewCount: 41_000, creator: "KURO GAMES", ...over,
});
const text = (w: WorkSummary, tab: "game" | "all") => {
  const g = recCardMeta(w, tab, TODAY);
  return g ? recCardMetaText(g) : null;
};

describe("recCardMeta — 홈 추천 게임 카드 아래 줄 (시안 A)", () => {
  it("게임 탭: 판정 % · 연도 (개발사 없음)", () => {
    expect(text(game(), "game")).toBe("매우 긍정적 긍정 평가 88% · 2025");
    const groups = recCardMeta(game(), "game", TODAY)!;
    expect(groups[0]).toEqual([
      { text: "매우 긍정적", strong: true },
      { text: "88%", strong: true, srPrefix: "긍정 평가 " },
    ]);
    expect(groups[1]).toEqual([{ text: "2025" }]);
  });

  it("전체 탭: 게임 · 판정 % (연도 생략)", () => {
    expect(text(game(), "all")).toBe("게임 · 매우 긍정적 긍정 평가 88%");
  });

  it("부정 판정은 굵게 하지 않는다", () => {
    const groups = recCardMeta(game({ steamReviewDesc: "Mixed", steamPositivePct: 61 }), "game", TODAY)!;
    expect(groups[0][0]).toEqual({ text: "복합적", strong: false });
    expect(groups[0][1].strong).toBe(false);
  });

  it("리뷰가 적으면 % 없이 판정만, 판정 전 문구면 연도만", () => {
    expect(text(game({ steamReviewCount: 9 }), "game")).toBe("매우 긍정적 · 2025");
    expect(text(game({ steamReviewDesc: "3 user reviews", steamReviewCount: 3 }), "game")).toBe("2025");
    expect(text(game({ steamReviewDesc: null }), "all")).toBe("게임 · 2025"); // 판정이 없으면 전체 탭도 연도
  });

  it("출시 예정", () => {
    expect(text(game({ releaseDate: "2026-12-01", steamReviewDesc: null }), "game")).toBe("출시 예정 · 2026");
    expect(text(game({ releaseDate: "2026-12-01", steamReviewDesc: null }), "all")).toBe("게임 · 출시 예정");
  });

  it("비게임은 null — 지금 규칙(workCardMeta)을 쓴다", () => {
    expect(recCardMeta({ ...game(), domain: "MOVIE" }, "all", TODAY)).toBeNull();
  });

  it("아무 정보도 없으면 게임 탭은 null, 전체 탭은 도메인만", () => {
    expect(recCardMeta(game({ steamReviewDesc: null, releaseDate: undefined }), "game", TODAY)).toBeNull();
    expect(text(game({ steamReviewDesc: null, releaseDate: undefined }), "all")).toBe("게임");
  });
});

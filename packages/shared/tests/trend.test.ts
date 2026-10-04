import { describe, it, expect } from "vitest";
import { notableReasonText, rankChange, rankingSignal } from "../src/constants";

describe("rankChange — 순위 변동", () => {
  it("기준이 없으면 null(칸 비움) — 옛 응답 · 첫날", () => {
    expect(rankChange({ ranking: 3 })).toBeNull();
    expect(rankChange({ ranking: 3, previousRanking: 5, rankBaseDate: null })).toBeNull();
  });
  it("상승 · 하락 · 그대로 · NEW", () => {
    expect(rankChange({ ranking: 2, previousRanking: 5, rankBaseDate: "2026-10-03" })).toEqual({ kind: "up", steps: 3, text: "▲3", label: "3계단 상승" });
    expect(rankChange({ ranking: 7, previousRanking: 6, rankBaseDate: "2026-10-03" })).toEqual({ kind: "down", steps: 1, text: "▼1", label: "1계단 하락" });
    expect(rankChange({ ranking: 4, previousRanking: 4, rankBaseDate: "2026-10-03" })?.kind).toBe("same");
    expect(rankChange({ ranking: 1, previousRanking: null, rankBaseDate: "2026-10-03" })).toEqual({ kind: "new", text: "NEW", label: "새로 진입" });
  });
});

describe("notableReasonText — 주목 이유", () => {
  it("유형별 문구", () => {
    expect(notableReasonText({ type: "RANK", value: 6, platform: "Steam" })).toBe("스팀 6위");
    expect(notableReasonText({ type: "RANK", value: 3, platform: "NaverWebtoon" })).toBe("네이버웹툰 3위");
    expect(notableReasonText({ type: "VOTES", value: 12345 })).toBe("1.2만명 평가");
    expect(notableReasonText({ type: "REVIEWS", value: 458 })).toBe("리뷰 458개");
    expect(notableReasonText({ type: "LATEST", date: "2026-10-03" })).toBe("10월 3일 시작");
    expect(notableReasonText({ type: "LATEST", date: null })).toBe("");
  });
});

describe("rankingSignal — 순위 행 신호", () => {
  it("게임 판정 + 긍정 % · 적은 리뷰는 % 숨김", () => {
    expect(rankingSignal({ platform: "Steam", ratingScore: 0.938, ratingCount: 5000, ratingLabel: "Very Positive" })).toBe("매우 긍정적 94%");
    expect(rankingSignal({ platform: "Steam", ratingScore: 1, ratingCount: 3, ratingLabel: "Positive" })).toBe("긍정적");
    expect(rankingSignal({ platform: "Steam", ratingScore: 0.5, ratingCount: 3, ratingLabel: "3 user reviews" })).toBe("");
  });
  it("영화 별점 · 적은 투표 숨김 · 웹툰 빈 값", () => {
    expect(rankingSignal({ platform: "TMDB_MOVIE", ratingScore: 8.44, ratingCount: 900 })).toBe("★ 8.4");
    expect(rankingSignal({ platform: "TMDB_TV", ratingScore: 9, ratingCount: 4 })).toBe("");
    expect(rankingSignal({ platform: "NaverWebtoon" })).toBe("");
  });
});

import { describe, it, expect } from "vitest";
import {
  FEATURED_MAX_STALE_MS,
  featuredStaleTime,
  featuredSubline,
  msUntilNextFeaturedSwitch,
  releaseSubline,
} from "../src/constants";
import type { FeaturedReason } from "../src/types";

const steam = (over: Partial<FeaturedReason> = {}): FeaturedReason => ({
  platform: "Steam", ranking: 8, basis: "steam",
  ratingScore: 0.9431, ratingCount: 61_889, ratingLabel: "Very Positive", ...over,
});
const tmdb = (over: Partial<FeaturedReason> = {}): FeaturedReason => ({
  platform: "TMDB_MOVIE", ranking: 3, basis: "tmdb",
  ratingScore: 8.43, ratingCount: 2_760, ratingLabel: null, ...over,
});

describe("featuredSubline — 고른 근거 한 줄", () => {
  it("게임: 판정 · 반올림 % · 스팀 인기 순위", () => {
    expect(featuredSubline(steam())).toBe("매우 긍정적 94% · 스팀 인기 8위");
    expect(featuredSubline(steam({ ratingLabel: "Overwhelmingly Positive", ratingScore: 0.975 }))).toBe(
      "압도적으로 긍정적 98% · 스팀 인기 8위",
    );
  });

  it("영화 · 시리즈: 별점 소수 1자리 · 이번 주 인기 순위", () => {
    expect(featuredSubline(tmdb())).toBe("★ 8.4 · 이번 주 인기 3위");
    expect(featuredSubline(tmdb({ platform: "TMDB_TV", ranking: 12, ratingScore: 7.5 }))).toBe("★ 7.5 · 이번 주 인기 12위");
  });

  it("평가가 빠지면 순위만 — 적은 표본 규칙은 목록 카드와 같다", () => {
    expect(featuredSubline(steam({ ratingLabel: null, ratingScore: null, ratingCount: null }))).toBe("스팀 인기 8위");
    // 판정 전 문구("3 user reviews")면 %도 숨긴다
    expect(featuredSubline(steam({ ratingLabel: "3 user reviews", ratingCount: 3 }))).toBe("스팀 인기 8위");
    // 판정은 있지만 리뷰가 적으면 판정만
    expect(featuredSubline(steam({ ratingCount: 9 }))).toBe("매우 긍정적 · 스팀 인기 8위");
    expect(featuredSubline(tmdb({ ratingCount: 19 }))).toBe("이번 주 인기 3위");
    expect(featuredSubline(tmdb({ ratingScore: null }))).toBe("이번 주 인기 3위");
    expect(featuredSubline(tmdb({ ratingCount: null }))).toBe("이번 주 인기 3위");
  });
});

describe("releaseSubline — 대체(최신 출시)", () => {
  it("연도 출시, 날짜가 없으면 없음", () => {
    expect(releaseSubline({ releaseDate: "2026-09-20" })).toBe("2026 출시");
    expect(releaseSubline({ releaseDate: undefined })).toBeUndefined();
    expect(releaseSubline({ releaseDate: "" })).toBeUndefined();
  });
});

describe("msUntilNextFeaturedSwitch — 다음 05:00 KST 까지", () => {
  it("date 다음 날 05:00 KST(= date 20:00 UTC)", () => {
    const noonKst = Date.parse("2026-09-27T03:00:00Z"); // 09-27 12:00 KST
    expect(msUntilNextFeaturedSwitch("2026-09-27", noonKst)).toBe(17 * 3600_000);
    // 자정이 지나도 05:00 전이면 같은 날짜
    const twoAmKst = Date.parse("2026-09-27T17:00:00Z"); // 09-28 02:00 KST
    expect(msUntilNextFeaturedSwitch("2026-09-27", twoAmKst)).toBe(3 * 3600_000);
  });

  it("지났거나 형식이 틀리면 0", () => {
    expect(msUntilNextFeaturedSwitch("2026-09-27", Date.parse("2026-09-27T21:00:00Z"))).toBe(0);
    expect(msUntilNextFeaturedSwitch("", 0)).toBe(0);
    expect(msUntilNextFeaturedSwitch("2026/09/27", 0)).toBe(0);
  });

  it("staleTime 은 최대 30분, 바뀌기 직전엔 남은 시간, 없음(204)이면 30분", () => {
    const noonKst = Date.parse("2026-09-27T03:00:00Z");
    expect(featuredStaleTime("2026-09-27", noonKst)).toBe(FEATURED_MAX_STALE_MS);
    expect(featuredStaleTime("2026-09-27", Date.parse("2026-09-27T19:50:00Z"))).toBe(10 * 60_000);
    expect(featuredStaleTime(undefined)).toBe(FEATURED_MAX_STALE_MS);
  });
});

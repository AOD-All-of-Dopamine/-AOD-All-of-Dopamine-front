import { describe, it, expect } from "vitest";
import {
  EXTERNAL_RATING_MIN_VOTES,
  STEAM_PCT_MIN_REVIEWS,
  STEAM_REVIEW_DESC_KO,
  ageLabel,
  isPositiveSteamVerdict,
  isSteamVerdict,
  orderedWatchLabels,
  showExternalRating,
  showSteamPct,
  signalText,
  steamReviewDescKo,
  workLiteSignal,
} from "../src/constants";
import type { WorkSummary } from "../src/types";

const TODAY = new Date("2026-09-26T12:00:00");
const work = (over: Partial<WorkSummary>): WorkSummary => ({
  id: 1, domain: "GAME", title: "작품", thumbnail: null, score: 0, ...over,
});

describe("steamReviewDescKo", () => {
  it("9개 판정은 표대로", () => {
    for (const [en, ko] of Object.entries(STEAM_REVIEW_DESC_KO)) expect(steamReviewDescKo(en)).toBe(ko);
  });
  it("판정 전 문구도 한글로 — 단수 · 복수 · 천 단위", () => {
    expect(steamReviewDescKo("No user reviews")).toBe("평가 없음");
    expect(steamReviewDescKo("1 user review")).toBe("평가 1개");
    expect(steamReviewDescKo("5 user reviews")).toBe("평가 5개");
    expect(steamReviewDescKo("1,234 user reviews")).toBe("평가 1,234개");
  });
  it("모르는 값은 원문", () => {
    expect(steamReviewDescKo("Something new")).toBe("Something new");
  });
  it("판정 · 긍정 판정", () => {
    expect(isSteamVerdict("Mixed")).toBe(true);
    expect(isSteamVerdict("5 user reviews")).toBe(false);
    expect(isSteamVerdict(null)).toBe(false);
    expect(isPositiveSteamVerdict("Mostly Positive")).toBe(true);
    expect(isPositiveSteamVerdict("Mixed")).toBe(false);
    expect(isPositiveSteamVerdict("Overwhelmingly Negative")).toBe(false);
  });
});

describe("적은 표본 점수 숨김", () => {
  it("별점은 투표 20개부터, 수를 모르면 숨김", () => {
    expect(EXTERNAL_RATING_MIN_VOTES).toBe(20);
    expect(showExternalRating({ externalRating: 7.4, externalVoteCount: 19 })).toBe(false);
    expect(showExternalRating({ externalRating: 7.4, externalVoteCount: 20 })).toBe(true);
    expect(showExternalRating({ externalRating: 7.4, externalVoteCount: null })).toBe(false);
    expect(showExternalRating({ externalRating: 0, externalVoteCount: 500 })).toBe(false);
  });
  it("긍정 %는 판정이 있고 리뷰 10개부터", () => {
    expect(STEAM_PCT_MIN_REVIEWS).toBe(10);
    const base = { steamReviewDesc: "Positive", steamPositivePct: 90 };
    expect(showSteamPct({ ...base, steamReviewCount: 9 })).toBe(false);
    expect(showSteamPct({ ...base, steamReviewCount: 10 })).toBe(true);
    expect(showSteamPct({ ...base, steamReviewCount: undefined })).toBe(false);
    expect(showSteamPct({ steamReviewDesc: "5 user reviews", steamPositivePct: 100, steamReviewCount: 50 })).toBe(false);
  });
});

describe("ageLabel · orderedWatchLabels", () => {
  it("연령", () => {
    expect(ageLabel("15세이용가")).toBe("15세");
    expect(ageLabel("15세 이용가")).toBe("15세");
    expect(ageLabel("전체이용가")).toBeUndefined();
    expect(ageLabel(null)).toBeUndefined();
  });
  it("OTT 는 PLATFORM_LABELS 순서, 모르는 이름은 뒤, 수집 소스 제외", () => {
    expect(orderedWatchLabels(["TMDB_MOVIE", "Coupang Play", "Netflix"])).toEqual(["넷플릭스", "쿠팡플레이"]);
    expect(orderedWatchLabels(["Mystery OTT", "Watcha"])).toEqual(["왓챠", "Mystery OTT"]);
    expect(orderedWatchLabels(null)).toEqual([]);
  });
});

describe("workLiteSignal", () => {
  it("게임 — 판정 있음: 판정(긍정 굵게) · 연도 + %", () => {
    const s = workLiteSignal(work({ releaseDate: "2023-05-01", steamReviewDesc: "Very Positive", steamPositivePct: 94, steamReviewCount: 1200 }), TODAY);
    expect(signalText(s)).toBe("매우 긍정적 · 2023");
    expect(s.left[0]).toEqual({ text: "매우 긍정적", strong: true });
    expect(s.right).toEqual({ kind: "pct", text: "94%", srLabel: "긍정 평가" });
  });
  it("게임 — 부정 판정은 굵게 안 함, 리뷰 9개면 % 없음", () => {
    const s = workLiteSignal(work({ releaseDate: "2020-01-01", steamReviewDesc: "Mixed", steamPositivePct: 55, steamReviewCount: 9 }), TODAY);
    expect(s.left[0].strong).toBeUndefined();
    expect(s.right).toBeUndefined();
  });
  it("게임 — 판정 없으면 연도만 ('평가 없음'을 반복하지 않는다)", () => {
    const s = workLiteSignal(work({ releaseDate: "2026-09-25", steamReviewDesc: "No user reviews", steamReviewCount: 0 }), TODAY);
    expect(signalText(s)).toBe("2026");
    expect(s.right).toBeUndefined();
  });
  it("게임 — 출시 예정", () => {
    expect(signalText(workLiteSignal(work({ releaseDate: "2027-02-01" }), TODAY))).toBe("출시 예정 · 2027");
  });
  it("영화 — 연도 · OTT(외 N) + 별점(20표 이상)", () => {
    const s = workLiteSignal(work({ domain: "MOVIE", releaseDate: "2026-09-22", platforms: ["TMDB_MOVIE", "Netflix", "Watcha", "TVING"], externalRating: 7, externalVoteCount: 1 }), TODAY);
    expect(signalText(s)).toBe("2026 · 넷플릭스 외 2");
    expect(s.right).toBeUndefined();
    const t = workLiteSignal(work({ domain: "TV", releaseDate: "2019-01-01", platforms: ["Netflix"], externalRating: 8.24, externalVoteCount: 28347 }), TODAY);
    expect(signalText(t)).toBe("2019 · 넷플릭스");
    expect(t.right).toEqual({ kind: "star", text: "8.2", srLabel: "평점" });
  });
  it("영화 — OTT 없음", () => {
    expect(signalText(workLiteSignal(work({ domain: "MOVIE", releaseDate: "2021-01-01", platforms: ["TMDB_MOVIE"] }), TODAY))).toBe("2021");
  });
  it("웹툰 — 작가 · 요일웹툰(굵게) + 연령, 작가 없으면 상태만", () => {
    const s = workLiteSignal(work({ domain: "WEBTOON", creator: "작가A", status: "연재중", weekday: "mon", ageRating: "15세이용가" }), TODAY);
    expect(signalText(s)).toBe("작가A · 월요웹툰");
    expect(s.left[1].strong).toBe(true);
    expect(s.right?.text).toBe("15세");
    expect(signalText(workLiteSignal(work({ domain: "WEBTOON", status: "완결", weekday: "" }), TODAY))).toBe("완결");
    expect(signalText(workLiteSignal(work({ domain: "WEBTOON", status: "연재중", weekday: "" }), TODAY))).toBe("연재중");
  });
  it("웹소설 — 작가 또는 연도 + 연령", () => {
    expect(signalText(workLiteSignal(work({ domain: "WEBNOVEL", creator: "작가B", releaseDate: "2026-01-01", ageRating: "전체이용가" }), TODAY))).toBe("작가B");
    expect(signalText(workLiteSignal(work({ domain: "WEBNOVEL", releaseDate: "2026-01-01" }), TODAY))).toBe("2026");
  });
  it("중점 규칙 — 원문에 '·' 가 있어도 한 줄에 1개 이하", () => {
    const cases = [
      work({ domain: "WEBTOON", creator: "글·그림 작가", status: "연재중", weekday: "fri" }),
      work({ domain: "MOVIE", releaseDate: "2020-01-01", platforms: ["Netflix", "A·B TV"] }),
      work({ domain: "WEBNOVEL", creator: "가·나" }),
      work({ releaseDate: "2023-01-01", steamReviewDesc: "Positive", steamPositivePct: 80, steamReviewCount: 100 }),
    ];
    for (const c of cases) expect((signalText(workLiteSignal(c, TODAY)).match(/·/g) ?? []).length).toBeLessThanOrEqual(1);
  });
});

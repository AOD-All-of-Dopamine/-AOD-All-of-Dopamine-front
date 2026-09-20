import { describe, it, expect } from "vitest";
import {
  EMPTY_ONBOARDING_SELECTION,
  ONBOARDING_DOMAIN_HINT,
  ONBOARDING_MIN_PICKS,
  ONBOARDING_SOURCE,
  canFinishOnboarding,
  domainsBelowHint,
  isPicked,
  isSaved,
  onboardingReducer,
  onboardingStatusText,
  pendingPicks,
  picksByDomain,
  toOnboardingPick,
  type OnboardingPick,
  type OnboardingSelection,
} from "../src/rec";
import type { WorkSummary } from "../src/types";

const pick = (contentId: number, domain: string): OnboardingPick => ({
  contentId,
  domain,
  title: `작품 ${contentId}`,
});

/** 여러 개를 차례로 토글한 상태를 만든다. */
const pickAll = (...picks: OnboardingPick[]): OnboardingSelection =>
  picks.reduce(
    (state, next) => onboardingReducer(state, { type: "toggle", pick: next }),
    EMPTY_ONBOARDING_SELECTION,
  );

describe("상수", () => {
  it("최소 3개 · 분야 권장 2개 · 출처는 onboarding 이다", () => {
    expect(ONBOARDING_MIN_PICKS).toBe(3);
    expect(ONBOARDING_DOMAIN_HINT).toBe(2);
    expect(ONBOARDING_SOURCE).toBe("onboarding");
  });
});

describe("toOnboardingPick", () => {
  it("WorkSummary 에서 contentId·domain·title 만 가져온다", () => {
    const work: WorkSummary = {
      id: 7,
      domain: "GAME",
      title: "테스트 게임",
      thumbnail: null,
      score: 0,
      genres: ["액션"],
    };
    expect(toOnboardingPick(work)).toEqual({ contentId: 7, domain: "GAME", title: "테스트 게임" });
  });
});

describe("onboardingReducer - toggle", () => {
  it("처음 누르면 고른 순서대로 붙는다", () => {
    const state = pickAll(pick(1, "GAME"), pick(2, "MOVIE"));
    expect(state.picks.map((p) => p.contentId)).toEqual([1, 2]);
    expect(isPicked(state, 1)).toBe(true);
    expect(isPicked(state, 9)).toBe(false);
  });

  it("다시 누르면 빠지고, 나머지 순서는 그대로다", () => {
    const state = onboardingReducer(pickAll(pick(1, "GAME"), pick(2, "MOVIE"), pick(3, "TV")), {
      type: "toggle",
      pick: pick(2, "MOVIE"),
    });
    expect(state.picks.map((p) => p.contentId)).toEqual([1, 3]);
  });

  it("같은 작품을 두 번 담지 않는다", () => {
    const once = pickAll(pick(1, "GAME"));
    const twice = onboardingReducer(onboardingReducer(once, { type: "toggle", pick: pick(1, "GAME") }), {
      type: "toggle",
      pick: pick(1, "GAME"),
    });
    expect(twice.picks.map((p) => p.contentId)).toEqual([1]);
  });

  it("이미 저장된 작품은 해제되지 않는다 (서버에 진짜 좋아요가 남아 있다)", () => {
    const saved = onboardingReducer(pickAll(pick(1, "GAME"), pick(2, "MOVIE")), {
      type: "saved",
      contentIds: [1],
    });
    const after = onboardingReducer(saved, { type: "toggle", pick: pick(1, "GAME") });
    expect(after).toBe(saved); // 같은 참조 — 아무 일도 일어나지 않는다
    expect(isSaved(after, 1)).toBe(true);
    expect(isSaved(after, 2)).toBe(false);
  });
});

describe("onboardingReducer - saved", () => {
  it("성공분을 쌓고 중복은 한 번만 남긴다", () => {
    const base = pickAll(pick(1, "GAME"), pick(2, "MOVIE"), pick(3, "TV"));
    const first = onboardingReducer(base, { type: "saved", contentIds: [1, 2] });
    const second = onboardingReducer(first, { type: "saved", contentIds: [2, 3] });
    expect([...second.saved]).toEqual([1, 2, 3]);
  });

  it("더할 것이 없으면 상태를 그대로 둔다", () => {
    const base = onboardingReducer(pickAll(pick(1, "GAME")), { type: "saved", contentIds: [1] });
    expect(onboardingReducer(base, { type: "saved", contentIds: [1] })).toBe(base);
  });
});

describe("pendingPicks", () => {
  it("아직 저장하지 않은 것만, 고른 순서로 돌려준다", () => {
    const state = onboardingReducer(pickAll(pick(1, "GAME"), pick(2, "MOVIE"), pick(3, "TV")), {
      type: "saved",
      contentIds: [2],
    });
    expect(pendingPicks(state).map((p) => p.contentId)).toEqual([1, 3]);
  });
});

describe("canFinishOnboarding · picksByDomain · domainsBelowHint", () => {
  it("3개 미만이면 완료할 수 없다", () => {
    expect(canFinishOnboarding(EMPTY_ONBOARDING_SELECTION)).toBe(false);
    expect(canFinishOnboarding(pickAll(pick(1, "GAME"), pick(2, "GAME")))).toBe(false);
    expect(canFinishOnboarding(pickAll(pick(1, "GAME"), pick(2, "GAME"), pick(3, "MOVIE")))).toBe(true);
  });

  it("분야별 개수를 센다", () => {
    const state = pickAll(pick(1, "GAME"), pick(2, "GAME"), pick(3, "MOVIE"));
    expect(picksByDomain(state)).toEqual({ GAME: 2, MOVIE: 1 });
    expect(picksByDomain(EMPTY_ONBOARDING_SELECTION)).toEqual({});
  });

  it("권장치를 못 채운 분야만 알려 준다 (안 고른 분야는 재촉하지 않는다)", () => {
    const state = pickAll(pick(1, "GAME"), pick(2, "GAME"), pick(3, "MOVIE"));
    expect(domainsBelowHint(state)).toEqual(["MOVIE"]);
    expect(domainsBelowHint(EMPTY_ONBOARDING_SELECTION)).toEqual([]);
  });
});

describe("onboardingStatusText", () => {
  it("남은 개수를 알려 주고, 채우면 완료 가능하다고 말한다", () => {
    expect(onboardingStatusText(EMPTY_ONBOARDING_SELECTION)).toBe(
      "아직 고른 작품이 없어요. 최소 3개를 골라 주세요.",
    );
    expect(onboardingStatusText(pickAll(pick(1, "GAME")))).toBe("1개 선택 — 2개 더 고르면 완료할 수 있어요.");
    expect(onboardingStatusText(pickAll(pick(1, "GAME"), pick(2, "GAME"), pick(3, "TV")))).toBe(
      "3개 선택 — 완료할 수 있어요.",
    );
  });
});

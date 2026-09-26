import { DOMAIN_LABEL_MAP } from "../constants/domain";
import type { WorkSummary } from "../types";

/** 완료에 필요한 최소 선택 수 (REC_TAB_DESIGN §2-5). */
export const ONBOARDING_MIN_PICKS = 3;

/**
 * 분야마다 이만큼 고르면 추천이 넓어진다는 권장치 — **강제하지 않는다**(§2-5).
 * 플랫폼당 시드가 1개면 M6 혼합 할당이 절반이 되고 TMDB 는 깊은 페이지가 무너진다.
 */
export const ONBOARDING_DOMAIN_HINT = 2;

/** 반응 요청에 싣는 출처. 서버 reaction_changed 의 payload.source 로 남는다(§2-5). */
export const ONBOARDING_SOURCE = "onboarding";

/** 온보딩에서 고른 작품 한 개. 기본 목록에서 왔든 검색에서 왔든 같은 모양으로 담는다. */
export interface OnboardingPick {
  contentId: number;
  /** contents.domain (MOVIE·TV·GAME·WEBTOON·WEBNOVEL). 분야별 개수에 쓴다. */
  domain: string;
  /** 토스트·안내 문구용. */
  title: string;
}

/**
 * 온보딩 선택 상태.
 * - `picks` = 사용자가 고른 것, 고른 순서(저장 순서이기도 하다)
 * - `saved` = 서버에 좋아요로 들어간 것이 확정된 contentId. 다시 보내지 않고, 화면에서 뺄 수도 없다
 */
export interface OnboardingSelection {
  picks: readonly OnboardingPick[];
  saved: readonly number[];
}

export const EMPTY_ONBOARDING_SELECTION: OnboardingSelection = { picks: [], saved: [] };

export type OnboardingAction =
  | { type: "toggle"; pick: OnboardingPick }
  /**
   * 서버가 받아들인 것이 확정됐다. **id 가 아니라 pick 을 싣는다** —
   * 저장이 도는 동안 해제된 작품도 되돌려 놓아야 `saved ⊆ picks` 가 깨지지 않는다
   * (깨지면 그 타일이 "선택 안 됨"인데 영영 눌리지 않고, 완료 조건도 실제 좋아요 수와 어긋난다).
   */
  | { type: "saved"; picks: readonly OnboardingPick[] };

/** 목록·검색이 주는 WorkSummary 에서 필요한 세 값만 가져온다. */
export function toOnboardingPick(work: WorkSummary): OnboardingPick {
  return { contentId: work.id, domain: work.domain, title: work.title };
}

export function isPicked(state: OnboardingSelection, contentId: number): boolean {
  return state.picks.some((pick) => pick.contentId === contentId);
}

export function isSaved(state: OnboardingSelection, contentId: number): boolean {
  return state.saved.includes(contentId);
}

export function onboardingReducer(
  state: OnboardingSelection,
  action: OnboardingAction,
): OnboardingSelection {
  switch (action.type) {
    case "toggle": {
      const { contentId } = action.pick;
      // 이미 서버에 좋아요로 들어간 작품은 화면에서 뺄 수 없다 —
      // 화면만 지우면 서버에 좋아요가 남아 실제 상태와 어긋난다(화면은 안내 토스트를 띄운다).
      if (isSaved(state, contentId)) return state;
      return {
        ...state,
        picks: isPicked(state, contentId)
          ? state.picks.filter((pick) => pick.contentId !== contentId)
          : [...state.picks, action.pick],
      };
    }
    case "saved": {
      let picks = state.picks;
      const saved = [...state.saved];
      for (const pick of action.picks) {
        if (!saved.includes(pick.contentId)) saved.push(pick.contentId);
        // 저장이 도는 동안 해제된 것은 다시 담는다 — 서버에 좋아요가 남아 있으니 화면도 그래야 한다.
        if (!picks.some((current) => current.contentId === pick.contentId)) picks = [...picks, pick];
      }
      if (picks === state.picks && saved.length === state.saved.length) return state;
      return { picks, saved };
    }
    default:
      return state;
  }
}

/** 아직 저장하지 않은 것 = `완료` 가 보낼 목록. 고른 순서를 지킨다. */
export function pendingPicks(state: OnboardingSelection): OnboardingPick[] {
  return state.picks.filter((pick) => !state.saved.includes(pick.contentId));
}

/** 서버에 좋아요로 들어간 것. `saved ⊆ picks` 라 항상 pick 을 찾을 수 있다. */
export function savedPicks(state: OnboardingSelection): OnboardingPick[] {
  return state.picks.filter((pick) => state.saved.includes(pick.contentId));
}

export function canFinishOnboarding(state: OnboardingSelection): boolean {
  return state.picks.length >= ONBOARDING_MIN_PICKS;
}

/** 분야(도메인)별로 몇 개 골랐는지. 칩 뱃지에 쓴다. */
export function picksByDomain(state: OnboardingSelection): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const pick of state.picks) {
    counts[pick.domain] = (counts[pick.domain] ?? 0) + 1;
  }
  return counts;
}

/** 권장치를 못 채운 분야. **고른 적 있는 분야만** 본다 — 안 건드린 분야를 재촉하지 않는다. */
export function domainsBelowHint(state: OnboardingSelection): string[] {
  const counts = picksByDomain(state);
  return Object.keys(counts).filter((domain) => counts[domain] < ONBOARDING_DOMAIN_HINT);
}

/** `role="status"` 로 읽어 줄 한 줄. 선택이 바뀔 때마다 스크린 리더가 읽는다. */
export function onboardingStatusText(state: OnboardingSelection): string {
  const count = state.picks.length;
  if (count === 0) {
    return `아직 고른 작품이 없어요. 최소 ${ONBOARDING_MIN_PICKS}개를 골라 주세요.`;
  }
  const remaining = ONBOARDING_MIN_PICKS - count;
  if (remaining > 0) return `${count}개 선택 — ${remaining}개 더 고르면 완료할 수 있어요.`;

  // 완료할 수 있게 된 **뒤에만** 분야 권장치를 귀띔한다 — 최소 개수를 채우는 일이 먼저다.
  // (권장일 뿐이라 막지 않는다 — §2-5. 줄을 새로 만들지 않고 같은 status 줄에 붙인다.)
  const thin = domainsBelowHint(state);
  if (thin.length === 0) return `${count}개 선택 — 완료할 수 있어요.`;
  const labels = thin.map((domain) => DOMAIN_LABEL_MAP[domain] ?? domain).join("·");
  return `${count}개 선택 — 완료할 수 있어요. ${labels}에서 1개 더 고르면 추천이 넓어져요.`;
}

/**
 * 홈 추천 "전체" 칩이 섞는 도메인 (백엔드 PLATFORMS_BY_TAB). **웹툰은 빠져 있다.**
 * 그래서 웹툰만 고른 사용자는 전체 칩에서 no_seed_platform 대체를 받는다.
 */
const ALL_TAB_DOMAINS: readonly string[] = ["GAME", "MOVIE", "TV", "WEBNOVEL"];

/**
 * 저장을 마친 뒤 어디로 보낼지 (설계 §2-7 · 추천 탭 제거 2026-09-26 뒤로는 홈 추천).
 * 전체 칩이 읽어 줄 시드가 하나라도 있으면 `/home`, 웹툰만 골랐으면 웹툰 칩(`?rec=webtoon`)으로 바로 보낸다 —
 * 방금 취향을 고른 사람에게 "이 분야에는 취향이 없어요" 안내를 띄우지 않으려는 것이다.
 */
export function onboardingLandingPath(savedDomains: readonly string[]): string {
  if (savedDomains.length === 0) return "/home";
  if (savedDomains.some((domain) => ALL_TAB_DOMAINS.includes(domain))) return "/home";
  // 전부 웹툰일 때만 칩을 바꾼다 — 모르는 도메인이 섞이면 판단할 근거가 없으니 기본값으로 둔다.
  return savedDomains.every((domain) => domain === "WEBTOON") ? "/home?rec=webtoon" : "/home";
}

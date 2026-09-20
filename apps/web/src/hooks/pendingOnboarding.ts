/**
 * 가입 → 로그인 사이에 "온보딩이 필요하다"를 실어 나르는 표시 (설계 §4-1).
 *
 * 가입 API 는 토큰을 주지 않으므로 가입 직후에는 로그인 상태가 아니고, 로그인이 필요한
 * /onboarding 으로 바로 갈 수 없다. 그래서 가입 응답의 needsOnboarding 을 여기에 남겨 두고
 * 같은 탭에서 그 아이디로 로그인에 성공할 때 한 번만 꺼내 쓴다.
 *
 * sessionStorage 를 쓴다 — 탭을 닫으면 사라지고 다른 탭으로 새지 않는다.
 * 표시를 잃어도 손해는 없다: /for-you 의 시드 0 안내 카드가 같은 자리로 데려간다.
 * 컴포넌트 파일이 아니라 훅 디렉터리에 둔다(웹 ESLint react-refresh/only-export-components).
 */
const PENDING_ONBOARDING_KEY = "aod.pendingOnboarding";

export function markPendingOnboarding(username: string): void {
  try {
    sessionStorage.setItem(PENDING_ONBOARDING_KEY, username);
  } catch {
    // 시크릿 모드·저장소 차단에서는 포기한다 (표시는 편의일 뿐이다)
  }
}

/** 이 아이디로 온보딩이 예약돼 있었는지. **읽으면서 지운다** — 한 번만 쓴다. */
export function takePendingOnboarding(username: string): boolean {
  try {
    const stored = sessionStorage.getItem(PENDING_ONBOARDING_KEY);
    if (stored === null) return false;
    sessionStorage.removeItem(PENDING_ONBOARDING_KEY);
    return stored === username;
  } catch {
    return false;
  }
}

export function clearPendingOnboarding(): void {
  try {
    sessionStorage.removeItem(PENDING_ONBOARDING_KEY);
  } catch {
    // 위와 같다
  }
}

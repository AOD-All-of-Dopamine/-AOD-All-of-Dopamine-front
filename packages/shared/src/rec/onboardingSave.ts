/**
 * 온보딩 `완료` 의 저장 큐 (설계 §3-3·§3-4).
 * 규칙 하나: **절대 거부되지 않는다.** 모든 contentId 가 saved 또는 failed 로 끝나야
 * 화면이 "성공분은 다시 보내지 않고, 실패분만 남겨 재시도"를 할 수 있다.
 */

/** 동시에 보낼 저장 요청 수. 순차보다 빠르고 EC2 t3.small(Tomcat 최대 20 스레드)에도 무해하다. */
export const ONBOARDING_SAVE_CONCURRENCY = 3;

export interface OnboardingSaveResult {
  /** 서버가 받아들인 contentId (입력 순서). 다시 보내지 않는다. */
  saved: number[];
  /** 실패한 contentId (입력 순서). 선택된 채로 남겨 두고 다시 시도한다. */
  failed: number[];
  /**
   * 실패 중 하나라도 "인증 만료"(웹에서는 401)였는지.
   * 이건 **다시 시도해도 같다** — 화면은 재시도를 권하는 대신 로그인으로 보내야 한다.
   */
  authFailed: boolean;
}

export interface OnboardingSaveOptions {
  /** 동시 요청 수. 1 이면 순차. 기본 ONBOARDING_SAVE_CONCURRENCY. */
  concurrency?: number;
  /**
   * 오류 하나를 "인증 만료"로 판정한다. shared 는 axios(HTTP)를 모르므로 앱이 넘긴다
   * (웹은 `recErrorStatus(error) === 401`). 안 넘기면 authFailed 는 늘 false 다.
   */
  isAuthError?: (error: unknown) => boolean;
}

export async function runOnboardingSave(
  contentIds: readonly number[],
  save: (contentId: number) => Promise<unknown>,
  options: OnboardingSaveOptions = {},
): Promise<OnboardingSaveResult> {
  // 같은 작품을 두 번 보내지 않는다 (서버는 멱등이지만 요청을 낭비할 이유가 없다).
  const ids = [...new Set(contentIds)];
  if (ids.length === 0) return { saved: [], failed: [], authFailed: false };

  const requested = options.concurrency ?? ONBOARDING_SAVE_CONCURRENCY;
  const workers = Number.isFinite(requested)
    ? Math.max(1, Math.min(Math.floor(requested), ids.length))
    : Math.min(ONBOARDING_SAVE_CONCURRENCY, ids.length);

  const ok = new Array<boolean>(ids.length).fill(false);
  let cursor = 0;
  let authFailed = false;

  const runWorker = async (): Promise<void> => {
    for (;;) {
      const index = cursor;
      cursor += 1;
      if (index >= ids.length) return;
      try {
        await save(ids[index]);
        ok[index] = true;
      } catch (error) {
        // 실패는 결과로만 알린다 — 한 건이 무너져도 나머지는 계속 보낸다.
        ok[index] = false;
        if (!authFailed) {
          try {
            if (options.isAuthError?.(error) === true) authFailed = true;
          } catch {
            // 판정기가 깨져도 저장 결과는 지킨다 ("절대 거부되지 않는다"가 이 함수의 규칙이다).
          }
        }
      }
    }
  };

  await Promise.all(Array.from({ length: workers }, () => runWorker()));

  const saved: number[] = [];
  const failed: number[] = [];
  ids.forEach((contentId, index) => {
    if (ok[index]) saved.push(contentId);
    else failed.push(contentId);
  });
  return { saved, failed, authFailed };
}

/** 토큰이 만료됐을 때의 안내. 재시도가 아니라 로그인이 답이다. */
export const ONBOARDING_AUTH_EXPIRED_MESSAGE = "로그인이 만료됐어요. 다시 로그인해 주세요.";

/** 저장 결과를 토스트 한 줄로. 알릴 것이 없으면 null (= 이동해도 된다). */
export function onboardingSaveMessage(result: OnboardingSaveResult): string | null {
  // "다시 시도해 주세요"는 401 에서 거짓말이다 — 몇 번을 눌러도 같은 401 이 온다.
  if (result.authFailed) return ONBOARDING_AUTH_EXPIRED_MESSAGE;
  if (result.failed.length === 0) return null;
  if (result.saved.length === 0) return "작품을 담지 못했어요. 잠시 후 다시 시도해 주세요.";
  return `${result.failed.length}개를 담지 못했어요. 다시 시도해 주세요.`;
}

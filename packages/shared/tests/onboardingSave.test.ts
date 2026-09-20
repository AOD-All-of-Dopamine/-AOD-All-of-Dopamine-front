import { describe, it, expect } from "vitest";
import {
  ONBOARDING_AUTH_EXPIRED_MESSAGE,
  ONBOARDING_SAVE_CONCURRENCY,
  onboardingSaveMessage,
  recErrorStatus,
  runOnboardingSave,
} from "../src/rec";

/** contentId 가 failIds 에 있으면 거부하는 가짜 저장기. 호출 순서도 기록한다. */
const fakeSave = (failIds: number[] = []) => {
  const calls: number[] = [];
  const save = async (contentId: number): Promise<void> => {
    calls.push(contentId);
    if (failIds.includes(contentId)) throw new Error(`fail ${contentId}`);
  };
  return { calls, save };
};

/** 웹이 넘기는 판정기와 같은 것 (axios 오류 모양만 본다). */
const isAuthError = (error: unknown) => recErrorStatus(error) === 401;

/** status 를 단 가짜 axios 오류. */
const httpError = (status: number) => ({ response: { status } });

describe("runOnboardingSave", () => {
  it("기본 동시 요청 수는 3이다", () => {
    expect(ONBOARDING_SAVE_CONCURRENCY).toBe(3);
  });

  it("빈 목록은 아무것도 보내지 않는다", async () => {
    const { calls, save } = fakeSave();
    expect(await runOnboardingSave([], save)).toEqual({ saved: [], failed: [], authFailed: false });
    expect(calls).toEqual([]);
  });

  it("전부 성공하면 입력 순서대로 saved 에 담긴다", async () => {
    const { calls, save } = fakeSave();
    const result = await runOnboardingSave([10, 20, 30], save, { concurrency: 1 });
    expect(result).toEqual({ saved: [10, 20, 30], failed: [], authFailed: false });
    expect(calls).toEqual([10, 20, 30]);
  });

  it("일부가 실패해도 거부되지 않고 성공·실패를 갈라 준다", async () => {
    const { save } = fakeSave([20]);
    const result = await runOnboardingSave([10, 20, 30], save, { concurrency: 1 });
    expect(result).toEqual({ saved: [10, 30], failed: [20], authFailed: false });
  });

  it("전부 실패해도 거부되지 않는다", async () => {
    const { save } = fakeSave([10, 20]);
    await expect(runOnboardingSave([10, 20], save, { concurrency: 2 })).resolves.toEqual({
      saved: [],
      failed: [10, 20],
      authFailed: false,
    });
  });

  it("같은 작품은 한 번만 보낸다", async () => {
    const { calls, save } = fakeSave();
    const result = await runOnboardingSave([10, 10, 20], save, { concurrency: 1 });
    expect(calls).toEqual([10, 20]);
    expect(result.saved).toEqual([10, 20]);
  });

  it("동시에 날아가는 요청 수가 상한을 넘지 않는다", async () => {
    let inFlight = 0;
    let peak = 0;
    const save = async (): Promise<void> => {
      inFlight += 1;
      peak = Math.max(peak, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 1));
      inFlight -= 1;
    };
    const result = await runOnboardingSave([1, 2, 3, 4, 5, 6, 7], save, { concurrency: 2 });
    expect(peak).toBe(2);
    expect(result.saved).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it("0이나 음수를 줘도 최소 1건씩은 보낸다", async () => {
    const { calls, save } = fakeSave();
    await runOnboardingSave([1, 2], save, { concurrency: 0 });
    expect(calls.sort()).toEqual([1, 2]);
  });

  it("401 이 하나라도 섞이면 authFailed 로 알린다 (나머지는 계속 보낸다)", async () => {
    const calls: number[] = [];
    const save = async (contentId: number): Promise<void> => {
      calls.push(contentId);
      if (contentId === 20) throw httpError(401);
    };
    const result = await runOnboardingSave([10, 20, 30], save, { concurrency: 1, isAuthError });
    expect(result).toEqual({ saved: [10, 30], failed: [20], authFailed: true });
    expect(calls).toEqual([10, 20, 30]);
  });

  it("401 이 아닌 실패는 authFailed 가 아니다", async () => {
    const save = async (): Promise<void> => {
      throw httpError(500);
    };
    const result = await runOnboardingSave([10], save, { isAuthError });
    expect(result).toEqual({ saved: [], failed: [10], authFailed: false });
  });

  it("판정기를 안 넘기면 authFailed 는 늘 false 다", async () => {
    const save = async (): Promise<void> => {
      throw httpError(401);
    };
    expect((await runOnboardingSave([10], save)).authFailed).toBe(false);
  });

  it("판정기가 던져도 저장 결과는 지킨다 (절대 거부되지 않는다)", async () => {
    const { save } = fakeSave([10]);
    const result = await runOnboardingSave([10, 20], save, {
      concurrency: 1,
      isAuthError: () => {
        throw new Error("판정 실패");
      },
    });
    expect(result).toEqual({ saved: [20], failed: [10], authFailed: false });
  });
});

describe("onboardingSaveMessage", () => {
  it("전부 성공이면 알릴 것이 없다", () => {
    expect(onboardingSaveMessage({ saved: [1, 2], failed: [], authFailed: false })).toBeNull();
  });

  it("일부 실패는 개수를 알려 준다", () => {
    expect(onboardingSaveMessage({ saved: [1], failed: [2, 3], authFailed: false })).toBe(
      "2개를 담지 못했어요. 다시 시도해 주세요.",
    );
  });

  it("전부 실패는 개수를 세지 않는다", () => {
    expect(onboardingSaveMessage({ saved: [], failed: [2, 3], authFailed: false })).toBe(
      "작품을 담지 못했어요. 잠시 후 다시 시도해 주세요.",
    );
  });

  it("인증 만료는 '다시 시도' 라고 하지 않는다 — 로그인이 답이다", () => {
    expect(onboardingSaveMessage({ saved: [1], failed: [2], authFailed: true })).toBe(
      ONBOARDING_AUTH_EXPIRED_MESSAGE,
    );
    expect(ONBOARDING_AUTH_EXPIRED_MESSAGE).toBe("로그인이 만료됐어요. 다시 로그인해 주세요.");
  });
});

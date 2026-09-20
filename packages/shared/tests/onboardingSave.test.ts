import { describe, it, expect } from "vitest";
import {
  ONBOARDING_SAVE_CONCURRENCY,
  onboardingSaveMessage,
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

describe("runOnboardingSave", () => {
  it("기본 동시 요청 수는 3이다", () => {
    expect(ONBOARDING_SAVE_CONCURRENCY).toBe(3);
  });

  it("빈 목록은 아무것도 보내지 않는다", async () => {
    const { calls, save } = fakeSave();
    expect(await runOnboardingSave([], save)).toEqual({ saved: [], failed: [] });
    expect(calls).toEqual([]);
  });

  it("전부 성공하면 입력 순서대로 saved 에 담긴다", async () => {
    const { calls, save } = fakeSave();
    const result = await runOnboardingSave([10, 20, 30], save, { concurrency: 1 });
    expect(result).toEqual({ saved: [10, 20, 30], failed: [] });
    expect(calls).toEqual([10, 20, 30]);
  });

  it("일부가 실패해도 거부되지 않고 성공·실패를 갈라 준다", async () => {
    const { save } = fakeSave([20]);
    const result = await runOnboardingSave([10, 20, 30], save, { concurrency: 1 });
    expect(result).toEqual({ saved: [10, 30], failed: [20] });
  });

  it("전부 실패해도 거부되지 않는다", async () => {
    const { save } = fakeSave([10, 20]);
    await expect(runOnboardingSave([10, 20], save, { concurrency: 2 })).resolves.toEqual({
      saved: [],
      failed: [10, 20],
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
});

describe("onboardingSaveMessage", () => {
  it("전부 성공이면 알릴 것이 없다", () => {
    expect(onboardingSaveMessage({ saved: [1, 2], failed: [] })).toBeNull();
  });

  it("일부 실패는 개수를 알려 준다", () => {
    expect(onboardingSaveMessage({ saved: [1], failed: [2, 3] })).toBe(
      "2개를 담지 못했어요. 다시 시도해 주세요.",
    );
  });

  it("전부 실패는 개수를 세지 않는다", () => {
    expect(onboardingSaveMessage({ saved: [], failed: [2, 3] })).toBe(
      "작품을 담지 못했어요. 잠시 후 다시 시도해 주세요.",
    );
  });
});

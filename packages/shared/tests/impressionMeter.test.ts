import { describe, it, expect } from "vitest";
import { ImpressionMeter } from "../src/tracking";

describe("ImpressionMeter", () => {
  it("50% 이상으로 1초를 채우는 순간 한 번만 알린다", () => {
    const m = new ImpressionMeter();
    expect(m.update(0.6, true, 0)).toBeNull();
    expect(m.msUntilThreshold(0)).toBe(1000);
    expect(m.tick(999)).toBeNull();
    expect(m.tick(1000)).toEqual({ max_visible_ratio: 0.6, visible_ms: 1000, final: false });
    expect(m.tick(2000)).toBeNull();
    expect(m.msUntilThreshold(2000)).toBeNull();
  });

  it("50% 미만은 세지 않는다", () => {
    const m = new ImpressionMeter();
    m.update(0.4, true, 0);
    expect(m.tick(5000)).toBeNull();
    expect(m.msUntilThreshold(5000)).toBeNull();
  });

  it("페이지가 가려진 동안은 멈춘다", () => {
    const m = new ImpressionMeter();
    m.update(0.8, true, 0);
    expect(m.update(0.8, false, 600)).toBeNull();
    expect(m.msUntilThreshold(3000)).toBeNull();
    m.update(0.8, true, 5000);
    expect(m.msUntilThreshold(5000)).toBe(400);
    expect(m.tick(5400)).toEqual({ max_visible_ratio: 0.8, visible_ms: 1000, final: false });
  });

  it("기준 전에 화면을 벗어나면 끝내지 않고 누적한다", () => {
    const m = new ImpressionMeter();
    m.update(1, true, 0);
    m.update(0, true, 500);
    expect(m.leave(500)).toBeNull();
    m.update(1, true, 2000);
    expect(m.tick(2500)).toEqual({ max_visible_ratio: 1, visible_ms: 1000, final: false });
  });

  it("기준을 넘긴 뒤 화면을 벗어나면 최종값을 한 번 낸다", () => {
    const m = new ImpressionMeter();
    m.update(1, true, 0);
    m.tick(1000);
    m.update(0, true, 3000);
    expect(m.leave(3000)).toEqual({ max_visible_ratio: 1, visible_ms: 3000, final: true });
    expect(m.finish(4000)).toBeNull();
    expect(m.update(1, true, 5000)).toBeNull();
    expect(m.tick(9000)).toBeNull();
  });

  it("finish 는 본 적이 있을 때만 최종값을 낸다", () => {
    expect(new ImpressionMeter().finish(1000)).toBeNull();

    const m = new ImpressionMeter();
    m.update(0.7, true, 0);
    expect(m.finish(400)).toEqual({ max_visible_ratio: 0.7, visible_ms: 400, final: true });
    expect(m.finish(800)).toBeNull();
  });

  it("정확히 50% 도 센다", () => {
    const m = new ImpressionMeter();
    m.update(0.5, true, 0);
    expect(m.tick(1000)).toEqual({ max_visible_ratio: 0.5, visible_ms: 1000, final: false });
  });

  it("update 없이 leave 만 불려도 화면 밖 시간은 세지 않는다", () => {
    const m = new ImpressionMeter();
    m.update(1, true, 0);
    expect(m.leave(400)).toBeNull();
    expect(m.tick(10_000)).toBeNull();
    expect(m.finish(20_000)).toEqual({ max_visible_ratio: 1, visible_ms: 400, final: true });
  });
});

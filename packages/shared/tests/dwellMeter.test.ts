import { describe, it, expect } from "vitest";
import { DwellMeter, DWELL_CAP_MS } from "../src/tracking";

describe("DwellMeter", () => {
  it("보인 시간을 누적한다", () => {
    const m = new DwellMeter("open-1", 0);
    expect(m.snapshot(10_000)).toEqual({
      detail_open_id: "open-1",
      visible_ms: 10_000,
      max_scroll_ratio: 0,
      idle_capped: false,
    });
  });

  it("탭이 가려진 동안은 세지 않는다", () => {
    const m = new DwellMeter("open-1", 0);
    m.setPageVisible(false, 4000);
    expect(m.snapshot(9000).visible_ms).toBe(4000);
    m.setPageVisible(true, 9000);
    expect(m.snapshot(10_000).visible_ms).toBe(5000);
  });

  it("가려진 채로 열린 페이지는 보일 때부터 센다", () => {
    const m = new DwellMeter("open-1", 0, false);
    expect(m.snapshot(5000).visible_ms).toBe(0);
    m.setPageVisible(true, 5000);
    expect(m.snapshot(7000).visible_ms).toBe(2000);
  });

  it("60초 무입력이면 멈추고, 입력이 오면 다시 센다", () => {
    const m = new DwellMeter("open-1", 0);
    const idle = m.snapshot(100_000);
    expect(idle.visible_ms).toBe(60_000);
    expect(idle.idle_capped).toBe(true);

    m.activity(100_000);
    expect(m.snapshot(110_000).visible_ms).toBe(70_000);
  });

  it("30분에서 자른다", () => {
    const m = new DwellMeter("open-1", 0);
    for (let t = 30_000; t <= 40 * 60_000; t += 30_000) m.activity(t);
    const snap = m.snapshot(41 * 60_000);
    expect(snap.visible_ms).toBe(DWELL_CAP_MS);
    expect(snap.idle_capped).toBe(true);
  });

  it("스크롤 비율은 최댓값을 0~1 로 남긴다", () => {
    const m = new DwellMeter("open-1", 0);
    m.scroll(0.4, 1000);
    m.scroll(1.7, 2000);
    m.scroll(0.2, 3000);
    expect(m.snapshot(4000).max_scroll_ratio).toBe(1);
  });

  it("정확히 60초에 멈춘다", () => {
    const m = new DwellMeter("open-1", 0);
    expect(m.snapshot(59_999)).toMatchObject({ visible_ms: 59_999, idle_capped: false });
    expect(m.snapshot(60_000)).toMatchObject({ visible_ms: 60_000, idle_capped: true });
  });

  it("오래 떠났다 돌아와도 떠나 있던 시간은 세지 않는다", () => {
    const m = new DwellMeter("open-1", 0);
    m.setPageVisible(false, 4000);
    m.setPageVisible(true, 600_000);
    expect(m.snapshot(601_000).visible_ms).toBe(5000);
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createRecTracker } from "../src/tracking";
import type { RecEventBatch, RecTrackerOptions, SendResult, TrackerTransport } from "../src/tracking";

function setup(results: SendResult[] = [], overrides: Partial<RecTrackerOptions> = {}) {
  const sent: { batch: RecEventBatch; unloading: boolean }[] = [];
  let n = 0;
  const transport: TrackerTransport = {
    send: (batch, opts) => {
      sent.push({ batch, unloading: opts.unloading });
      return results[n++] ?? "ok";
    },
  };
  let id = 0;
  const tracker = createRecTracker({
    ids: { anonId: () => "anon-1", sessionId: () => "sess-1" },
    transport,
    uuid: () => `e${++id}`,
    now: () => Date.UTC(2026, 8, 19, 0, 0, 0),
    appVersion: "test",
    device: "desktop",
    ...overrides,
  });
  return { tracker, sent };
}

const ids = (b: RecEventBatch) => b.events.map((e) => e.eventId);

describe("createRecTracker", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("5초 뒤에 묶어서 보낸다", async () => {
    const { tracker, sent } = setup();
    tracker.track("card_clicked", { contentId: 1, surface: "home" });
    tracker.track("detail_viewed", { contentId: 1, payload: { visible_ms: 10 } });
    expect(sent).toHaveLength(0);

    await vi.advanceTimersByTimeAsync(5000);

    expect(sent).toHaveLength(1);
    expect(sent[0].unloading).toBe(false);
    expect(sent[0].batch).toMatchObject({ anonId: "anon-1", sessionId: "sess-1", appVersion: "test", device: "desktop" });
    expect(sent[0].batch.events[0]).toEqual({
      eventId: "e1",
      type: "card_clicked",
      clientTs: "2026-09-19T00:00:00.000Z",
      contentId: 1,
      surface: "home",
    });
    expect(tracker.pending()).toBe(0);
  });

  it("20건이 쌓이면 기다리지 않고 보낸다", async () => {
    const { tracker, sent } = setup();
    for (let i = 0; i < 20; i++) tracker.track("card_clicked", { contentId: i });
    await vi.advanceTimersByTimeAsync(0);
    expect(sent).toHaveLength(1);
    expect(sent[0].batch.events).toHaveLength(20);
  });

  it("retry 면 1·2초 뒤 같은 event_id 로 다시 보낸다", async () => {
    const { tracker, sent } = setup(["retry", "retry", "ok"]);
    tracker.track("card_clicked");
    await vi.advanceTimersByTimeAsync(5000);
    expect(sent).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(1000);
    expect(sent).toHaveLength(2);
    await vi.advanceTimersByTimeAsync(2000);
    expect(sent).toHaveLength(3);
    expect(sent.map((s) => ids(s.batch))).toEqual([["e1"], ["e1"], ["e1"]]);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(sent).toHaveLength(3);
  });

  it("재시도 3회를 다 쓰면 버리고, 다음 이벤트는 정상적으로 보낸다", async () => {
    const { tracker, sent } = setup(["retry", "retry", "retry", "retry"]);
    tracker.track("card_clicked");
    await vi.advanceTimersByTimeAsync(5000 + 1000 + 2000 + 4000);
    expect(sent).toHaveLength(4);
    expect(tracker.pending()).toBe(0);

    tracker.track("detail_viewed");
    await vi.advanceTimersByTimeAsync(5000);
    expect(sent).toHaveLength(5);
    expect(ids(sent[4].batch)).toEqual(["e2"]);
  });

  it("drop 이면 다시 보내지 않는다", async () => {
    const { tracker, sent } = setup(["drop"]);
    tracker.track("card_clicked");
    await vi.advanceTimersByTimeAsync(5000 + 60_000);
    expect(sent).toHaveLength(1);
  });

  it("언로드 flush 는 남은 큐를 unloading=true 로 즉시 보낸다", async () => {
    const { tracker, sent } = setup();
    tracker.track("card_clicked");
    tracker.track("detail_viewed");
    await tracker.flush({ unloading: true });
    expect(sent).toHaveLength(1);
    expect(sent[0].unloading).toBe(true);
    expect(ids(sent[0].batch)).toEqual(["e1", "e2"]);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(sent).toHaveLength(1);
  });

  it("재시도를 기다리던 묶음도 언로드 때 함께 나가고, 그 뒤에 또 보내지 않는다", async () => {
    const { tracker, sent } = setup(["retry"]);
    tracker.track("card_clicked");
    await vi.advanceTimersByTimeAsync(5000);      // e1 전송 → retry, 1초 대기 중
    tracker.track("detail_viewed");               // e2 는 큐에
    await tracker.flush({ unloading: true });
    expect(sent).toHaveLength(2);
    expect(sent[1].unloading).toBe(true);
    expect(ids(sent[1].batch)).toEqual(["e1", "e2"]);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(sent).toHaveLength(2);
  });

  it("언로드 flush 는 finalizer 를 먼저 돌려 최종값을 같은 비콘에 싣는다", async () => {
    const { tracker, sent } = setup();
    const off = tracker.addFinalizer(() => tracker.track("detail_viewed", { contentId: 9 }));
    await tracker.flush({ unloading: true });
    expect(sent).toHaveLength(1);
    expect(sent[0].batch.events[0]).toMatchObject({ type: "detail_viewed", contentId: 9 });

    off();
    await tracker.flush({ unloading: true });
    expect(sent).toHaveLength(1);   // 해제된 finalizer 는 돌지 않고, 보낼 것도 없다
  });

  it("언로드 때 50건씩 나눠 보낸다", async () => {
    const { tracker, sent } = setup([], { flushAtCount: 1000 });
    for (let i = 0; i < 120; i++) tracker.track("card_clicked");
    await tracker.flush({ unloading: true });
    expect(sent.map((s) => s.batch.events.length)).toEqual([50, 50, 20]);
  });

  it("큐 상한을 넘으면 오래된 것부터 버린다", async () => {
    const { tracker, sent } = setup([], { flushAtCount: 1000, maxQueue: 5 });
    for (let i = 0; i < 8; i++) tracker.track("card_clicked");
    await tracker.flush({ unloading: true });
    expect(ids(sent[0].batch)).toEqual(["e4", "e5", "e6", "e7", "e8"]);
  });

  it("dispose 뒤에는 아무것도 보내지 않는다", async () => {
    const { tracker, sent } = setup();
    tracker.track("card_clicked");
    tracker.dispose();
    tracker.track("card_clicked");
    await vi.advanceTimersByTimeAsync(60_000);
    expect(sent).toHaveLength(0);
  });
});

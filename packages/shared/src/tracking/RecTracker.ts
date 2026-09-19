import type {
  RecEvent,
  RecEventBatch,
  RecEventFields,
  RecEventType,
  SendResult,
  TrackerIds,
  TrackerTransport,
} from "./types";

export interface RecTrackerOptions {
  ids: TrackerIds;
  transport: TrackerTransport;
  /** uuid v4 생성기 — 플랫폼마다 다르므로 앱에서 주입한다. */
  uuid: () => string;
  /** epoch ms. 기본 Date.now */
  now?: () => number;
  appVersion?: string;
  device?: "mobile" | "desktop";
  /** 기본 5000 */
  flushIntervalMs?: number;
  /** 이만큼 쌓이면 기다리지 않고 보낸다. 기본 20 */
  flushAtCount?: number;
  /** 한 요청의 최대 이벤트 수 — 서버 한도 50 */
  maxBatch?: number;
  /** 메모리 큐 상한. 넘으면 오래된 것부터 버린다. 기본 500 */
  maxQueue?: number;
  /** 재시도 간격. 기본 [1000, 2000, 4000] */
  retryDelaysMs?: number[];
  onDebug?: (message: string, data?: unknown) => void;
}

export interface RecTracker {
  track(type: RecEventType, fields?: RecEventFields): void;
  /** unloading=true: finalizer 를 돌린 뒤 남은 것을 전부 즉시 보낸다(응답을 기다리지 않는다). */
  flush(opts?: { unloading?: boolean }): Promise<void>;
  /** 페이지를 떠나기 직전에 불린다 — 체류·노출의 최종값을 track 하는 용도. 돌려주는 함수로 해제. */
  addFinalizer(fn: () => void): () => void;
  pending(): number;
  dispose(): void;
}

/** 큐 · 5초/20건 전송 · 재시도 · 언로드 flush (REC_TAB_DESIGN §7-3). 플랫폼 의존부는 전부 주입받는다. */
export function createRecTracker(options: RecTrackerOptions): RecTracker {
  const {
    ids,
    transport,
    uuid,
    now = () => Date.now(),
    appVersion,
    device,
    flushIntervalMs = 5000,
    flushAtCount = 20,
    maxBatch = 50,
    maxQueue = 500,
    retryDelaysMs = [1000, 2000, 4000],
    onDebug,
  } = options;

  let queue: RecEvent[] = [];
  /** 전송 중이거나 재시도를 기다리는 묶음 */
  let inflight: RecEvent[] = [];
  let sending = false;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let disposed = false;
  let runningFinalizers = false;
  const finalizers = new Set<() => void>();

  const toBatch = (events: RecEvent[]): RecEventBatch => ({
    anonId: ids.anonId(),
    sessionId: ids.sessionId(),
    appVersion,
    device,
    events,
  });

  const clearTimer = () => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  };

  const schedule = () => {
    if (timer !== null || disposed || queue.length === 0) return;
    timer = setTimeout(() => {
      timer = null;
      void flush();
    }, flushIntervalMs);
  };

  const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

  async function sendWithRetry(events: RecEvent[]): Promise<void> {
    for (let attempt = 0; ; attempt++) {
      let result: SendResult;
      try {
        result = await transport.send(toBatch(events), { unloading: false });
      } catch {
        result = "retry";
      }
      if (result !== "retry") return;
      if (attempt >= retryDelaysMs.length) {
        onDebug?.("재시도 소진 — 버림", events.length);
        return;
      }
      await sleep(retryDelaysMs[attempt]);
      if (inflight.length === 0 || disposed) return;   // 기다리는 사이 언로드 flush 가 가져갔다
    }
  }

  async function flush(opts: { unloading?: boolean } = {}): Promise<void> {
    if (disposed) return;

    if (opts.unloading) {
      runningFinalizers = true;
      try {
        for (const fn of [...finalizers]) {
          try {
            fn();
          } catch {
            // finalizer 하나가 실패해도 나머지와 전송은 계속한다
          }
        }
      } finally {
        runningFinalizers = false;
      }
      clearTimer();
      const all = [...inflight, ...queue];
      inflight = [];
      queue = [];
      for (let i = 0; i < all.length; i += maxBatch) {
        try {
          void transport.send(toBatch(all.slice(i, i + maxBatch)), { unloading: true });
        } catch {
          // 닫히는 중 — 할 수 있는 게 없다
        }
      }
      return;
    }

    if (sending) return;
    sending = true;
    clearTimer();
    try {
      while (queue.length > 0) {
        inflight = queue.slice(0, maxBatch);
        queue = queue.slice(inflight.length);
        await sendWithRetry(inflight);
        inflight = [];
        if (queue.length < flushAtCount) break;
      }
    } finally {
      sending = false;
      schedule();
    }
  }

  function track(type: RecEventType, fields: RecEventFields = {}): void {
    if (disposed) return;
    const event: RecEvent = {
      eventId: uuid(),
      type,
      clientTs: new Date(now()).toISOString(),
      ...fields,
    };
    queue.push(event);
    if (queue.length > maxQueue) queue = queue.slice(queue.length - maxQueue);
    onDebug?.("track", event);
    if (runningFinalizers) return;   // 곧바로 언로드 비콘으로 나간다
    if (queue.length >= flushAtCount) void flush();
    else schedule();
  }

  return {
    track,
    flush,
    addFinalizer(fn) {
      finalizers.add(fn);
      return () => {
        finalizers.delete(fn);
      };
    },
    pending: () => queue.length + inflight.length,
    dispose() {
      disposed = true;
      clearTimer();
      queue = [];
      inflight = [];
      finalizers.clear();
    },
  };
}

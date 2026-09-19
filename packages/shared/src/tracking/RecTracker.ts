import type {
  RecEvent,
  RecEventBatch,
  RecEventFields,
  RecEventType,
  SendResult,
  TrackerIds,
  TrackerTransport,
} from "./types";

/** 서버가 한 요청에서 받는 최대 이벤트 수 */
const SERVER_MAX_BATCH = 50;
/** 서버가 받는 payload 직렬화 길이 상한 — 넘으면 묶음 전체가 400 으로 버려진다 */
const MAX_PAYLOAD_CHARS = 4096;
/** 언로드 때 보내는 최대 묶음 수. sendBeacon 은 오리진당 약 64KB 예산이라 넘치면 조용히 실패한다 */
const MAX_UNLOAD_BATCHES = 2;

/** 전송이 끝나지 않으면(반쯤 끊긴 연결 등) "retry" 로 친다 — sending 이 영원히 잠기지 않게. */
function withTimeout(sending: Promise<SendResult> | SendResult, ms: number): Promise<SendResult> {
  return new Promise<SendResult>((resolve) => {
    const timer = setTimeout(() => resolve("retry"), ms);
    Promise.resolve(sending).then(
      (result) => {
        clearTimeout(timer);
        resolve(result);
      },
      () => {
        clearTimeout(timer);
        resolve("retry");
      },
    );
  });
}

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
  /** 전송 1회의 제한 시간. 기본 10000 */
  sendTimeoutMs?: number;
  onDebug?: (message: string, data?: unknown) => void;
}

export interface RecTracker {
  track(type: RecEventType, fields?: RecEventFields): void;
  /** unloading=true: finalizer 를 돌린 뒤 남은 것을 전부 즉시 보낸다(응답을 기다리지 않는다). 돌려주는 Promise 는 "전송을 맡겼다"는 뜻이지 서버가 받았다는 뜻이 아니다 — 이미 전송 중이면 곧바로 끝나고, unloading 경로는 응답을 기다리지 않는다. */
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
    sendTimeoutMs = 10_000,
    onDebug,
  } = options;

  const batchSize = Math.min(maxBatch, SERVER_MAX_BATCH);

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
        result = await withTimeout(transport.send(toBatch(events), { unloading: false }), sendTimeoutMs);
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
      if (runningFinalizers) return;   // finalizer 가 flush 를 다시 부른 경우 — 바깥 호출이 보낸다
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
      // 비콘 예산을 넘기지 않도록 최신 것만 보낸다 (오래된 것은 버린다)
      const all = [...inflight, ...queue].slice(-(batchSize * MAX_UNLOAD_BATCHES));
      inflight = [];
      queue = [];
      for (let i = 0; i < all.length; i += batchSize) {
        try {
          const sent = transport.send(toBatch(all.slice(i, i + batchSize)), { unloading: true });
          Promise.resolve(sent).catch(() => undefined);   // 비동기 실패도 삼킨다 — 닫히는 중이라 할 수 있는 게 없다
        } catch {
          // 동기 예외도 마찬가지
        }
      }
      return;
    }

    if (sending) return;
    sending = true;
    clearTimer();
    try {
      while (queue.length > 0) {
        inflight = queue.slice(0, batchSize);
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
    let payload = fields.payload;
    if (payload !== undefined) {
      let size = Number.POSITIVE_INFINITY;
      try {
        size = JSON.stringify(payload).length;
      } catch {
        // 순환 참조 등 직렬화할 수 없는 payload
      }
      if (size > MAX_PAYLOAD_CHARS) {
        onDebug?.("payload 가 너무 커서 뺐다 — 이벤트는 보낸다", type);
        payload = undefined;
      }
    }
    // fields 를 먼저 펼친다 — 넓은 객체가 넘어와도 eventId·type·clientTs 를 덮지 못하게
    const event: RecEvent = {
      ...fields,
      payload,
      eventId: uuid(),
      type,
      clientTs: new Date(now()).toISOString(),
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

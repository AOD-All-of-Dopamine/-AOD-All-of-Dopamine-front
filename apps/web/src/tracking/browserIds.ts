import type { TrackerIds } from "@aod/shared/tracking";

const ANON_KEY = "aod_anon_id";
const SESSION_KEY = "aod_session_id";
const SESSION_SEEN_KEY = "aod_session_seen_at";
const SESSION_IDLE_MS = 30 * 60 * 1000;

/** uuid v4. randomUUID 는 보안 컨텍스트(https·localhost)에서만 있다 — 없으면 getRandomValues 로 만든다. */
export function newUuid(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, "0"));
  return `${h.slice(0, 4).join("")}-${h.slice(4, 6).join("")}-${h.slice(6, 8).join("")}-${h.slice(8, 10).join("")}-${h.slice(10).join("")}`;
}

// 저장소 접근 자체가 예외를 던질 수 있다(사생활 보호 모드·쿠키 차단) → 함수로 감싸 늦게 읽는다.
function read(storage: () => Storage, key: string): string | null {
  try {
    return storage().getItem(key);
  } catch {
    return null;
  }
}

function write(storage: () => Storage, key: string, value: string): void {
  try {
    storage().setItem(key, value);
  } catch {
    // 못 쓰면 메모리 값으로 버틴다
  }
}

/**
 * 식별자 수명 (REC_TAB_DESIGN §5-4):
 * - anon_id: 브라우저 단위, localStorage `aod_anon_id`
 * - session_id: sessionStorage, 30분 무활동이면 새로 만든다 (호출될 때마다 활동 시각을 갱신)
 */
export function createBrowserIds(now: () => number = () => Date.now()): TrackerIds {
  let memoryAnon: string | null = null;
  let memorySession: string | null = null;
  let memorySeenAt = 0;
  const local = () => window.localStorage;
  const session = () => window.sessionStorage;

  return {
    anonId() {
      const existing = read(local, ANON_KEY) ?? memoryAnon;
      if (existing) {
        memoryAnon = existing;
        return existing;
      }
      const created = newUuid();
      memoryAnon = created;
      write(local, ANON_KEY, created);
      return created;
    },
    sessionId() {
      const t = now();
      const seenAt = Number(read(session, SESSION_SEEN_KEY)) || memorySeenAt;
      let id = read(session, SESSION_KEY) ?? memorySession;
      if (!id || !seenAt || t - seenAt > SESSION_IDLE_MS) id = newUuid();
      memorySession = id;
      memorySeenAt = t;
      write(session, SESSION_KEY, id);
      write(session, SESSION_SEEN_KEY, String(t));
      return id;
    },
  };
}

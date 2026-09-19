import type { RecTab } from "../types";

/** 체인 1개의 상태. nonce 는 query key 를 가르는 값이고, chainId 는 서버가 준 이어 보기 표다. */
export interface RecChainEntry {
  nonce: string;
  chainId: string | null;
}

/** sessionStorage 와 같은 모양. shared 는 저장소를 직접 만지지 않으므로 앱이 넘긴다. */
export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface RecChainStore {
  /** 없으면 새 nonce 를 만들어 저장하고 돌려준다. */
  get(tab: RecTab): RecChainEntry;
  /** 서버가 준 chainId 를 기억한다. null 이면 지운다(대체 응답). */
  setChainId(tab: RecTab, chainId: string | null): void;
  /** 새 체인 — nonce 교체 + chainId 비우기 ("새로 보기", 404). */
  reset(tab: RecTab): RecChainEntry;
}

export const REC_CHAIN_KEY_PREFIX = "aod_rec_chain_";

/**
 * 체인 수명 = 브라우저 세션 × 칩 (설계 §4). 저장소가 막혀 있어도(사생활 보호 모드)
 * 메모리 값으로 버틴다 — 계측·이어 보기 때문에 화면이 깨지면 안 된다.
 */
export function createRecChainStore(
  storage: KeyValueStorage | null,
  newNonce: () => string,
): RecChainStore {
  const memory = new Map<RecTab, RecChainEntry>();
  const keyOf = (tab: RecTab) => `${REC_CHAIN_KEY_PREFIX}${tab}`;

  const readStored = (tab: RecTab): RecChainEntry | null => {
    try {
      const raw = storage?.getItem(keyOf(tab));
      if (!raw) return null;
      const parsed = JSON.parse(raw) as Partial<RecChainEntry> | null;
      if (!parsed || typeof parsed.nonce !== "string" || parsed.nonce.length === 0) return null;
      return {
        nonce: parsed.nonce,
        chainId: typeof parsed.chainId === "string" && parsed.chainId.length > 0 ? parsed.chainId : null,
      };
    } catch {
      return null;
    }
  };

  const persist = (tab: RecTab, entry: RecChainEntry): RecChainEntry => {
    memory.set(tab, entry);
    try {
      storage?.setItem(keyOf(tab), JSON.stringify(entry));
    } catch {
      // 못 쓰면 메모리 값으로 버틴다
    }
    return entry;
  };

  const get = (tab: RecTab): RecChainEntry => {
    const existing = readStored(tab) ?? memory.get(tab);
    if (existing) {
      memory.set(tab, existing);
      return existing;
    }
    return persist(tab, { nonce: newNonce(), chainId: null });
  };

  return {
    get,
    setChainId(tab, chainId) {
      const current = get(tab);
      const next = chainId && chainId.length > 0 ? chainId : null;
      if (current.chainId === next) return;
      persist(tab, { nonce: current.nonce, chainId: next });
    },
    reset(tab) {
      return persist(tab, { nonce: newNonce(), chainId: null });
    },
  };
}

/** axios 오류에서 상태 코드만 꺼낸다 (axios 타입에 의존하지 않는다). */
export function recErrorStatus(error: unknown): number | undefined {
  const response = (error as { response?: { status?: unknown } } | null | undefined)?.response;
  return typeof response?.status === "number" ? response.status : undefined;
}

/** 404 = 체인이 없거나 만료·남의 것·다른 탭이다 → chainId 없이 새로 요청한다. */
export function isChainExpired(error: unknown): boolean {
  return recErrorStatus(error) === 404;
}

/** 404 는 재시도가 아니라 새 체인이다 — 같은 nonce 에서 딱 한 번만 바꾼다(무한 루프 방지). */
export function shouldRestartChain(
  error: unknown,
  nonce: string,
  restarted: ReadonlySet<string>,
): boolean {
  return isChainExpired(error) && !restarted.has(nonce);
}

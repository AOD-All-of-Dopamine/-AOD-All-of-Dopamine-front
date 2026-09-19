import { describe, it, expect } from "vitest";
import {
  createRecChainStore,
  isChainExpired,
  REC_CHAIN_KEY_PREFIX,
  shouldRestartChain,
  type KeyValueStorage,
} from "../src/rec";

const fakeStorage = (): KeyValueStorage & { map: Map<string, string> } => {
  const map = new Map<string, string>();
  return {
    map,
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => void map.set(key, value),
    removeItem: (key) => void map.delete(key),
  };
};

const throwingStorage = (): KeyValueStorage => ({
  getItem: () => {
    throw new Error("blocked");
  },
  setItem: () => {
    throw new Error("blocked");
  },
  removeItem: () => {
    throw new Error("blocked");
  },
});

const counter = () => {
  let n = 0;
  return () => `n-${++n}`;
};

describe("createRecChainStore", () => {
  it("칩마다 따로 nonce 를 만들고 같은 칩은 같은 값을 준다", () => {
    const store = createRecChainStore(fakeStorage(), counter());
    const game = store.get("game");
    expect(game).toEqual({ nonce: "n-1", chainId: null });
    expect(store.get("game")).toEqual(game);
    expect(store.get("all")).toEqual({ nonce: "n-2", chainId: null });
  });

  it("저장소에 칩별 키로 남아 새로고침 뒤에도 같은 체인을 잇는다", () => {
    const storage = fakeStorage();
    const store = createRecChainStore(storage, counter());
    store.get("webtoon");
    store.setChainId("webtoon", "chain-1");
    expect(storage.map.get(`${REC_CHAIN_KEY_PREFIX}webtoon`)).toBe(JSON.stringify({ nonce: "n-1", chainId: "chain-1" }));

    const reopened = createRecChainStore(storage, counter());
    expect(reopened.get("webtoon")).toEqual({ nonce: "n-1", chainId: "chain-1" });
  });

  it("reset 은 새 nonce 와 빈 chainId 를 준다 (새로 보기·404)", () => {
    const store = createRecChainStore(fakeStorage(), counter());
    store.get("tv");
    store.setChainId("tv", "chain-1");
    expect(store.reset("tv")).toEqual({ nonce: "n-2", chainId: null });
    expect(store.get("tv")).toEqual({ nonce: "n-2", chainId: null });
  });

  it("chainId 를 null 로 두면 지운다 (대체 응답의 chainId 는 저장하지 않는다)", () => {
    const store = createRecChainStore(fakeStorage(), counter());
    store.get("movie");
    store.setChainId("movie", "chain-1");
    store.setChainId("movie", null);
    expect(store.get("movie").chainId).toBeNull();
  });

  it("저장소가 막혀도(사생활 보호 모드) 메모리로 버틴다", () => {
    const store = createRecChainStore(throwingStorage(), counter());
    const first = store.get("game");
    expect(first.nonce).toBe("n-1");
    expect(store.get("game")).toEqual(first);
    store.setChainId("game", "chain-1");
    expect(store.get("game").chainId).toBe("chain-1");
  });

  it("저장소가 없거나 값이 깨져 있으면 새로 만든다", () => {
    const storage = fakeStorage();
    storage.map.set(`${REC_CHAIN_KEY_PREFIX}all`, "{ 깨진 값");
    expect(createRecChainStore(storage, counter()).get("all")).toEqual({ nonce: "n-1", chainId: null });
    expect(createRecChainStore(null, counter()).get("all")).toEqual({ nonce: "n-1", chainId: null });
  });
});

describe("404 정책", () => {
  const notFound = { response: { status: 404 } };

  it("404 만 체인 만료로 본다", () => {
    expect(isChainExpired(notFound)).toBe(true);
    expect(isChainExpired({ response: { status: 500 } })).toBe(false);
    expect(isChainExpired(new Error("network"))).toBe(false);
    expect(isChainExpired(null)).toBe(false);
  });

  it("같은 nonce 에서는 딱 한 번만 새 체인으로 다시 시작한다", () => {
    const restarted = new Set<string>();
    expect(shouldRestartChain(notFound, "n-1", restarted)).toBe(true);
    restarted.add("n-1");
    expect(shouldRestartChain(notFound, "n-1", restarted)).toBe(false);
    expect(shouldRestartChain(notFound, "n-2", restarted)).toBe(true);
  });

  it("404 가 아니면 다시 시작하지 않는다 (재시도는 하지 않는다)", () => {
    expect(shouldRestartChain({ response: { status: 401 } }, "n-1", new Set())).toBe(false);
  });
});

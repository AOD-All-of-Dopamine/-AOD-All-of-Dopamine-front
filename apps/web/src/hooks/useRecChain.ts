import { useCallback, useReducer, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { recKeys } from "@aod/shared/queries";
import {
  chainIdForFirstRequest,
  createRecChainStore,
  shouldRestartChain,
  type KeyValueStorage,
  type RecChainStore,
} from "@aod/shared/rec";
import { REC_TABS, type RecTab } from "@aod/shared/types";
import { newUuid } from "../tracking/browserIds";
import { forgetAllChainState, forgetChainState, recChainStateKey } from "./recChainState";

/** 사생활 보호 모드 등에서는 접근 자체가 던진다 — 그때는 메모리 저장소로 돈다. */
function sessionStorageOrNull(): KeyValueStorage | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

let store: RecChainStore | null = null;
function chainStore(): RecChainStore {
  if (store === null) store = createRecChainStore(sessionStorageOrNull(), newUuid);
  return store;
}

/**
 * 계정이 바뀌면 모든 칩의 체인을 새로 연다 — 남의 체인을 이어 보지 않게 한다.
 * (AuthContext 가 추천 쿼리 캐시를 버릴 때 함께 부른다.)
 */
export function clearRecChains(): void {
  const current = chainStore();
  for (const tab of REC_TABS) current.reset(tab);
  forgetAllChainState();
}

export interface RecChain {
  /** query key 를 가르는 값. 바뀌면 새 목록이다. */
  nonce: string;
  /** 첫 요청에 실을 chainId (없으면 null). */
  initialChainId: string | null;
  /** 서버가 준 chainId 를 기억한다 — 대체 응답은 null 을 넘겨 지운다. */
  remember: (chainId: string | null) => void;
  /** 처음부터 다시 받기 — 새 체인. */
  restart: () => void;
  /** 404 면 같은 nonce 에서 딱 한 번 새 체인으로 바꾼다. 바꿨으면 true. */
  restartOnChainExpired: (error: unknown) => boolean;
}

/** 새 체인을 연다 — 그 체인에 매달린 화면 상태(숨김·♡)도 함께 버린다. */
function openNewChain(tab: RecTab, nonce: string): void {
  forgetChainState(recChainStateKey(tab, nonce));
  chainStore().reset(tab);
}

export interface UseRecChainOptions {
  /**
   * 캐시가 없어도(새로고침 · gcTime 만료) 저장된 체인을 이어 받는다 — 마지막 묶음만 보이는 홈 추천용.
   * 쪽을 합쳐 보이는 화면은 끄고 둔다(앞쪽이 사라진 이어 보기는 말이 안 된다).
   */
  continueWithoutCache?: boolean;
}

/**
 * 체인 수명 = 브라우저 세션 × 칩 (설계 §4). 저장소는 웹이 갖고, 판정은 shared 가 한다.
 *
 * 렌더 중에는 저장소를 **읽기만** 한다. get() 은 "없으면 만들어 저장"하는 게으른 초기화라
 * 두 번 돌려도(StrictMode) 두 번째부터는 저장된 값을 그대로 주므로 체인이 갈리지 않는다.
 * 체인을 바꾸는 쓰기는 전부 이벤트·effect 에서만 한다.
 */
export function useRecChain(tab: RecTab, options: UseRecChainOptions = {}): RecChain {
  const { continueWithoutCache = false } = options;
  const [, rereadChain] = useReducer((n: number) => n + 1, 0);
  const queryClient = useQueryClient();
  const restartedRef = useRef<Set<string>>(new Set());

  const entry = chainStore().get(tab);

  // 캐시가 비어 있으면(새로고침·gcTime 만료) 서버는 그 체인의 "다음" 쪽을 준다 — 쪽을 합쳐 보이는
  // 화면이면 앞쪽이 사라지므로 싣지 않고, 마지막 묶음만 보이는 홈은 다음 묶음을 받는 편이 낫다(chainIdForFirstRequest).
  // 저장소는 건드리지 않는다(렌더는 부작용을 남기지 않는다) — 첫 응답의 chainId 가 곧 덮어쓴다.
  const hasCachedPages = queryClient.getQueryData(recKeys.list(tab, entry.nonce)) !== undefined;
  const initialChainId = chainIdForFirstRequest({
    storedChainId: entry.chainId,
    hasCachedPages,
    continueWithoutCache,
  });

  const remember = useCallback(
    (next: string | null) => {
      chainStore().setChainId(tab, next);
    },
    [tab],
  );

  const restart = useCallback(() => {
    openNewChain(tab, chainStore().get(tab).nonce);
    rereadChain();
  }, [tab]);

  const restartOnChainExpired = useCallback(
    (error: unknown) => {
      // 저장소의 **지금** 값을 본다 — remember() 는 리렌더 없이 저장소만 고치므로
      // 렌더 시점에 잡아 둔 값은 "더 보기" 시점에는 이미 낡았다.
      const current = chainStore().get(tab);
      // chainId 를 안 실었으면 404 가 체인 만료일 수 없다 — 새 체인으로 바꿔도 결과가 같다(루프 방지).
      if (current.chainId === null) return false;
      if (!shouldRestartChain(error, current.nonce, restartedRef.current)) return false;
      restartedRef.current.add(current.nonce);
      openNewChain(tab, current.nonce);
      rereadChain();
      return true;
    },
    [tab],
  );

  return { nonce: entry.nonce, initialChainId, remember, restart, restartOnChainExpired };
}

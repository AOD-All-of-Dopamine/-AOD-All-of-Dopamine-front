import { useCallback, useReducer, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { recKeys } from "@aod/shared/queries";
import {
  createRecChainStore,
  shouldRestartChain,
  type KeyValueStorage,
  type RecChainStore,
} from "@aod/shared/rec";
import { REC_TABS, type RecTab } from "@aod/shared/types";
import { newUuid } from "../tracking/browserIds";

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
}

export interface RecChain {
  /** query key 를 가르는 값. 바뀌면 새 목록이다. */
  nonce: string;
  /** 첫 요청에 실을 chainId (없으면 null). */
  initialChainId: string | null;
  /** 서버가 준 chainId 를 기억한다 — 대체 응답은 null 을 넘겨 지운다. */
  remember: (chainId: string | null) => void;
  /** "새로 보기" — 새 체인. */
  restart: () => void;
  /** 404 면 같은 nonce 에서 딱 한 번 새 체인으로 바꾼다. 바꿨으면 true. */
  restartOnChainExpired: (error: unknown) => boolean;
}

/**
 * 체인 수명 = 브라우저 세션 × 칩 (설계 §4). 저장소는 웹이 갖고, 판정은 shared 가 한다.
 *
 * 저장소가 단일 진실 출처다 — 렌더마다 읽고, 바꾼 뒤에는 rereadChain 으로 다시 읽는다.
 */
export function useRecChain(tab: RecTab): RecChain {
  const [, rereadChain] = useReducer((n: number) => n + 1, 0);
  const queryClient = useQueryClient();
  const restartedRef = useRef<Set<string>>(new Set());

  let entry = chainStore().get(tab);

  // 새로고침·캐시 만료로 앞쪽 쪽들이 화면에서 사라졌는데 chainId 만 남아 있으면 이어 보기는
  // 말이 안 된다 — 서버는 그 체인의 "다음" 쪽을 주지 1쪽을 다시 주지 않는다. 새 체인으로 시작한다.
  // (뒤로가기처럼 캐시가 살아 있으면 여기 걸리지 않는다 — 그때는 재조회 자체가 없다.)
  if (
    entry.chainId !== null &&
    queryClient.getQueryData(recKeys.list(tab, entry.nonce)) === undefined
  ) {
    entry = chainStore().reset(tab);
  }

  const { nonce, chainId } = entry;

  const remember = useCallback(
    (next: string | null) => {
      chainStore().setChainId(tab, next);
    },
    [tab],
  );

  const restart = useCallback(() => {
    chainStore().reset(tab);
    rereadChain();
  }, [tab]);

  const restartOnChainExpired = useCallback(
    (error: unknown) => {
      // chainId 를 안 실었으면 404 가 체인 만료일 수 없다 — 새 체인으로 바꿔도 결과가 같다(루프 방지).
      if (chainId === null) return false;
      if (!shouldRestartChain(error, nonce, restartedRef.current)) return false;
      restartedRef.current.add(nonce);
      chainStore().reset(tab);
      rereadChain();
      return true;
    },
    [chainId, nonce, tab],
  );

  return { nonce, initialChainId: chainId, remember, restart, restartOnChainExpired };
}

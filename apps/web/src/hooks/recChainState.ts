import type { RecHiddenEntry } from "@aod/shared/rec";
import type { RecTab } from "@aod/shared/types";

/**
 * 체인 1개의 화면 상태(숨긴 카드·♡). 상세에 갔다 돌아오면 목록 컴포넌트는 다시 마운트되지만
 * react-query 캐시는 남아 있다 — 숨긴 카드가 되살아나지 않도록 같은 수명으로 들고 있는다.
 *
 * 체인을 새로 열면(새로 보기·404 재시작·계정 전환) 그 칸을 지운다. 그래도 칩을 여러 번 오가면
 * 낡은 칸이 쌓이므로 최근 MAX_CHAINS 개만 남긴다(Map 은 삽입 순서를 지킨다).
 */
export interface RecChainState {
  hidden: readonly RecHiddenEntry[];
  liked: Record<number, boolean>;
}

const MAX_CHAINS = 12;

const states = new Map<string, RecChainState>();

export function recChainStateKey(tab: RecTab, nonce: string): string {
  return `${tab}:${nonce}`;
}

export function readChainState(key: string): RecChainState | undefined {
  return states.get(key);
}

export function writeChainState(key: string, state: RecChainState): void {
  states.delete(key); // 다시 넣어 "최근 쓴 것"이 맨 뒤로 가게 한다
  states.set(key, state);
  while (states.size > MAX_CHAINS) {
    const oldest = states.keys().next();
    if (oldest.done === true) break;
    states.delete(oldest.value);
  }
}

export function forgetChainState(key: string): void {
  states.delete(key);
}

export function forgetAllChainState(): void {
  states.clear();
}

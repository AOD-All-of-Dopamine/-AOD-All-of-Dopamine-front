/**
 * 로그인 만료 알림 다리.
 *
 * API 클라이언트는 main.tsx 에서 React 바깥에 만들어지고, 로그인 상태는 AuthProvider(React 안)에 있다.
 * privateApi 가 401 을 받으면 클라이언트가 `emitSessionExpired` 를 부르고, AuthProvider 가
 * `subscribeSessionExpired` 로 받아 로그아웃 상태로 바꾼다.
 *
 * 백엔드의 401 은 모두 "토큰 없음 또는 무효"라는 뜻이다(컬렉션·추천·반응·관심 없음).
 * 토큰이 없을 때도 401 이 오므로, "원래 로그인 상태였는지"는 받는 쪽이 판단한다.
 */
const SESSION_EXPIRED_EVENT = "aod:session-expired";

export function emitSessionExpired(): void {
  window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
}

export function subscribeSessionExpired(listener: () => void): () => void {
  window.addEventListener(SESSION_EXPIRED_EVENT, listener);
  return () => window.removeEventListener(SESSION_EXPIRED_EVENT, listener);
}

import { useCallback, useEffect, useRef, useState } from "react";

export interface ToastState {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

/** 되돌리기 토스트 기본 수명 (설계 §3). */
export const UNDO_TOAST_MS = 5000;

/**
 * 토스트 한 장의 상태와 타이머. 컴포넌트 파일이 아니라 훅 파일에 둔다
 * (웹 ESLint react-refresh/only-export-components).
 *
 * 한 번에 한 장만 띄운다 — 새 토스트는 이전 것을 대체한다. 토스트가 사라지는 것은
 * "동작 취소"가 아니다(되돌리기를 안 누르면 이미 보낸 요청이 그대로 남는다).
 */
export function useToast(defaultDurationMs = UNDO_TOAST_MS) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const timerRef = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timerRef.current), []);

  const hide = useCallback(() => {
    window.clearTimeout(timerRef.current);
    setToast(null);
  }, []);

  const show = useCallback(
    (next: ToastState, durationMs = defaultDurationMs) => {
      window.clearTimeout(timerRef.current);
      setToast(next);
      timerRef.current = window.setTimeout(() => setToast(null), durationMs);
    },
    [defaultDurationMs],
  );

  return { toast, show, hide };
}

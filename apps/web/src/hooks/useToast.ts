import { useCallback, useEffect, useRef, useState } from "react";

export interface ToastState {
  /** show() 가 돌려주는 식별자. hide(id) 는 이 토스트가 아직 보일 때만 듣는다. */
  id: number;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  /** 되돌리기처럼 제한 시간 안에 눌러야 하는 토스트만 포커스를 가져간다 (안내·오류는 가져가지 않는다). */
  focusAction?: boolean;
}

/** 되돌리기 토스트 기본 수명 (설계 §3). */
export const UNDO_TOAST_MS = 5000;

/**
 * 토스트 한 장의 상태와 타이머. 컴포넌트 파일이 아니라 훅 파일에 둔다
 * (웹 ESLint react-refresh/only-export-components).
 *
 * 정책:
 * - **표시는 최신 토스트가 이긴다.** 한 번에 한 장만 띄우고, 새 토스트가 이전 것을 대체한다.
 * - **감추기는 id 로 한정한다.** A 카드의 오류·되돌리기가 B 카드의 살아 있는 되돌리기 토스트를
 *   말없이 걷어가지 않게 한다 (hide(id) 는 그 id 가 지금 보일 때만 듣는다).
 * - 토스트가 사라지는 것은 "동작 취소"가 아니다 — 되돌리기를 안 누르면 이미 보낸 요청이 그대로 남는다.
 */
export function useToast(defaultDurationMs = UNDO_TOAST_MS) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const timerRef = useRef<number | undefined>(undefined);
  const currentRef = useRef<ToastState | null>(null);
  const seqRef = useRef(0);

  useEffect(() => () => window.clearTimeout(timerRef.current), []);

  const hide = useCallback((id: number) => {
    if (currentRef.current?.id !== id) return;
    window.clearTimeout(timerRef.current);
    currentRef.current = null;
    setToast(null);
  }, []);

  const show = useCallback(
    (next: Omit<ToastState, "id">, durationMs = defaultDurationMs): number => {
      seqRef.current += 1;
      const entry: ToastState = { ...next, id: seqRef.current };
      window.clearTimeout(timerRef.current);
      currentRef.current = entry;
      setToast(entry);
      timerRef.current = window.setTimeout(() => {
        if (currentRef.current?.id !== entry.id) return;
        currentRef.current = null;
        setToast(null);
      }, durationMs);
      return entry.id;
    },
    [defaultDurationMs],
  );

  return { toast, show, hide };
}

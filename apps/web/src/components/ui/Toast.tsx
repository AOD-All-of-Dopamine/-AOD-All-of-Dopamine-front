import { useEffect, useRef } from "react";

/**
 * 하단 토스트 (목업 .toast) — collection-detail-page·AddToCollectionMenu 의 마크업을 공용화한 것.
 * role="status" 라 스크린 리더가 내용을 읽어 준다. 동작 버튼(되돌리기)은 진짜 <button> 이다.
 * <lg 는 하단 탭(64px) 위로 띄운다.
 *
 * focusAction 은 제한 시간 안에 눌러야 하는 토스트(되돌리기) 전용이다 — 안내·오류 토스트는
 * 포커스를 가져가지 않는다. 포커스를 쥔 채 사라지면 onFocusRelease 로 돌려준다.
 */
export interface ToastProps {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  focusAction?: boolean;
  /** focusAction 토스트가 포커스를 쥔 채 사라질 때 부른다 (목록 등 안정된 자리로 돌려보낸다). */
  onFocusRelease?: () => void;
}

const Toast = ({ message, actionLabel, onAction, focusAction, onFocusRelease }: ToastProps) => {
  const actionRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!focusAction) return;
    const button = actionRef.current;
    if (!button) return;
    button.focus({ preventScroll: true });
    return () => {
      // 정리 시점에는 버튼이 이미 떨어져 나가 activeElement 가 body 다 — 그때만 돌려준다
      // (사용자가 그사이 다른 곳을 눌렀으면 그 포커스를 뺏지 않는다).
      if (document.activeElement === button || document.activeElement === document.body) {
        onFocusRelease?.();
      }
    };
  }, [focusAction, onFocusRelease]);

  return (
    <div
      role="status"
      className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex justify-center px-4 lg:bottom-8"
    >
      <span className="pointer-events-auto flex min-w-0 items-center gap-2 rounded-full bg-ink px-[18px] py-2.5 text-[13.5px] font-semibold text-surface shadow-lift">
        <span className="truncate">{message}</span>
        {actionLabel && onAction && (
          <button
            ref={actionRef}
            type="button"
            onClick={onAction}
            className="flex-none rounded-full font-bold text-accent-tint underline-offset-2 hover:underline"
          >
            {actionLabel}
          </button>
        )}
      </span>
    </div>
  );
};

export default Toast;

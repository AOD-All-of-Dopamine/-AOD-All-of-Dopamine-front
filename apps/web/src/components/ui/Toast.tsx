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
  /**
   * 띄울 높이. 기본은 <lg 하단 탭(64px) 위 · lg 는 바닥 가까이다.
   * "above-bar" 는 화면 하단에 **고정 액션 바**가 있는 라우트(온보딩)용 — lg 에서도 bottom-24 로
   * 올려 70px 짜리 바를 덮지 않게 한다(토스트 알약은 pointer-events-auto 라 덮으면 클릭을 먹는다).
   */
  placement?: "default" | "above-bar";
}

/** 두 값 다 기존에 쓰던 유틸이라 빌드된 CSS 에 이미 들어 있다(새 클래스 아님). */
const PLACEMENT_CLASS: Record<NonNullable<ToastProps["placement"]>, string> = {
  default: "bottom-24 lg:bottom-8",
  "above-bar": "bottom-24",
};

const Toast = ({
  message,
  actionLabel,
  onAction,
  focusAction,
  onFocusRelease,
  placement = "default",
}: ToastProps) => {
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
      className={`pointer-events-none fixed inset-x-0 z-50 flex justify-center px-4 ${PLACEMENT_CLASS[placement]}`}
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

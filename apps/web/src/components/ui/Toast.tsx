/**
 * 하단 토스트 (목업 .toast) — collection-detail-page·AddToCollectionMenu 의 마크업을 공용화한 것.
 * role="status" 라 스크린 리더가 내용을 읽어 준다. 동작 버튼(되돌리기)은 진짜 <button> 이다.
 * <lg 는 하단 탭(64px) 위로 띄운다.
 */
export interface ToastProps {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

const Toast = ({ message, actionLabel, onAction }: ToastProps) => (
  <div
    role="status"
    className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex justify-center px-4 lg:bottom-8"
  >
    <span className="pointer-events-auto flex min-w-0 items-center gap-2 rounded-full bg-ink px-[18px] py-2.5 text-[13.5px] font-semibold text-surface shadow-lift">
      <span className="truncate">{message}</span>
      {actionLabel && onAction && (
        <button
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

export default Toast;

import { ReactNode, useEffect, useId, useRef } from "react";

/**
 * 토큰 스타일 확인 다이얼로그 (라이트 리디자인용).
 * 구 components/common/Modal(다크 하드코딩)의 라이트 대체재로,
 * 이식 완료된 페이지의 로그인 유도 등 2버튼 확인 UI에 사용한다.
 *
 * 네이티브 <dialog> + showModal() 기반 - ESC 닫기, 배경 inert(포커스 트랩),
 * top-layer 렌더를 브라우저가 처리한다. 닫힘 경로(ESC, 배경 클릭, 취소 버튼)는
 * 전부 dialog close 이벤트로 수렴해 onCancel 한 곳으로 통지된다.
 */
export interface ConfirmDialogProps {
  title: ReactNode;
  description?: ReactNode;
  cancelLabel?: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
}

const ConfirmDialog = ({
  title,
  description,
  cancelLabel = "취소",
  confirmLabel,
  onCancel,
  onConfirm,
}: ConfirmDialogProps) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  // 배경 클릭 판정: pointerdown과 click 타깃이 모두 ::backdrop(=dialog 자신)일
  // 때만 닫는다 - 패널 안에서 드래그를 시작해 배경에서 떼는 경우의 오동작 방지
  const pressedBackdropRef = useRef(false);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.showModal();
    cancelRef.current?.focus();
    // 열림 동안 body 스크롤 잠금 (top-layer 뒤 배경 스크롤 방지)
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
      if (dialog.open) dialog.close();
    };
  }, []);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onClose={() => {
        // 정상 닫힘(ESC·배경·취소)은 open=false 상태에서 발화한다. StrictMode의
        // effect 이중 실행이 재개방 후 뒤늦게 흘려보내는 유령 close 이벤트는
        // open=true 상태로 도착하므로 무시한다.
        if (!dialogRef.current?.open) onCancel();
      }}
      onPointerDown={(e) => {
        pressedBackdropRef.current = e.target === dialogRef.current;
      }}
      onClick={(e) => {
        if (e.target === dialogRef.current && pressedBackdropRef.current) {
          dialogRef.current?.close();
        }
      }}
      className="m-auto w-[min(360px,calc(100vw-48px))] rounded-panel border border-line bg-surface p-0 shadow-lift backdrop:bg-ink/40"
    >
      <div className="px-6 py-7 text-center">
        <p
          id={titleId}
          className="break-keep text-base font-semibold leading-relaxed text-ink"
        >
          {title}
        </p>
        {description && (
          <p id={descriptionId} className="mt-2 break-keep text-sm text-ink-2">
            {description}
          </p>
        )}
        <div className="mt-6 flex gap-2">
          <button
            ref={cancelRef}
            type="button"
            onClick={() => dialogRef.current?.close()}
            className="flex-1 rounded-full border border-line bg-surface py-2.5 text-sm font-semibold text-ink transition-colors hover:border-line-strong active:scale-[0.98]"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 rounded-full bg-accent py-2.5 text-sm font-semibold text-surface transition-colors hover:bg-accent-ink active:scale-[0.98]"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
};

export default ConfirmDialog;

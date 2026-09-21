import { ReactNode, useCallback, useEffect, useRef, useState } from "react";

/**
 * <lg 전용 바텀시트 - AddToCollectionSheet · 탐색 필터 시트와 같은 네이티브
 * dialog.showModal() 문법의 공용판 (top-layer + 배경 inert + Escape 를 브라우저가 맡는다).
 * 닫힘은 슬라이드 다운(300ms)이 끝난 뒤 close(), reduced-motion 이면 즉시.
 * lg+ 에서는 열지 않고 바로 onClose 를 부른다 - 그 폭은 호출부가 다른 표면(옆 패널 등)을 쓴다.
 * display:none 조상 아래에서는 top-layer 가 그려지지 않으므로 페이지 루트에 마운트할 것.
 */
export interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  ariaLabel: string;
  children: ReactNode;
}

const BottomSheet = ({ open, onClose, ariaLabel, children }: BottomSheetProps) => {
  const [shown, setShown] = useState(false);
  const sheetRef = useRef<HTMLDialogElement>(null);
  const pressedBackdropRef = useRef(false);
  const closeTimerRef = useRef<number | undefined>(undefined);
  // onClose 는 부모 렌더마다 새 함수일 수 있다 - 열림 이펙트가 그때마다 다시 돌지 않게 ref 로 본다
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  const closeSheet = useCallback(() => {
    const dialog = sheetRef.current;
    if (!dialog?.open) return;
    setShown(false);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      dialog.close();
      return;
    }
    window.clearTimeout(closeTimerRef.current);
    closeTimerRef.current = window.setTimeout(() => dialog.close(), 300);
  }, []);

  useEffect(() => {
    const dialog = sheetRef.current;
    if (!dialog) return;
    if (!open) {
      // 부모가 닫았다 - 열려 있으면 슬라이드 다운으로 닫는다
      if (dialog.open) closeSheet();
      return;
    }
    const mql = window.matchMedia("(min-width: 1024px)");
    if (mql.matches) {
      onCloseRef.current();
      return;
    }
    window.clearTimeout(closeTimerRef.current);
    if (!dialog.open) dialog.showModal();
    setShown(true);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onBreakpoint = () => {
      if (mql.matches) dialog.close();
    };
    mql.addEventListener("change", onBreakpoint);
    return () => {
      document.body.style.overflow = prevOverflow;
      mql.removeEventListener("change", onBreakpoint);
    };
  }, [open, closeSheet]);

  useEffect(
    () => () => {
      window.clearTimeout(closeTimerRef.current);
      if (sheetRef.current?.open) sheetRef.current.close();
    },
    [],
  );

  return (
    <dialog
      ref={sheetRef}
      aria-label={ariaLabel}
      onClose={() => {
        // StrictMode 이중 이펙트가 재개방 뒤 흘려보내는 유령 close 는 open 상태로 도착한다 - 무시
        if (sheetRef.current?.open) return;
        setShown(false);
        onClose();
      }}
      onCancel={(e) => {
        e.preventDefault();
        closeSheet();
      }}
      onPointerDown={(e) => {
        pressedBackdropRef.current = e.target === sheetRef.current;
      }}
      onClick={(e) => {
        // ::backdrop 클릭은 dialog 자신이 타깃이 된다
        if (e.target === sheetRef.current && pressedBackdropRef.current) {
          closeSheet();
        }
      }}
      className={`m-0 mt-auto w-full max-w-none rounded-t-2xl bg-surface p-0 shadow-lift transition-transform duration-300 backdrop:bg-ink/40 backdrop:transition-opacity backdrop:duration-300 motion-reduce:transition-none motion-reduce:backdrop:transition-none lg:hidden ${
        shown
          ? "translate-y-0 backdrop:opacity-100 starting:translate-y-full starting:backdrop:opacity-0"
          : "translate-y-full backdrop:opacity-0"
      }`}
    >
      {/* 패널 전면을 덮는 래퍼 - 내부 클릭이 dialog 자신(딤 판정)으로 새지 않게 */}
      <div className="flex h-[82dvh] flex-col">
        <div className="mx-auto mt-2.5 h-1 w-9 flex-none rounded-full bg-line-strong" />
        {children}
      </div>
    </dialog>
  );
};

export default BottomSheet;

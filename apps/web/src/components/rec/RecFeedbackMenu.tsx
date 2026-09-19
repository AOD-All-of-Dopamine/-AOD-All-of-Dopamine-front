import { useEffect, useId, useRef, useState } from "react";
import { DotsThreeVertical } from "@phosphor-icons/react";

export interface RecFeedbackMenuProps {
  /** 접근성 이름에 쓸 작품 제목 */
  title: string;
  onDislike: () => void;
  onNotInterested: () => void;
  onBookmark: () => void;
}

const ITEM_CLASS =
  "block w-full rounded-input px-3 py-2 text-left text-[13.5px] text-ink transition-colors hover:bg-ink/5";

/**
 * 카드 더보기 메뉴 (싫어요 · 관심 없음 · 북마크).
 * 트리거·항목이 전부 진짜 <button> 이라 Tab·Enter 로 닿고, Escape 로 닫히며 포커스가 트리거로 돌아온다.
 * 카드 하단에 붙으므로 위로 연다(bottom-full).
 */
const RecFeedbackMenu = ({ title, onDislike, onNotInterested, onBookmark }: RecFeedbackMenuProps) => {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const firstItemRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    firstItemRef.current?.focus();

    const onPointerDown = (event: MouseEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      triggerRef.current?.focus();
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  // 항목을 고르면 메뉴를 닫고 포커스를 트리거로 돌려준다.
  // (싫어요·관심 없음은 카드째 사라지므로 트리거도 함께 없어진다 — 그때는 아무 일도 하지 않는다.)
  const run = (action: () => void) => {
    setOpen(false);
    triggerRef.current?.focus();
    action();
  };

  return (
    <div ref={wrapperRef} className="relative ml-auto">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={`${title} 더보기`}
        onClick={() => setOpen((value) => !value)}
        className="grid h-9 w-9 place-items-center rounded-full text-ink-3 transition-colors hover:bg-ink/5 hover:text-ink"
      >
        <DotsThreeVertical size={18} weight="bold" />
      </button>

      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label={`${title} 피드백`}
          className="absolute bottom-full right-0 z-20 mb-1 w-[168px] rounded-panel border border-line bg-surface p-1 shadow-lift"
        >
          <button
            ref={firstItemRef}
            type="button"
            role="menuitem"
            onClick={() => run(onDislike)}
            className={ITEM_CLASS}
          >
            별로예요
          </button>
          <button type="button" role="menuitem" onClick={() => run(onNotInterested)} className={ITEM_CLASS}>
            관심 없음
          </button>
          <button type="button" role="menuitem" onClick={() => run(onBookmark)} className={ITEM_CLASS}>
            북마크에 담기
          </button>
        </div>
      )}
    </div>
  );
};

export default RecFeedbackMenu;

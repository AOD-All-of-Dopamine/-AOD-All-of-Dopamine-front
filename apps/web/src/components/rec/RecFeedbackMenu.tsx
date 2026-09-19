import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { DotsThreeVertical } from "@phosphor-icons/react";

export interface RecFeedbackMenuProps {
  /** 접근성 이름에 쓸 작품 제목 */
  title: string;
  onDislike: () => void;
  onNotInterested: () => void;
  onBookmark: () => void;
}

const ITEM_CLASS =
  "block w-full rounded-input px-3 py-2 text-left text-[13.5px] text-ink transition-colors hover:bg-ink/5 focus:bg-ink/5 focus:outline-none";

/**
 * 카드 더보기 메뉴 (싫어요 · 관심 없음 · 북마크 토글).
 * role="menu" 규약대로 움직인다 — 열면 첫 항목에 포커스, ↑↓·Home·End 로 항목 이동(순환),
 * Escape 로 닫고 트리거로 복귀, 바깥 클릭·Tab 으로 포커스가 빠져나가면 닫는다.
 * 항목은 tabIndex=-1 이라 Tab 은 메뉴를 벗어난다(= 닫힌다).
 *
 * 카드 하단에 붙으므로 위로 연다(bottom-full). 좁은 화면(2열, 카드 ~150px)에서도 1열 카드의
 * 팝업이 화면 왼쪽으로 잘리지 않도록 너비를 카드 폭에 가깝게 잡고 카드 오른쪽 끝(-right-[9px],
 * 버튼 행의 좌우 여백만큼)에 맞춘다. 360px 기준 1열 카드 오른쪽 끝 ≈ 174px → 팝업 왼쪽 ≈ 24px.
 *
 * 되돌릴 수 없는 자리 이동을 피하기 위해, 카드가 사라지는 항목(별로예요·관심 없음)은
 * 포커스를 트리거로 되돌리지 않는다 — 곧 떨어져 나갈 노드다. 포커스는 되돌리기 토스트가 받는다.
 */
const RecFeedbackMenu = ({ title, onDislike, onNotInterested, onBookmark }: RecFeedbackMenuProps) => {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const itemsRef = useRef<(HTMLButtonElement | null)[]>([]);

  const items = [
    { label: "별로예요", run: onDislike, keepsCard: false },
    { label: "관심 없음", run: onNotInterested, keepsCard: false },
    { label: "북마크", run: onBookmark, keepsCard: true },
  ];

  useEffect(() => {
    if (!open) return;
    itemsRef.current[0]?.focus({ preventScroll: true });

    const onPointerDown = (event: MouseEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      triggerRef.current?.focus({ preventScroll: true });
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const focusItem = (index: number) => {
    const count = itemsRef.current.length;
    if (count === 0) return;
    itemsRef.current[((index % count) + count) % count]?.focus({ preventScroll: true });
  };

  const onItemKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        focusItem(index + 1);
        break;
      case "ArrowUp":
        event.preventDefault();
        focusItem(index - 1);
        break;
      case "Home":
        event.preventDefault();
        focusItem(0);
        break;
      case "End":
        event.preventDefault();
        focusItem(items.length - 1);
        break;
      default:
        break;
    }
  };

  const run = (action: () => void, keepsCard: boolean) => {
    setOpen(false);
    if (keepsCard) triggerRef.current?.focus({ preventScroll: true });
    action();
  };

  return (
    <div
      ref={wrapperRef}
      className="relative ml-auto"
      onBlur={(event) => {
        // Tab 등으로 포커스가 메뉴 밖으로 나가면 닫는다 (카드째 사라질 때도 안전하게 닫힌다)
        if (!wrapperRef.current?.contains(event.relatedTarget as Node | null)) setOpen(false);
      }}
    >
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
          className="absolute bottom-full -right-[9px] z-20 mb-1 w-[150px] rounded-panel border border-line bg-surface p-1 shadow-lift"
        >
          {items.map((item, index) => (
            <button
              key={item.label}
              ref={(element) => {
                itemsRef.current[index] = element;
              }}
              type="button"
              role="menuitem"
              tabIndex={-1}
              onKeyDown={(event) => onItemKeyDown(event, index)}
              onClick={() => run(item.run, item.keepsCard)}
              className={ITEM_CLASS}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default RecFeedbackMenu;

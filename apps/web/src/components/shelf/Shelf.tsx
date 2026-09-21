import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Plus } from "@phosphor-icons/react";
import type { CollectionItem } from "@aod/shared/api";
import { shelfFaceOutIds } from "@aod/shared/hooks";
import { collectionTintBg } from "@aod/shared/constants";
import ShelfSpine from "./ShelfSpine";

/** 꽂히는 모션의 책등 간 간격 - 모바일 시트를 닫으면 그동안 꽂은 것이 차례로 떨어진다 */
const DROP_STAGGER_MS = 90;
/** 소유자에게 보이는 빈 칸 수 */
const GHOST_SLOTS = 3;

export interface ShelfProps {
  items: CollectionItem[];
  tint: string;
  selectedItemId: number | null;
  /** 같은 책등을 다시 누르면 null(도로 꽂기) */
  onSelect: (itemId: number | null) => void;
  /** 있으면 소유자 - 끝에 빈 칸을 보이고 첫 칸이 꽂기를 연다 */
  onRequestAdd?: () => void;
  /** 방금 꽂힌 itemId 들(꽂은 순서) - 차례로 떨어져 들어온다 */
  droppedItemIds?: number[];
}

/**
 * 컬렉션 책장 - 줄바꿈되는 선반 한 덩어리 (선반 판은 CSS 배경, index.css .shelf-wall).
 * 키보드: 책장 전체가 Tab 한 칸(roving tabindex), ←/→ · Home/End 로 옮기고 Esc 로 도로 꽂는다.
 * 말풍선은 상태가 아니라 DOM 을 직접 만진다 - 마우스가 책등을 훑을 때마다 100권을 다시 그리지 않게.
 */
const Shelf = ({
  items,
  tint,
  selectedItemId,
  onSelect,
  onRequestAdd,
  droppedItemIds = [],
}: ShelfProps) => {
  const rowsRef = useRef<HTMLDivElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const [focusId, setFocusId] = useState<number | null>(null);

  const faceOut = useMemo(() => shelfFaceOutIds(items), [items]);
  const dropOrder = useMemo(
    () => new Map(droppedItemIds.map((id, i) => [id, i])),
    [droppedItemIds],
  );

  // Tab 이 닿는 책등: 마지막으로 포커스했던 것 > 뽑힌 것 > 첫 권 (빠진 작품이면 건너뛴다)
  const tabbableId =
    [focusId, selectedItemId].find(
      (id) => id !== null && items.some((i) => i.itemId === id),
    ) ??
    items[0]?.itemId ??
    null;

  const selectedRef = useRef(selectedItemId);
  useEffect(() => {
    selectedRef.current = selectedItemId;
  });
  const handlePick = useCallback(
    (itemId: number) => onSelect(selectedRef.current === itemId ? null : itemId),
    [onSelect],
  );

  const handleTip = useCallback((anchor: HTMLElement | null, title: string) => {
    const tip = tipRef.current;
    if (!tip) return;
    if (!anchor) {
      tip.style.opacity = "0";
      return;
    }
    tip.textContent = title;
    const rect = anchor.getBoundingClientRect();
    const half = tip.offsetWidth / 2;
    const center = rect.left + rect.width / 2;
    const left = Math.max(8, Math.min(center - half, window.innerWidth - 8 - half * 2));
    tip.style.left = `${left}px`;
    // 호버·뽑힘으로 올라간 자리보다 위 (getBoundingClientRect 는 transform 을 반영한다)
    tip.style.top = `${rect.top - tip.offsetHeight - 10}px`;
    tip.style.opacity = "1";
  }, []);

  // 방금 꽂힌 첫 책등이 화면 밖이면 보이는 데까지 데려온다
  useEffect(() => {
    const first = droppedItemIds[0];
    if (first === undefined) return;
    rowsRef.current
      ?.querySelector(`[data-item-id="${first}"]`)
      ?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [droppedItemIds]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape" && selectedItemId !== null) {
      onSelect(null);
      return;
    }
    const step =
      e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!step && e.key !== "Home" && e.key !== "End") return;
    const spines = Array.from(
      rowsRef.current?.querySelectorAll<HTMLElement>("[data-item-id]") ?? [],
    );
    const at = spines.indexOf(document.activeElement as HTMLElement);
    if (at < 0) return;
    e.preventDefault();
    const next =
      e.key === "Home"
        ? 0
        : e.key === "End"
          ? spines.length - 1
          : Math.max(0, Math.min(at + step, spines.length - 1));
    spines[next]?.focus();
  };

  return (
    <div className={`shelf-wall rounded-panel ${collectionTintBg(tint)}`}>
      <div
        ref={rowsRef}
        role="group"
        aria-label="꽂힌 작품 - 좌우 화살표로 이동"
        className="shelf-rows"
        onKeyDown={handleKeyDown}
      >
        {items.map((item, index) => {
          const drop = dropOrder.get(item.itemId);
          const next = items[index + 1];
          return (
            <ShelfSpine
              key={item.itemId}
              item={item}
              faceOut={faceOut.has(item.itemId)}
              pressed={selectedItemId === item.itemId}
              tabbable={tabbableId === item.itemId}
              dropDelayMs={drop === undefined ? null : drop * DROP_STAGGER_MS}
              nudged={
                drop === undefined && !!next && dropOrder.get(next.itemId) === 0
              }
              onPick={handlePick}
              onFocusItem={setFocusId}
              onTip={handleTip}
            />
          );
        })}
        {onRequestAdd &&
          Array.from({ length: GHOST_SLOTS }, (_, i) => (
            <div key={`ghost-${i}`} className="shelf-slot">
              {i === 0 ? (
                <button
                  type="button"
                  onClick={onRequestAdd}
                  aria-label="빈 칸에 작품 꽂기"
                  className="shelf-ghost"
                >
                  <Plus size={14} weight="bold" />
                </button>
              ) : (
                <span className="shelf-ghost" aria-hidden="true" />
              )}
            </div>
          ))}
      </div>
      <div ref={tipRef} role="presentation" className="shelf-tip" />
    </div>
  );
};

export default Shelf;

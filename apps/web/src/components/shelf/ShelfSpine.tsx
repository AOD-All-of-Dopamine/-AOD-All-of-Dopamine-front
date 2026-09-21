import { CSSProperties, memo } from "react";
import {
  BookOpen,
  FilmSlate,
  GameController,
  PushPin,
  Scroll,
  TelevisionSimple,
  type Icon,
} from "@phosphor-icons/react";
import type { CollectionItem } from "@aod/shared/api";
import {
  categoryOf,
  thumbFitMap,
  type Category,
} from "../../constants/thumbnail";
import { spineFormat, spineTextureUrl } from "./shelfFormat";
import { useNearViewport } from "./useNearViewport";

const DOMAIN_ICON: Record<Category, Icon> = {
  movie: FilmSlate,
  tv: TelevisionSimple,
  game: GameController,
  webtoon: Scroll,
  webnovel: BookOpen,
};

export interface ShelfSpineProps {
  item: CollectionItem;
  /** 코멘트를 단 앞 3개 - 책등 대신 표지 + 메모 카드로 선다 */
  faceOut: boolean;
  pressed: boolean;
  /** roving tabindex - 책장 전체가 Tab 한 칸이고 이 책등이 그 자리다 */
  tabbable: boolean;
  /** null 이 아니면 방금 꽂힌 책등 - 이 지연(ms) 뒤에 떨어져 들어온다 */
  dropDelayMs: number | null;
  /** 오른쪽에 방금 꽂힌 책등이 있다 - 살짝 밀린다 */
  nudged: boolean;
  onPick: (itemId: number) => void;
  onFocusItem: (itemId: number) => void;
  onTip: (anchor: HTMLElement | null, title: string) => void;
}

/**
 * 선반의 한 칸 - 책등 한 권, 또는 표지 + 메모 카드(한 칸이라 줄이 바뀌어도 붙어 다닌다).
 * 질감은 posterUrl 의 가운데 조각이고, 화면 가까이 왔을 때만 건다(useNearViewport).
 * 이미지가 없거나 깨지면 뒷벽 위의 어두운 단색 책등으로 남는다.
 */
const ShelfSpine = memo(function ShelfSpine({
  item,
  faceOut,
  pressed,
  tabbable,
  dropDelayMs,
  nudged,
  onPick,
  onFocusItem,
  onTip,
}: ShelfSpineProps) {
  const [ref, near] = useNearViewport<HTMLButtonElement>();
  const category = categoryOf(item.domain);
  const DomainIcon = DOMAIN_ICON[category];
  const dropping = dropDelayMs !== null;
  const motion = `${dropping ? " shelf-dropping" : ""}${nudged ? " shelf-nudge" : ""}`;

  const common = {
    ref,
    type: "button" as const,
    "aria-pressed": pressed,
    "aria-label": `${item.title} 뽑아 보기`,
    "data-item-id": item.itemId,
    tabIndex: tabbable ? 0 : -1,
    onClick: () => onPick(item.itemId),
    onFocus: (e: React.FocusEvent<HTMLButtonElement>) => {
      onFocusItem(item.itemId);
      // 말풍선은 키보드 포커스에만 - 탭·클릭은 뽑아든 작품 카드가 이미 제목을 보여 준다
      if (e.currentTarget.matches(":focus-visible")) {
        onTip(e.currentTarget, item.title);
      }
    },
    onBlur: () => onTip(null, ""),
    onPointerEnter: (e: React.PointerEvent<HTMLButtonElement>) => {
      if (e.pointerType === "mouse") onTip(e.currentTarget, item.title);
    },
    onPointerLeave: () => onTip(null, ""),
  };

  if (faceOut) {
    const cover = thumbFitMap[category] === "cover";
    return (
      <div className="shelf-slot">
        <button
          {...common}
          className={`shelf-face${motion}`}
          style={
            dropping
              ? ({ "--drop-delay": `${dropDelayMs}ms` } as CSSProperties)
              : undefined
          }
        >
          {item.posterUrl && near && (
            <>
              {!cover && (
                <img
                  src={item.posterUrl}
                  alt=""
                  aria-hidden="true"
                  className="absolute inset-0 h-full w-full scale-110 object-cover opacity-80 blur-xl"
                />
              )}
              <img
                src={item.posterUrl}
                alt=""
                className={`relative h-full w-full ${cover ? "object-cover" : "object-contain"}`}
              />
            </>
          )}
        </button>
        <div className="shelf-memo" aria-hidden="true">
          <div className="flex items-center gap-1 text-[10.5px] font-bold text-accent-ink">
            <PushPin size={11} weight="fill" />
            메모
          </div>
          <p className="mt-0.5 font-memo text-[20px] leading-[1.08] text-ink max-lg:text-[18px]">
            {item.comment}
          </p>
        </div>
      </div>
    );
  }

  const { w, h } = spineFormat(item.domain, item.contentId);
  const texture = near ? spineTextureUrl(item.posterUrl) : null;
  const style = {
    "--w": `${w}px`,
    "--h": `${h}px`,
    ...(texture ? { "--img": `url("${texture.replace(/"/g, "%22")}")` } : {}),
    ...(dropping ? { "--drop-delay": `${dropDelayMs}ms` } : {}),
  } as CSSProperties;

  return (
    <div className="shelf-slot">
      <button {...common} className={`shelf-spine${motion}`} style={style}>
        <span className="shelf-spine-title">{item.title}</span>
        <span className="shelf-spine-icon" aria-hidden="true">
          <DomainIcon size={12} weight="fill" />
        </span>
      </button>
    </div>
  );
});

export default ShelfSpine;

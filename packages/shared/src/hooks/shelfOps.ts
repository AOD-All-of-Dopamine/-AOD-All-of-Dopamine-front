import type { CollectionDetail, CollectionItem } from "../api/collectionApi";

/**
 * 컬렉션 책장(상세 화면)의 순수 규칙·캐시 연산.
 * 상세 쿼리는 invalidate 하면 재조회가 조회수를 +1 시키므로(useCollectionDetail 주석),
 * 책장의 모든 변경은 캐시를 직접 고친다 - 그 변환을 여기 모아 테스트한다.
 * 전부 원본을 바꾸지 않고, 바뀐 것이 없으면 같은 객체를 돌려준다.
 */

/** 표지가 보이게 세우는 작품 수 상한 */
export const SHELF_FACE_OUT_MAX = 3;

const hasComment = (item: CollectionItem) => !!item.comment?.trim();

/** 코멘트가 있는 작품 중 앞에서 max 개 - 책등 대신 표지 + 메모 카드로 세운다 */
export const shelfFaceOutIds = (
  items: CollectionItem[],
  max = SHELF_FACE_OUT_MAX,
): Set<number> => {
  const out = new Set<number>();
  for (const item of items) {
    if (out.size >= max) break;
    if (hasComment(item)) out.add(item.itemId);
  }
  return out;
};

/** 말미에 꽂는다 (같은 itemId 가 이미 있으면 그대로) */
export const shelfAppend = (
  detail: CollectionDetail,
  item: CollectionItem,
): CollectionDetail =>
  detail.items.some((i) => i.itemId === item.itemId)
    ? detail
    : {
        ...detail,
        itemCount: detail.itemCount + 1,
        items: [...detail.items, item],
      };

/** index 자리에 끼운다 (되돌리기) - 범위를 넘으면 말미 */
export const shelfInsertAt = (
  detail: CollectionDetail,
  item: CollectionItem,
  index: number,
): CollectionDetail => {
  if (detail.items.some((i) => i.itemId === item.itemId)) return detail;
  const items = [...detail.items];
  items.splice(Math.max(0, Math.min(index, items.length)), 0, item);
  return { ...detail, itemCount: detail.itemCount + 1, items };
};

export const shelfRemove = (
  detail: CollectionDetail,
  itemId: number,
): CollectionDetail =>
  detail.items.some((i) => i.itemId === itemId)
    ? {
        ...detail,
        itemCount: Math.max(0, detail.itemCount - 1),
        items: detail.items.filter((i) => i.itemId !== itemId),
      }
    : detail;

/** 한 칸 옮긴다 (-1 왼쪽 / +1 오른쪽). 끝이거나 없는 작품이면 그대로 */
export const shelfMove = (
  detail: CollectionDetail,
  itemId: number,
  delta: -1 | 1,
): CollectionDetail => {
  const from = detail.items.findIndex((i) => i.itemId === itemId);
  const to = from + delta;
  if (from < 0 || to < 0 || to >= detail.items.length) return detail;
  const items = [...detail.items];
  [items[from], items[to]] = [items[to], items[from]];
  return { ...detail, items };
};

/** 코멘트를 고친다 - 빈 문자열·공백은 삭제(null) */
export const shelfSetComment = (
  detail: CollectionDetail,
  itemId: number,
  comment: string,
): CollectionDetail => {
  const next = comment.trim() || null;
  return {
    ...detail,
    items: detail.items.map((i) =>
      i.itemId === itemId ? { ...i, comment: next } : i,
    ),
  };
};

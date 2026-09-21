import { describe, it, expect } from "vitest";
import type { CollectionDetail, CollectionItem } from "../src/api/collectionApi";
import {
  shelfAppend,
  shelfFaceOutIds,
  shelfInsertAt,
  shelfMove,
  shelfRemove,
  shelfSetComment,
} from "../src/hooks/shelfOps";

const item = (itemId: number, comment: string | null = null): CollectionItem => ({
  itemId,
  contentId: itemId * 10,
  comment,
  position: itemId,
  title: `작품 ${itemId}`,
  posterUrl: null,
  releaseDate: null,
  domain: "GAME",
  score: null,
  creator: null,
  genres: null,
  platforms: null,
  weekday: null,
  status: null,
  ageRating: null,
  steamReviewDesc: null,
  steamPositivePct: null,
  externalRating: null,
});

const detail = (items: CollectionItem[]): CollectionDetail => ({
  id: 1,
  title: "갓겜 모음",
  description: null,
  domain: "GAME",
  tint: "PINE",
  visibility: "PUBLIC",
  likeCount: 0,
  viewCount: 0,
  itemCount: items.length,
  curatorNickname: "kim",
  coverPosters: [],
  likedByMe: false,
  createdAt: "2026-09-01T00:00:00",
  owner: true,
  updatedAt: "2026-09-01T00:00:00",
  items,
});

const ids = (d: CollectionDetail) => d.items.map((i) => i.itemId);

describe("shelfFaceOutIds — 코멘트가 있는 앞 3개만 표지를 세운다", () => {
  it("코멘트 없는 작품은 건너뛰고 앞에서부터 센다", () => {
    const items = [item(1), item(2, "메모"), item(3), item(4, "메모"), item(5, "메모"), item(6, "메모")];
    expect([...shelfFaceOutIds(items)]).toEqual([2, 4, 5]);
  });

  it("공백뿐인 코멘트는 코멘트가 아니다", () => {
    expect([...shelfFaceOutIds([item(1, "   "), item(2, "진짜")])]).toEqual([2]);
  });

  it("상한을 바꿀 수 있다", () => {
    expect([...shelfFaceOutIds([item(1, "a"), item(2, "b")], 1)]).toEqual([1]);
  });
});

describe("shelf 캐시 연산 — 원본을 바꾸지 않고 새 상세를 돌려준다", () => {
  it("append: 말미에 붙이고 itemCount +1", () => {
    const before = detail([item(1)]);
    const after = shelfAppend(before, item(2));
    expect(ids(after)).toEqual([1, 2]);
    expect(after.itemCount).toBe(2);
    expect(ids(before)).toEqual([1]);
  });

  it("append: 이미 있는 itemId 는 다시 붙이지 않는다 (중복 응답 방어)", () => {
    const before = detail([item(1)]);
    expect(shelfAppend(before, item(1))).toBe(before);
  });

  it("insertAt: 원래 자리에 끼우고, 범위를 넘으면 말미", () => {
    expect(ids(shelfInsertAt(detail([item(1), item(3)]), item(2), 1))).toEqual([1, 2, 3]);
    expect(ids(shelfInsertAt(detail([item(1)]), item(2), 99))).toEqual([1, 2]);
  });

  it("remove: 있으면 빼고 itemCount -1, 없으면 그대로", () => {
    const before = detail([item(1), item(2)]);
    const after = shelfRemove(before, 1);
    expect(ids(after)).toEqual([2]);
    expect(after.itemCount).toBe(1);
    expect(shelfRemove(before, 99)).toBe(before);
  });

  it("move: 한 칸 옮기고, 끝에서는 그대로", () => {
    const before = detail([item(1), item(2), item(3)]);
    expect(ids(shelfMove(before, 2, -1))).toEqual([2, 1, 3]);
    expect(ids(shelfMove(before, 2, 1))).toEqual([1, 3, 2]);
    expect(shelfMove(before, 1, -1)).toBe(before);
    expect(shelfMove(before, 3, 1)).toBe(before);
    expect(shelfMove(before, 99, 1)).toBe(before);
  });

  it("setComment: 빈 문자열·공백은 코멘트 삭제(null)", () => {
    const before = detail([item(1, "옛 메모")]);
    expect(shelfSetComment(before, 1, "새 메모").items[0].comment).toBe("새 메모");
    expect(shelfSetComment(before, 1, "  ").items[0].comment).toBeNull();
    expect(before.items[0].comment).toBe("옛 메모");
  });
});

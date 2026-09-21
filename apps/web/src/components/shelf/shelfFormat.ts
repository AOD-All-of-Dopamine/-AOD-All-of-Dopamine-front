import { categoryOf, type Category } from "../../constants/thumbnail";

/**
 * 책등 규격 (배율 1 기준 px) - 도메인의 실물 매체를 따른다:
 * 영화 블루레이(얇고 큼) · 시리즈 박스셋(두꺼움) · 게임 케이스(얇고 작음) ·
 * 웹툰 단행본(낮음) · 웹소설(두껍고 큼).
 * 컬렉션은 단일 도메인이라 규격만으로는 선반이 밋밋하다 - contentId 로 정해지는
 * 두께·높이 변주를 얹는다. 난수가 아니라 해시라서 같은 작품은 언제나 같은 책등이다.
 */
export interface SpineFormat {
  w: number;
  h: number;
}

const BASE: Record<Category, SpineFormat> = {
  movie: { w: 24, h: 178 },
  tv: { w: 40, h: 178 },
  game: { w: 22, h: 166 },
  webtoon: { w: 27, h: 152 },
  webnovel: { w: 36, h: 188 },
};

/** 32비트 정수 섞기 (murmur3 finalizer) - 연속된 id 도 고르게 흩어진다 */
const mix = (n: number): number => {
  let x = (n ^ 0x9e3779b9) >>> 0;
  x = Math.imul(x ^ (x >>> 16), 0x85ebca6b) >>> 0;
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35) >>> 0;
  return (x ^ (x >>> 16)) >>> 0;
};

/** 두께 -3…+8px, 높이 0…-9px(3px 단위) */
export const spineFormat = (domain: string, contentId: number): SpineFormat => {
  const base = BASE[categoryOf(domain)];
  const h = mix(contentId);
  return { w: base.w - 3 + (h % 12), h: base.h - ((h >>> 8) % 4) * 3 };
};

/**
 * 책등 질감용 이미지 URL - 폭 20~40px 조각에 w500 은 낭비라 TMDB 는 작은 판으로 바꾼다.
 * 그 밖의 호스트(Steam·네이버)는 크기 변형 규칙이 일정하지 않아 그대로 쓴다.
 */
export const spineTextureUrl = (posterUrl: string | null): string | null =>
  posterUrl?.replace("image.tmdb.org/t/p/w500/", "image.tmdb.org/t/p/w154/") ??
  null;

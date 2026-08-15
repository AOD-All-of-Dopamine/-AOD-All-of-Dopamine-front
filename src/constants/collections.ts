import type { CollectionTint } from "../api/collectionApi";

/**
 * 컬렉션 표면 공용 상수.
 * 틴트는 index.css @theme의 --color-tint-* 토큰(콘텐츠 색)만 참조한다 -
 * Tailwind JIT가 클래스를 수집할 수 있게 정적 문자열 매핑으로 고정.
 */
export const COLLECTION_TINT_BG: Record<CollectionTint, string> = {
  PINE: "bg-tint-pine",
  OLIVE: "bg-tint-olive",
  SLATE: "bg-tint-slate",
  TERRACOTTA: "bg-tint-terracotta",
  MOCHA: "bg-tint-mocha",
  PLUM: "bg-tint-plum",
};

/** 미지의 틴트 값(서버 확장 등)은 기본 틴트(PINE)로 폴백 */
export const collectionTintBg = (tint: string): string =>
  COLLECTION_TINT_BG[tint as CollectionTint] ?? COLLECTION_TINT_BG.PINE;

/**
 * 컬렉션 도메인 라벨 - 제품 결정(플랜)상 영화/시리즈는 "영화·시리즈" 한 단위로
 * 노출한다 (데이터는 MOVIE/TV로 나뉘어 저장되지만 표기는 통합).
 */
export const COLLECTION_DOMAIN_LABEL: Record<string, string> = {
  GAME: "게임",
  WEBTOON: "웹툰",
  MOVIE: "영화·시리즈",
  TV: "영화·시리즈",
  WEBNOVEL: "웹소설",
};

export const collectionDomainLabel = (domain: string): string =>
  COLLECTION_DOMAIN_LABEL[domain] ?? domain;

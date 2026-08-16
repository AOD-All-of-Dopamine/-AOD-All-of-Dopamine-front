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

/** 틴트 선택 UI(생성/편집)의 한글 라벨 - 목업 aria-label 표기 */
export const COLLECTION_TINT_LABEL: Record<CollectionTint, string> = {
  PINE: "파인",
  OLIVE: "올리브",
  SLATE: "슬레이트",
  TERRACOTTA: "테라코타",
  MOCHA: "모카",
  PLUM: "플럼",
};

/** 선택 UI 순회용 고정 순서 (목업 순서) */
export const COLLECTION_TINTS: CollectionTint[] = [
  "PINE",
  "OLIVE",
  "SLATE",
  "TERRACOTTA",
  "MOCHA",
  "PLUM",
];

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

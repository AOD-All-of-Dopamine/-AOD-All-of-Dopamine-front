import type { CollectionTint } from '@aod/shared/api';

import { Palette } from '@/constants/theme';

/**
 * 컬렉션 커버 틴트 enum -> RN 색상 매핑.
 * shared의 collectionTintBg는 Tailwind 클래스(bg-tint-*)를 돌려주는 웹 전용이라
 * 모바일은 같은 순서·같은 폴백(PINE)으로 Palette 틴트 hex를 매핑한다.
 * 틴트는 콘텐츠 색 - UI 액센트로 사용 금지 (theme.ts 주석 참조).
 */
export const COLLECTION_TINT_COLOR: Record<CollectionTint, string> = {
  PINE: Palette.tintPine,
  OLIVE: Palette.tintOlive,
  SLATE: Palette.tintSlate,
  TERRACOTTA: Palette.tintTerracotta,
  MOCHA: Palette.tintMocha,
  PLUM: Palette.tintPlum,
};

/** 미지의 틴트 값(서버 확장 등)은 기본 틴트(PINE)로 폴백 - shared 관례 동일 */
export const collectionTintColor = (tint: string): string =>
  COLLECTION_TINT_COLOR[tint as CollectionTint] ?? COLLECTION_TINT_COLOR.PINE;

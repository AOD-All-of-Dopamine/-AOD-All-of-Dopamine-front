// 구 다크 토큰명 -> AOD 라이트 팔레트 매핑 (컴파일 보존용).
// 구 화면(M-B/C에서 리스타일 예정)이 이 이름들을 참조 중이라 이름은 유지하고
// 값만 라이트 토큰으로 넘긴다. 신규 코드는 constants/theme.ts의 Palette를 직접 쓸 것.
// 하드코딩 hex 금지 - 모든 hex는 constants/theme.ts 한 곳에만 둔다.

import { Palette } from '@/constants/theme';

export const colors = {
  accent: Palette.accent,
  accentPressed: Palette.accentInk,

  background: Palette.canvas,
  surface: Palette.surface,
  surfaceDeep: Palette.canvas,
  border: Palette.line,

  textPrimary: Palette.ink,
  textBright: Palette.ink,
  textMuted: Palette.ink2,
  textFaint: Palette.ink3,

  error: Palette.danger,
  blue: Palette.tintSlate,

  // 랭킹 순위·변동 - 라이트 팔레트 근사 매핑 (정식 문법은 M-B 랭킹 리스타일에서)
  rankGold: Palette.star,
  rankSilver: Palette.ink3,
  rankBronze: Palette.tintTerracotta,
  changeUp: Palette.accentInk,
  changeDown: Palette.tintSlate,
} as const;

// Tailwind 스케일(1 = 4px) 미러
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  full: 999,
} as const;

// 웹과 동일한 Pretendard (static weights - Android는 weight 교차 매칭 불가)
export const fonts = {
  regular: 'Pretendard-Regular',
  medium: 'Pretendard-Medium',
  semiBold: 'Pretendard-SemiBold',
  bold: 'Pretendard-Bold',
} as const;

export function fontFamilyForWeight(weight?: string | number): string {
  const w =
    typeof weight === 'string'
      ? weight === 'bold'
        ? 700
        : Number(weight) || 400
      : (weight ?? 400);
  if (w >= 700) return fonts.bold;
  if (w >= 600) return fonts.semiBold;
  if (w >= 500) return fonts.medium;
  return fonts.regular;
}

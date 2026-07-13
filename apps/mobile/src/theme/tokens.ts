// AOD 디자인 토큰 — 웹(apps/web/src) 실사용 hex 실측치를 미러링한다.
// NativeWind 보류 결정(F2 계획 참조)에 따라 스타일은 StyleSheet + 이 토큰만 사용.
// 하드코딩 hex 금지 — 새 색이 필요하면 여기에 추가하고 웹 값과 맞출 것.

export const colors = {
  accent: "#855BFF", // 웹 최다 사용 (버튼·강조)
  accentPressed: "#6F45E6",

  background: "#242424", // 웹 :root 배경
  surface: "#302F31",
  surfaceDeep: "#2A2A2A",
  border: "#403F43",

  textPrimary: "#FFFFFF",
  textBright: "#D3D3D3",
  textMuted: "#B2B1B3",
  textFaint: "#8D8C8E",

  error: "#FF5455",
  blue: "#445FD1",
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

// 웹과 동일한 Pretendard (static weights — Android는 weight 교차 매칭 불가)
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

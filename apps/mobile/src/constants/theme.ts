/**
 * AOD 라이트 디자인 토큰 - 단일 진실: docs/plans/2026-08-17-mobile-app-redesign.md
 * (웹 원본: apps/web/src/index.css @theme, 목업: mockups/mobile-light-mockup.html)
 *
 * 하드 룰: 임의 hex는 이 파일의 토큰 정의에만 둔다. 컴포넌트·화면·theme/tokens.ts는
 * 반드시 Palette를 참조할 것.
 */

import '@/global.css';

import { Platform } from 'react-native';

// ---------- AOD 라이트 팔레트 ----------
export const Palette = {
  /* 표면 */
  canvas: '#f7f6f4', // 페이지 배경 (웜 뉴트럴)
  surface: '#fdfdfc', // 카드·패널·내비 표면
  line: '#e7e5e1', // 기본 테두리
  lineStrong: '#d8d5cf', // 호버·강조 테두리

  /* 텍스트 */
  ink: '#1c1b19',
  ink2: '#716f6a',
  ink3: '#9c9993',

  /* 액센트 (유일) + 시맨틱 예외 */
  accent: '#e2542c',
  accentInk: '#b23d1c',
  accentTint: '#faeee9',
  star: '#d9930d', // 별점 전용
  danger: '#c73e1d', // 폼 에러·파괴 액션 전용

  /* 컬렉션 커버 틴트 6종 - 콘텐츠 색(포스터와 같은 지위). UI 액센트로 사용 금지 */
  tintPine: '#3f5c52',
  tintOlive: '#5d6b4e',
  tintSlate: '#4e5d6b',
  tintTerracotta: '#a45c48',
  tintMocha: '#6b5a4e',
  tintPlum: '#5f4e6b',

  /* 그림자 베이스 색 (웹 shadow-card의 rgb(58 48 40) - 순흑 금지) */
  shadowInk: '#3a3028',
} as const;

// ---------- 반투명 오버레이 (목업 rgba 실측치 - ink·딤 베이스) ----------
export const Overlay = {
  /** 아이콘 버튼 pressed 배경 (목업 .icon-btn:active rgb(28 27 25 / .06)) */
  pressed: 'rgba(28, 27, 25, 0.06)',
  /** 바텀시트 딤 (목업 .sheet-dim rgb(20 14 10 / .38)) */
  dim: 'rgba(20, 14, 10, 0.38)',
  /** 홈 히어로 하단 그라데이션 종점 (목업 .hero-grad rgb(20 14 10 / .78)) */
  heroGrad: 'rgba(20, 14, 10, 0.78)',
} as const;

// ---------- 라운드: 카드·패널 12 / 입력 8 / 칩·버튼 pill ----------
export const Radius = {
  panel: 12,
  input: 8,
  pill: 999,
} as const;

// 라이트 락 - 다크 매핑은 백로그(웹과 동일 정책). light/dark 모두 라이트 팔레트로 통일.
// 키 이름은 구 화면 호환용 매핑(리스타일은 M-B/C 몫) - 신규 코드는 Palette를 직접 쓸 것.
const aodLight = {
  text: Palette.ink,
  background: Palette.canvas,
  backgroundElement: Palette.surface,
  backgroundSelected: Palette.accentTint,
  textSecondary: Palette.ink2,
} as const;

export const Colors = {
  light: aodLight,
  dark: aodLight,
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;

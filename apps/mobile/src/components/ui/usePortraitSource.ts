import { useState } from 'react';

/**
 * 세로 틀 이미지 고르기 (게임 세로 표지 설계 2026-10-01).
 * 세로 표지(Steam 라이브러리 캡슐)가 있으면 그것, 깨지면 그 주소만 실패로 기억하고 기존 썸네일로 돌아간다
 * (같은 컴포넌트에 다른 작품이 들어와도 새 표지가 갇히지 않게). 웹 WorkThumb 와 같은 규칙.
 */
export function usePortraitSource(
  portraitUrl: string | null | undefined,
  imageUrl: string | null | undefined,
  enabled = true,
): { uri: string | null; onError?: () => void } {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const portrait = enabled && portraitUrl && portraitUrl !== failedSrc ? portraitUrl : null;
  if (portrait) return { uri: portrait, onError: () => setFailedSrc(portrait) };
  return { uri: imageUrl || null };
}

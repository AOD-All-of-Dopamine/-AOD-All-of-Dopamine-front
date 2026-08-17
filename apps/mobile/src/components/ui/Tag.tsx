import { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Palette, Radius } from '@/constants/theme';

/**
 * 작은 정적 라벨 태그 (웹 ui/Tag 이식).
 * - "canvas"(기본) = 카드 장르 태그 (11.5px, bg canvas)
 * - "surface" = 상세 장르 태그 (12px, bg surface)
 * - "accent" = 도메인 칩 (12.5px, accent-tint)
 */
export interface TagProps {
  children: ReactNode;
  variant?: 'canvas' | 'surface' | 'accent';
}

export function Tag({ children, variant = 'canvas' }: TagProps) {
  return (
    <View style={[styles.base, containerStyles[variant]]}>
      <ThemedText style={textStyles[variant]}>{children}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: Radius.pill,
    alignSelf: 'flex-start',
  },
});

const containerStyles = StyleSheet.create({
  canvas: {
    backgroundColor: Palette.canvas,
    borderWidth: 1,
    borderColor: Palette.line,
    paddingHorizontal: 10,
    paddingVertical: 2.5,
  },
  surface: {
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.line,
    paddingHorizontal: 11,
    paddingVertical: 3.5,
  },
  accent: {
    backgroundColor: Palette.accentTint,
    paddingHorizontal: 12,
    paddingVertical: 3,
  },
});

const textStyles = StyleSheet.create({
  canvas: {
    fontSize: 11.5,
    lineHeight: 16,
    fontWeight: 600,
    color: Palette.ink2,
  },
  surface: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: 600,
    color: Palette.ink2,
  },
  accent: {
    fontSize: 12.5,
    lineHeight: 18,
    fontWeight: 700,
    color: Palette.accentInk,
  },
});

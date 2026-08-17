import { ReactNode } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Palette, Radius } from '@/constants/theme';

/**
 * 공개 설정 옵션 버튼 (목업 .vis-opt) - 웹 ui/VisibilityOption의 RN 이식판.
 * 활성 = accent-ink 테두리 + accent-tint 배경. 부모가 radiogroup 컨테이너.
 */
export interface VisibilityOptionProps {
  active: boolean;
  onPress: () => void;
  icon: ReactNode;
  label: string;
}

export function VisibilityOption({ active, onPress, icon, label }: VisibilityOptionProps) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.option,
        active && styles.optionActive,
        pressed && styles.pressed,
      ]}>
      {icon}
      <ThemedText style={[styles.label, active && styles.labelActive]}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  option: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: Radius.input,
    borderWidth: 1,
    borderColor: Palette.line,
    backgroundColor: Palette.surface,
  },
  optionActive: {
    borderColor: Palette.accentInk,
    backgroundColor: Palette.accentTint,
  },
  pressed: {
    opacity: 0.85,
  },
  label: {
    fontSize: 13.5,
    lineHeight: 18,
    fontWeight: 500,
    color: Palette.ink2,
  },
  labelActive: {
    fontWeight: 700,
    color: Palette.accentInk,
  },
});

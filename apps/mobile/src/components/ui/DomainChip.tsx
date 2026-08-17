import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Palette, Radius } from '@/constants/theme';

/**
 * 도메인·플랫폼 선택 칩 (목업 .chip) - nowrap 가로 스크롤 chips-row에서 사용.
 * active = ink 배경 반전, disabled = 흐림 + "준비 중" 접미(목업 "카카오웹툰 · 준비 중").
 */
interface DomainChipProps {
  label: string;
  active?: boolean;
  disabled?: boolean;
  /** disabled 로드맵 표기 - 라벨 뒤 " · 준비 중" 형태로 붙는다 */
  soonLabel?: string;
  onPress?: () => void;
}

export function DomainChip({
  label,
  active = false,
  disabled = false,
  soonLabel,
  onPress,
}: DomainChipProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        active && styles.chipOn,
        disabled && styles.chipDisabled,
        pressed && styles.pressed,
      ]}>
      <ThemedText style={[styles.text, active && styles.textOn]}>
        {soonLabel ? `${label} · ${soonLabel}` : label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Palette.line,
    backgroundColor: Palette.surface,
  },
  chipOn: {
    backgroundColor: Palette.ink,
    borderColor: Palette.ink,
  },
  chipDisabled: {
    opacity: 0.4,
  },
  pressed: {
    opacity: 0.85,
  },
  text: {
    fontSize: 13.5,
    lineHeight: 18,
    fontWeight: 600,
    color: Palette.ink2,
  },
  textOn: {
    color: Palette.surface,
  },
});

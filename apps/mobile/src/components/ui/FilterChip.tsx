import { Pressable, StyleSheet } from 'react-native';
import { X } from 'phosphor-react-native';

import { ThemedText } from '@/components/themed-text';
import { Palette, Radius } from '@/constants/theme';

/**
 * 활성 필터 칩 (목업 .a-chip) - accent-tint 배경 + 제거(X).
 * 칩 전체가 제거 버튼이다 (목업 터치 타깃 그대로).
 */
interface FilterChipProps {
  label: string;
  onRemove: () => void;
}

export function FilterChip({ label, onRemove }: FilterChipProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label} 필터 제거`}
      onPress={onRemove}
      style={({ pressed }) => [styles.chip, pressed && styles.pressed]}>
      <ThemedText style={styles.text}>{label}</ThemedText>
      <X size={13} color={Palette.accentInk} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 7,
    paddingLeft: 12,
    paddingRight: 8,
    borderRadius: Radius.pill,
    backgroundColor: Palette.accentTint,
  },
  pressed: {
    opacity: 0.8,
  },
  text: {
    fontSize: 13,
    lineHeight: 17,
    fontWeight: 600,
    color: Palette.accentInk,
  },
});

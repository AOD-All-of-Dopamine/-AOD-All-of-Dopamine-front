import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import type { CollectionTint } from '@aod/shared/api';
import { COLLECTION_TINTS, COLLECTION_TINT_LABEL } from '@aod/shared/constants';

import { COLLECTION_TINT_COLOR } from '@/components/ui/collectionTints';
import { Palette, Radius } from '@/constants/theme';

/**
 * 커버 틴트 6종 선택 (목업 .m-tint-row, 30px) - 웹 ui/TintPicker의 RN 이식판.
 * 선택 상태 = ink 테두리 + 안쪽 surface 링 (목업 .tint.sel의 inset 섀도 등가).
 * 틴트는 콘텐츠 색 토큰만 사용 - UI 액센트 규율과 분리.
 */
export interface TintPickerProps {
  value: CollectionTint;
  onChange: (tint: CollectionTint) => void;
  style?: StyleProp<ViewStyle>;
}

export function TintPicker({ value, onChange, style }: TintPickerProps) {
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel="커버 틴트" style={[styles.row, style]}>
      {COLLECTION_TINTS.map((tint) => {
        const selected = tint === value;
        return (
          <Pressable
            key={tint}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={COLLECTION_TINT_LABEL[tint]}
            onPress={() => onChange(tint)}
            style={({ pressed }) => [
              styles.outer,
              selected && styles.outerSelected,
              pressed && styles.pressed,
            ]}>
            <View
              style={[styles.swatch, { backgroundColor: COLLECTION_TINT_COLOR[tint] }]}
            />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  outer: {
    width: 30,
    height: 30,
    borderRadius: Radius.pill,
    borderWidth: 2,
    borderColor: 'transparent',
    // 선택 시 ink 테두리 안쪽에 surface 링이 보이도록 패딩으로 간격 확보
    padding: 2,
    backgroundColor: Palette.surface,
  },
  outerSelected: {
    borderColor: Palette.ink,
  },
  pressed: {
    opacity: 0.85,
  },
  swatch: {
    flex: 1,
    borderRadius: Radius.pill,
  },
});

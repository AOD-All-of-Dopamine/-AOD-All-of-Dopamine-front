import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { WarningCircle } from 'phosphor-react-native';

import { ThemedText } from '@/components/themed-text';
import { Palette, Radius } from '@/constants/theme';

/**
 * 섹션 단위 인라인 에러 (웹 홈 SectionError 이식) - 전체 화면 붕괴 금지,
 * 실패한 섹션 자리에만 안내 + 재시도.
 */
interface SectionErrorProps {
  message: string;
  onRetry: () => void;
  style?: StyleProp<ViewStyle>;
}

export function SectionError({ message, onRetry, style }: SectionErrorProps) {
  return (
    <View accessibilityRole="alert" style={[styles.wrap, style]}>
      <WarningCircle size={18} color={Palette.ink3} />
      <ThemedText numberOfLines={2} style={styles.message}>
        {message}
      </ThemedText>
      <Pressable
        accessibilityRole="button"
        onPress={onRetry}
        style={({ pressed }) => [styles.retry, pressed && styles.retryPressed]}>
        <ThemedText style={styles.retryText}>다시 시도</ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.line,
    borderRadius: Radius.panel,
  },
  message: {
    flex: 1,
    fontSize: 13.5,
    lineHeight: 19,
    fontWeight: 400,
    color: Palette.ink2,
  },
  retry: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Palette.line,
    backgroundColor: Palette.canvas,
  },
  retryPressed: {
    borderColor: Palette.lineStrong,
  },
  retryText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: 600,
    color: Palette.ink,
  },
});

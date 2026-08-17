import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Palette, Radius } from '@/constants/theme';

/**
 * 하단 토스트 (목업 .toast) - ink 배경 pill + 선택적 액션("보러 가기").
 * 담기 시트·컬렉션 상세 좋아요 실패 안내 등 웹 토스트 관례의 RN 대응.
 * 상태는 useToast 훅이 관리하고 ToastPill은 표시만 담당한다.
 */
export interface ToastState {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function useToast(duration = 2600) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const showToast = useCallback(
    (next: ToastState) => {
      setToast(next);
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setToast(null), duration);
    },
    [duration],
  );

  const hideToast = useCallback(() => {
    clearTimeout(timerRef.current);
    setToast(null);
  }, []);

  return { toast, showToast, hideToast };
}

export function ToastPill({
  toast,
  style,
}: {
  toast: ToastState;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View pointerEvents="box-none" style={[styles.host, style]}>
      <View style={styles.pill}>
        <ThemedText numberOfLines={1} style={styles.message}>
          {toast.message}
        </ThemedText>
        {toast.actionLabel && (
          <Pressable accessibilityRole="button" onPress={toast.onAction} hitSlop={8}>
            <ThemedText style={styles.action}>{toast.actionLabel}</ThemedText>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    left: 16,
    right: 16,
    alignItems: 'center',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    maxWidth: '100%',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: Radius.pill,
    backgroundColor: Palette.ink,
    // 목업 shadow-lift 근사
    shadowColor: Palette.shadowInk,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 8,
  },
  message: {
    flexShrink: 1,
    fontSize: 13.5,
    lineHeight: 18,
    fontWeight: 600,
    color: Palette.surface,
  },
  action: {
    fontSize: 13.5,
    lineHeight: 18,
    fontWeight: 700,
    color: Palette.accentTint,
  },
});

import { ReactNode } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { Overlay, Radius } from '@/constants/theme';

/**
 * 상단 바 공용 아이콘 버튼 - 목업 .icon-btn (44px 터치 타깃, pill, pressed 오버레이).
 */
interface IconButtonProps {
  /** 접근성 라벨 (아이콘 단독 버튼이라 필수) */
  label: string;
  onPress?: () => void;
  children: ReactNode;
}

export function IconButton({ label, onPress, children }: IconButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 44,
    height: 44,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    backgroundColor: Overlay.pressed,
  },
});

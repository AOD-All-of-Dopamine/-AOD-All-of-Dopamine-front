import { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet } from 'react-native';

import { Palette, Radius } from '@/constants/theme';

/**
 * 온/오프 스위치 - 웹 ui/ToggleSwitch(mixed-grid-mockup.html .switch 수치)의 RN 이식.
 * 36x21 트랙 + 16px 노브(인셋 2.5, on 시 translateX 15 - 웹 전환 수치 동일).
 * on = accent-ink 트랙, off = line-strong 트랙. 라벨은 소비처가 옆에 배치한다.
 * hitSlop으로 터치 타깃을 44pt 이상(52x45)으로 확장한다.
 */
export interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  accessibilityLabel?: string;
}

export function ToggleSwitch({
  checked,
  onChange,
  disabled = false,
  accessibilityLabel,
}: ToggleSwitchProps) {
  // 노브 이동 애니메이션 (0 = off, 1 = on) - 웹 transition-transform 대응
  const anim = useRef(new Animated.Value(checked ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(anim, {
      toValue: checked ? 1 : 0,
      duration: 150,
      useNativeDriver: true,
    }).start();
  }, [checked, anim]);

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked, disabled }}
      disabled={disabled}
      onPress={() => onChange(!checked)}
      hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
      style={[
        styles.track,
        checked && styles.trackOn,
        disabled && styles.trackDisabled,
      ]}>
      <Animated.View
        style={[
          styles.knob,
          {
            transform: [
              {
                translateX: anim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 15],
                }),
              },
            ],
          },
        ]}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: {
    width: 36,
    height: 21,
    borderRadius: Radius.pill,
    backgroundColor: Palette.lineStrong,
    justifyContent: 'center',
  },
  trackOn: {
    backgroundColor: Palette.accentInk,
  },
  trackDisabled: {
    opacity: 0.45,
  },
  knob: {
    width: 16,
    height: 16,
    borderRadius: Radius.pill,
    backgroundColor: Palette.surface,
    marginLeft: 2.5,
  },
});

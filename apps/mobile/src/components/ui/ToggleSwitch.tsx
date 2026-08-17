import { Pressable, StyleSheet, View } from 'react-native';

import { Palette, Radius } from '@/constants/theme';

/**
 * 온/오프 스위치 - 웹 ui/ToggleSwitch(mixed-grid-mockup.html .switch 수치)의 RN 이식.
 * 36x21 트랙 + 16px 노브(인셋 2.5). on = accent-ink 트랙, off = line-strong 트랙.
 * 라벨은 소비처가 옆에 배치한다.
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
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked, disabled }}
      disabled={disabled}
      onPress={() => onChange(!checked)}
      hitSlop={8}
      style={[
        styles.track,
        checked && styles.trackOn,
        disabled && styles.trackDisabled,
      ]}>
      <View style={[styles.knob, checked && styles.knobOn]} />
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
  knobOn: {
    // 36(트랙) - 16(노브) - 2.5(우측 인셋)
    marginLeft: 17.5,
  },
});

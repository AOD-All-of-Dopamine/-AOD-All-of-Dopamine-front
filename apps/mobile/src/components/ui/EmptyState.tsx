import { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Palette, Radius } from '@/constants/theme';

/**
 * 빈 상태·에러 상태 공용 (웹 ui/EmptyState 이식).
 * - default: 중앙 정렬 아이콘 + 제목 + 설명 + 액션
 * - note: 점선 패널 한 줄 안내 (신작 섹션 0건 등 가벼운 빈 상태)
 */
interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  variant?: 'default' | 'note';
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  variant = 'default',
}: EmptyStateProps) {
  if (variant === 'note') {
    return (
      <View style={styles.note}>
        <ThemedText style={styles.noteText}>{title}</ThemedText>
      </View>
    );
  }
  return (
    <View style={styles.wrap}>
      {icon}
      <ThemedText style={styles.title}>{title}</ThemedText>
      {description && (
        <ThemedText style={styles.description}>{description}</ThemedText>
      )}
      {action && <View style={styles.action}>{action}</View>}
    </View>
  );
}

/** EmptyState 하단 주 액션 버튼 (웹 재시도·초기화 pill - ink 배경 반전) */
export function EmptyStateAction({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}>
      <ThemedText style={styles.buttonText}>{label}</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    gap: 6,
    paddingVertical: 48,
    paddingHorizontal: 32,
  },
  title: {
    marginTop: 6,
    fontSize: 16,
    fontWeight: 700,
    color: Palette.ink,
    textAlign: 'center',
  },
  description: {
    fontSize: 13.5,
    lineHeight: 20,
    fontWeight: 400,
    color: Palette.ink2,
    textAlign: 'center',
  },
  action: {
    marginTop: 10,
  },
  button: {
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: Radius.pill,
    backgroundColor: Palette.ink,
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonText: {
    fontSize: 14,
    lineHeight: 19,
    fontWeight: 600,
    color: Palette.surface,
  },
  note: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Palette.lineStrong,
    borderRadius: Radius.panel,
    paddingVertical: 26,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  noteText: {
    fontSize: 13.5,
    lineHeight: 19,
    fontWeight: 400,
    color: Palette.ink2,
    textAlign: 'center',
  },
});

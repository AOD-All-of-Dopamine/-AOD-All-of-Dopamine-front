import { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, X } from 'phosphor-react-native';

import { IconButton } from '@/components/ui/IconButton';
import { Palette } from '@/constants/theme';
import { fonts } from '@/theme/tokens';

/**
 * 상세 화면용 상단 바 - 목업 .d-nav (56px, 뒤로가기 + 제목 truncate).
 * additive 확장 (M-C): 우측 액션 영역(actions), 닫기(X) 변형(variant="close" -
 * 컬렉션 생성·편집 목업 5c 문법).
 */
interface DetailTopBarProps {
  title: string;
  onBack?: () => void;
  /** 우측 액션 (편집·저장 버튼 등) */
  actions?: ReactNode;
  /** close = 뒤로가기 대신 X 아이콘 (생성·편집 화면) */
  variant?: 'back' | 'close';
}

export function DetailTopBar({
  title,
  onBack,
  actions,
  variant = 'back',
}: DetailTopBarProps) {
  const router = useRouter();
  const isClose = variant === 'close';

  return (
    <View style={styles.bar}>
      <IconButton
        label={isClose ? '닫기' : '뒤로 가기'}
        onPress={onBack ?? (() => router.back())}>
        {isClose ? (
          <X size={21} color={Palette.ink} />
        ) : (
          <ArrowLeft size={21} color={Palette.ink} />
        )}
      </IconButton>
      <Text numberOfLines={1} style={styles.title}>
        {title}
      </Text>
      {actions && <View style={styles.actions}>{actions}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 8,
    backgroundColor: Palette.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Palette.line,
  },
  title: {
    flex: 1,
    marginLeft: 2,
    fontSize: 15,
    fontFamily: fonts.bold,
    color: Palette.ink,
  },
  actions: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
  },
});

import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'phosphor-react-native';

import { IconButton } from '@/components/ui/IconButton';
import { Palette } from '@/constants/theme';
import { fonts } from '@/theme/tokens';

/**
 * 상세 화면용 상단 바 - 목업 .d-nav (56px, 뒤로가기 + 제목 truncate).
 */
interface DetailTopBarProps {
  title: string;
  onBack?: () => void;
}

export function DetailTopBar({ title, onBack }: DetailTopBarProps) {
  const router = useRouter();

  return (
    <View style={styles.bar}>
      <IconButton label="뒤로 가기" onPress={onBack ?? (() => router.back())}>
        <ArrowLeft size={21} color={Palette.ink} />
      </IconButton>
      <Text numberOfLines={1} style={styles.title}>
        {title}
      </Text>
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
    flexShrink: 1,
    marginLeft: 2,
    fontSize: 15,
    fontFamily: fonts.bold,
    color: Palette.ink,
  },
});

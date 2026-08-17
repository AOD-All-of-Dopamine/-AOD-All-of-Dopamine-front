import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { MagnifyingGlass, UserCircle } from 'phosphor-react-native';

import { IconButton } from '@/components/ui/IconButton';
import { Palette } from '@/constants/theme';
import { fonts } from '@/theme/tokens';

/**
 * 공통 상단 바 (목록 화면용) - 목업 .m-nav (56px 아이콘 헤더).
 * 로고 + 우측 검색·프로필 아이콘(44px 터치 타깃).
 */
interface AppHeaderProps {
  onSearchPress?: () => void;
  onProfilePress?: () => void;
}

export function AppHeader({ onSearchPress, onProfilePress }: AppHeaderProps) {
  const router = useRouter();

  return (
    <View style={styles.bar}>
      <Text style={styles.logo}>
        AOD
        <Text style={styles.logoDot}>.</Text>
      </Text>
      <View style={styles.actions}>
        <IconButton
          label="검색"
          onPress={onSearchPress ?? (() => router.push('/search'))}>
          <MagnifyingGlass size={21} color={Palette.ink} />
        </IconButton>
        <IconButton
          label="프로필"
          onPress={onProfilePress ?? (() => router.push('/(tabs)/profile'))}>
          <UserCircle size={21} color={Palette.ink} />
        </IconButton>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingLeft: 16,
    paddingRight: 8,
    backgroundColor: Palette.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Palette.line,
  },
  logo: {
    fontSize: 20,
    fontFamily: fonts.bold,
    letterSpacing: -0.8,
    color: Palette.ink,
  },
  logoDot: {
    color: Palette.accent,
  },
  actions: {
    marginLeft: 'auto',
    flexDirection: 'row',
  },
});

import { StyleSheet, View } from 'react-native';
import { SvgXml } from 'react-native-svg';

import {
  NULL_GAME,
  NULL_MOVIE,
  NULL_SERIES,
  NULL_WEBNOVEL,
  NULL_WEBTOON,
} from '@/components/svg-assets';
import { colors } from '@/theme/tokens';

// 웹 thumbnailFallbackMap 미러 — 썸네일 없는 작품의 도메인별 폴백 아이콘
const FALLBACK_XML: Record<string, string> = {
  MOVIE: NULL_MOVIE,
  TV: NULL_SERIES,
  GAME: NULL_GAME,
  WEBTOON: NULL_WEBTOON,
  WEBNOVEL: NULL_WEBNOVEL,
};

interface FallbackThumbProps {
  domain?: string;
  iconSize?: number;
}

export function FallbackThumb({ domain, iconSize = 36 }: FallbackThumbProps) {
  const xml = FALLBACK_XML[domain ?? ''] ?? NULL_MOVIE;
  return (
    <View style={styles.container}>
      <SvgXml xml={xml} width={iconSize} height={iconSize} opacity={0.8} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

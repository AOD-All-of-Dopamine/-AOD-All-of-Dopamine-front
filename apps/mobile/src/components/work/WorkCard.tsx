import { Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';

import { ThemedText } from '@/components/themed-text';
import { DOMAIN_LABEL_MAP } from '@aod/shared/constants';
import { colors, spacing, radius } from '@/theme/tokens';

// 웹 HorizontalScroller 카드 규격 미러: 너비 160, 이미지 224, 랭크 뱃지, 보라 평점.
export interface WorkCardItem {
  id: string;
  title: string;
  thumbnail: string;
  score?: number;
  domain?: string;
  year?: string; // releaseDate 문자열 (웹 mapToWorkItem과 동일)
  rank?: number;
}

interface WorkCardProps {
  item: WorkCardItem;
  onPress?: (id: string) => void;
}

export function WorkCard({ item, onPress }: WorkCardProps) {
  return (
    <Pressable style={styles.card} onPress={() => onPress?.(item.id)}>
      {typeof item.rank === 'number' && (
        <View style={styles.rankBadge}>
          <ThemedText style={styles.rankText}>{item.rank}</ThemedText>
        </View>
      )}
      <Image
        source={item.thumbnail ? { uri: item.thumbnail } : undefined}
        style={styles.thumbnail}
        contentFit="cover"
        transition={150}
      />
      <ThemedText numberOfLines={1} style={styles.title}>
        {item.title}
      </ThemedText>
      {(item.domain || item.year) && (
        <ThemedText type="small" style={styles.meta}>
          {item.domain ? (DOMAIN_LABEL_MAP[item.domain] ?? item.domain) : ''}
          {item.year ? ` • ${new Date(item.year).getFullYear()}` : ''}
        </ThemedText>
      )}
      {typeof item.score === 'number' && (
        <ThemedText type="small" style={styles.score}>
          ★ {item.score.toFixed(1)}
        </ThemedText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 160,
  },
  rankBadge: {
    position: 'absolute',
    top: -spacing.md,
    left: -spacing.sm,
    zIndex: 1,
    width: 36,
    height: 36,
    backgroundColor: '#000000',
    borderRadius: radius.sm,
    borderWidth: 2,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: {
    color: colors.textPrimary,
    fontWeight: '700',
    fontSize: 18,
    lineHeight: 20,
  },
  thumbnail: {
    width: '100%',
    height: 224,
    borderRadius: radius.sm,
    marginBottom: spacing.sm,
    backgroundColor: colors.surface,
  },
  title: {
    fontSize: 14,
    fontWeight: '500',
  },
  meta: {
    color: colors.textFaint,
    marginTop: 2,
  },
  score: {
    color: colors.accent,
    fontWeight: '500',
    marginTop: 2,
  },
});

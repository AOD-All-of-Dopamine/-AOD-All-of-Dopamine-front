import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { WorkCard, type WorkCardItem } from './WorkCard';
import { colors, spacing } from '@/theme/tokens';

// 웹 HorizontalScroller 대응: 제목 헤더 + 가로 스크롤 카드 목록.
interface WorkCarouselProps {
  title: string;
  items: WorkCardItem[];
  loading?: boolean;
  onItemPress?: (id: string) => void;
  onViewAll?: () => void;
}

export function WorkCarousel({
  title,
  items,
  loading = false,
  onItemPress,
  onViewAll,
}: WorkCarouselProps) {
  return (
    <View style={styles.section}>
      {(title !== '' || onViewAll) && (
        <View style={styles.header}>
          <ThemedText style={styles.title}>{title}</ThemedText>
          {onViewAll && (
            <Pressable onPress={onViewAll}>
              <ThemedText type="small" style={styles.viewAll}>
                전체보기 ›
              </ThemedText>
            </Pressable>
          )}
        </View>
      )}

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : (
        <FlatList
          horizontal
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <WorkCard item={item} onPress={onItemPress} />}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: spacing.xxl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  viewAll: {
    color: colors.textMuted,
  },
  loading: {
    height: 224,
    alignItems: 'center',
    justifyContent: 'center',
  },
  separator: {
    width: spacing.md,
  },
  listContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md, // 랭크 뱃지(-top)가 잘리지 않도록
  },
});

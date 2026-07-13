import { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { Image } from 'expo-image';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useMyLikes } from '@aod/shared/hooks';
import { DOMAIN_LABEL_MAP } from '@aod/shared/constants';
import type { WorkSummary } from '@aod/shared/types';
import { colors, spacing, radius, fonts } from '@/theme/tokens';

// ── 웹 my-likes-page.tsx 미러 ──
export default function MyLikesScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const { data, isLoading } = useMyLikes(0, 1000);

  const filtered = (data?.content ?? []).filter((work: WorkSummary) =>
    work.title.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen
        options={{ headerShown: true, title: '내가 좋아요한 작품' }}
      />
      <View style={styles.searchRow}>
        <TextInput
          style={styles.input}
          placeholder="작품 검색"
          placeholderTextColor={colors.textFaint}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.center}>
          <ThemedText style={styles.emptyText}>
            아직 좋아요한 작품이 없습니다.
          </ThemedText>
          <Pressable
            style={styles.emptyButton}
            onPress={() => router.push('/explore')}>
            <ThemedText style={styles.emptyButtonText}>작품 둘러보기</ThemedText>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(work) => String(work.id)}
          numColumns={3}
          columnWrapperStyle={styles.gridRow}
          contentContainerStyle={styles.gridContent}
          renderItem={({ item: work }) => (
            <Pressable
              style={styles.cell}
              onPress={() =>
                router.push({
                  pathname: '/work/[id]',
                  params: { id: String(work.id) },
                })
              }>
              <View style={styles.thumbWrap}>
                <Image
                  source={work.thumbnail ? { uri: work.thumbnail } : undefined}
                  style={styles.thumb}
                  contentFit="cover"
                />
              </View>
              <ThemedText type="small" numberOfLines={1} style={styles.title}>
                {work.title}
              </ThemedText>
              <ThemedText type="small" style={styles.meta}>
                {DOMAIN_LABEL_MAP[work.domain] ?? work.domain}
                {work.releaseDate
                  ? ` • ${new Date(work.releaseDate).getFullYear()}`
                  : ''}
              </ThemedText>
            </Pressable>
          )}
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchRow: {
    padding: spacing.lg,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: 16,
    fontFamily: fonts.regular,
    color: colors.textPrimary,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
  },
  emptyText: {
    color: colors.textFaint,
  },
  emptyButton: {
    backgroundColor: colors.accent,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  emptyButtonText: {
    color: colors.textPrimary,
    fontWeight: '600',
  },
  gridRow: {
    gap: spacing.xl,
    paddingHorizontal: spacing.xl,
  },
  gridContent: {
    paddingVertical: spacing.lg,
    gap: spacing.lg,
  },
  cell: {
    flex: 1 / 3,
  },
  thumbWrap: {
    width: '100%',
    aspectRatio: 2 / 3,
    borderRadius: radius.sm,
    backgroundColor: '#333333',
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  thumb: {
    width: '100%',
    height: '100%',
  },
  title: {
    fontWeight: '600',
  },
  meta: {
    color: colors.textFaint,
    fontSize: 12,
    marginTop: 2,
  },
});

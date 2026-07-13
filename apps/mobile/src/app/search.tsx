import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { Stack, router } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { WorkCard } from '@/components/work/WorkCard';
import { useSearchWorks } from '@aod/shared/hooks';
import { DOMAIN_FILTERS } from '@aod/shared/constants';
import type { WorkSummary } from '@aod/shared/types';
import { colors, spacing, radius, fonts } from '@/theme/tokens';

export default function SearchScreen() {
  const [input, setInput] = useState('');
  const [keyword, setKeyword] = useState('');
  const [selectedDomain, setSelectedDomain] = useState<string>('ALL');
  const [page, setPage] = useState(0);
  const [items, setItems] = useState<WorkSummary[]>([]);

  const { data, isLoading, isFetching } = useSearchWorks(keyword, {
    page,
    size: 20,
    domain: selectedDomain === 'ALL' ? undefined : selectedDomain,
  });

  // 페이지 누적 (웹 숫자 페이지네이션의 모바일 대체 — "더 보기")
  useEffect(() => {
    if (!data) return;
    setItems((prev) =>
      data.page === 0 ? data.content : [...prev, ...data.content],
    );
  }, [data]);

  const submit = () => {
    setKeyword(input.trim());
    setPage(0);
  };

  const selectDomain = (id: string) => {
    setSelectedDomain(id);
    setPage(0);
  };

  const hasMore = data ? !data.last : false;

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen
        options={{ headerShown: true, title: '검색', presentation: 'modal' }}
      />

      {/* 검색 입력 */}
      <View style={styles.searchRow}>
        <TextInput
          style={styles.input}
          placeholder="작품 검색"
          placeholderTextColor={colors.textFaint}
          autoFocus
          returnKeyType="search"
          value={input}
          onChangeText={setInput}
          onSubmitEditing={submit}
        />
      </View>

      {/* 도메인 필터 (웹 DOMAIN_FILTERS 탭 미러) */}
      <View style={styles.filterRow}>
        {DOMAIN_FILTERS.map((filter) => {
          const active = selectedDomain === filter.id;
          return (
            <Pressable
              key={filter.id}
              style={[styles.filterTab, active && styles.filterTabActive]}
              onPress={() => selectDomain(filter.id)}>
              <ThemedText
                type="small"
                style={[styles.filterText, active && styles.filterTextActive]}>
                {filter.label}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>

      {/* 결과 */}
      {isLoading && items.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : keyword === '' ? (
        <View style={styles.center}>
          <ThemedText type="small" style={styles.muted}>
            검색어를 입력해주세요.
          </ThemedText>
        </View>
      ) : items.length === 0 ? (
        <View style={styles.center}>
          <ThemedText type="small" style={styles.muted}>
            검색 결과가 없습니다.
          </ThemedText>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => String(item.id)}
          numColumns={3}
          columnWrapperStyle={styles.gridRow}
          contentContainerStyle={styles.gridContent}
          renderItem={({ item }) => (
            <View style={styles.gridCell}>
              <WorkCard
                item={{
                  id: String(item.id),
                  title: item.title,
                  thumbnail: item.thumbnail ?? '',
                  score: item.score ?? 0,
                  domain: item.domain,
                  year: item.releaseDate,
                }}
                width={'100%'}
                imageHeight={140}
                onPress={(id) =>
                  router.push({ pathname: '/work/[id]', params: { id } })
                }
              />
            </View>
          )}
          ListFooterComponent={
            hasMore ? (
              <Pressable
                style={styles.moreButton}
                onPress={() => setPage((p) => p + 1)}
                disabled={isFetching}>
                {isFetching ? (
                  <ActivityIndicator color={colors.textPrimary} />
                ) : (
                  <ThemedText type="small" style={styles.moreText}>
                    더 보기
                  </ThemedText>
                )}
              </Pressable>
            ) : null
          }
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
  filterRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterTab: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  filterTabActive: {
    borderBottomWidth: 2,
    borderBottomColor: colors.textPrimary,
  },
  filterText: {
    color: colors.textMuted,
  },
  filterTextActive: {
    color: colors.textPrimary,
    fontWeight: '600',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  muted: {
    color: colors.textFaint,
  },
  gridRow: {
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  gridContent: {
    paddingVertical: spacing.lg,
    gap: spacing.lg,
  },
  gridCell: {
    flex: 1 / 3,
  },
  moreButton: {
    marginTop: spacing.lg,
    marginHorizontal: spacing.xl,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  moreText: {
    color: colors.textBright,
    fontWeight: '600',
  },
});

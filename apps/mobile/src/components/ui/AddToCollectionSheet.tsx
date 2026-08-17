import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CheckCircle, PlusCircle, Stack, WarningCircle } from 'phosphor-react-native';
import type { MyCollectionSummary } from '@aod/shared/api';
import {
  isAlreadyInCollectionError,
  useAddCollectionItem,
  useMyCollectionSummaries,
  useRemoveCollectionItem,
} from '@aod/shared/hooks';
import { collectionKeys } from '@aod/shared/queries';
import { DOMAIN_LABEL_MAP } from '@aod/shared/constants';

import { BottomSheet } from '@/components/ui/BottomSheet';
import { SkeletonBlock, SkeletonPulse } from '@/components/ui/Skeleton';
import { ToastPill, useToast } from '@/components/ui/Toast';
import { collectionTintColor } from '@/components/ui/collectionTints';
import { ThemedText } from '@/components/themed-text';
import { Palette, Radius } from '@/constants/theme';

/**
 * "컬렉션에 담기" 바텀시트 (collections-mockup 5d) - 웹 AddToCollectionSheet의
 * RN 이식판. 탐색 필터와 동일한 자작 BottomSheet 문법.
 * mine/summary(해당 작품 도메인의 내 컬렉션 + 포함 여부) 목록, 행 탭 = 담기/빼기
 * 토글, 하단 "새 컬렉션 만들기"(도메인 프리필). 담기/빼기는 isPending 직렬화
 * (busy 동안 전 행 비활성 - 연타 방지, 웹 관례).
 *
 * 목업·계약 대비 편차 (웹 동일):
 * - 행 썸네일은 포스터 2장 대신 틴트 스와치 + Stack 아이콘 - mine/summary 계약에
 *   커버 포스터가 없다.
 * - 빼기 토글은 상세 조회로 itemId를 해석 (useRemoveCollectionItem 주석 참고).
 */
export interface AddToCollectionSheetProps {
  contentId: number;
  /** 작품의 Domain enum명 - 새 컬렉션 프리필용 */
  domain: string;
  visible: boolean;
  onClose: () => void;
}

/** 행 썸네일 - 틴트 스와치 (계약에 포스터 없음) */
function TintThumb({ tint }: { tint: string }) {
  return (
    <View style={[styles.thumb, { backgroundColor: collectionTintColor(tint) }]}>
      <Stack size={18} weight="fill" color={Palette.surface} />
    </View>
  );
}

function RowSkeleton() {
  return (
    <View style={styles.row}>
      <SkeletonBlock width={44} height={44} radius={Radius.input} />
      <View style={styles.rowInfo}>
        <SkeletonBlock height={14} width="60%" />
        <SkeletonBlock height={11} width="40%" style={styles.rowSkeletonSub} />
      </View>
    </View>
  );
}

export function AddToCollectionSheet({
  contentId,
  domain,
  visible,
  onClose,
}: AddToCollectionSheetProps) {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { toast, showToast } = useToast();

  const { data, isLoading, isError, refetch } = useMyCollectionSummaries(
    contentId,
    visible,
  );
  const addItem = useAddCollectionItem(contentId);
  const removeItem = useRemoveCollectionItem(contentId);

  const busy = addItem.isPending || removeItem.isPending;
  const pendingId = addItem.isPending
    ? addItem.variables?.collectionId
    : removeItem.isPending
      ? removeItem.variables?.collectionId
      : undefined;

  const toggle = (summary: MyCollectionSummary) => {
    if (busy) return;
    if (summary.containsContent) {
      removeItem.mutate(
        { collectionId: summary.id },
        {
          onSuccess: () =>
            showToast({ message: `"${summary.title}"에서 뺐어요` }),
          onError: () =>
            showToast({ message: '빼기에 실패했어요. 다시 시도해 주세요' }),
        },
      );
      return;
    }
    addItem.mutate(
      { collectionId: summary.id },
      {
        onSuccess: () =>
          showToast({
            message: `"${summary.title}"에 담았어요`,
            actionLabel: '보러 가기',
            onAction: () => {
              onClose();
              router.push({
                pathname: '/collection/[id]',
                params: { id: String(summary.id) },
              });
            },
          }),
        onError: (error) => {
          if (isAlreadyInCollectionError(error)) {
            // 서버 기준 이미 담김 (다른 기기 등) - 포함 표시를 재조회로 동기화
            queryClient.invalidateQueries({
              queryKey: collectionKeys.mineSummary(contentId),
            });
            showToast({ message: '이미 담겨 있는 작품이에요' });
          } else {
            showToast({ message: '담기에 실패했어요. 다시 시도해 주세요' });
          }
        },
      },
    );
  };

  const goCreate = () => {
    onClose();
    router.push({
      pathname: '/collection/new',
      params: { domain },
    });
  };

  const domainLabel = DOMAIN_LABEL_MAP[domain] ?? domain;

  return (
    <BottomSheet visible={visible} onClose={onClose} label="컬렉션에 담기">
      <View style={styles.head}>
        <ThemedText style={styles.headTitle}>컬렉션에 담기</ThemedText>
      </View>

      <ScrollView
        style={styles.listScroll}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <SkeletonPulse>
            <RowSkeleton />
            <RowSkeleton />
            <RowSkeleton />
          </SkeletonPulse>
        ) : isError ? (
          <View style={styles.stateWrap}>
            <WarningCircle size={22} color={Palette.ink3} />
            <ThemedText style={styles.stateText}>
              내 컬렉션을 불러오지 못했어요
            </ThemedText>
            <Pressable
              accessibilityRole="button"
              onPress={() => refetch()}
              style={({ pressed }) => [styles.retry, pressed && styles.pressed]}>
              <ThemedText style={styles.retryText}>다시 시도</ThemedText>
            </Pressable>
          </View>
        ) : (data?.length ?? 0) === 0 ? (
          <ThemedText style={styles.emptyText}>
            아직 {domainLabel} 컬렉션이 없어요.{'\n'}첫 컬렉션을 만들어
            담아보세요.
          </ThemedText>
        ) : (
          data!.map((summary) => (
            <Pressable
              key={summary.id}
              accessibilityRole="button"
              accessibilityState={{
                selected: summary.containsContent,
                disabled: busy,
              }}
              disabled={busy}
              onPress={() => toggle(summary)}
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
              <TintThumb tint={summary.tint} />
              <View style={styles.rowInfo}>
                <ThemedText numberOfLines={1} style={styles.rowTitle}>
                  {summary.title}
                </ThemedText>
                <ThemedText style={styles.rowMeta}>
                  {summary.itemCount}작품 ·{' '}
                  {summary.visibility === 'PRIVATE' ? '나만 보기' : '공개'}
                </ThemedText>
              </View>
              {pendingId === summary.id ? (
                <ActivityIndicator size="small" color={Palette.ink3} />
              ) : (
                summary.containsContent && (
                  <CheckCircle
                    size={18}
                    weight="fill"
                    color={Palette.accentInk}
                  />
                )
              )}
            </Pressable>
          ))
        )}
      </ScrollView>

      <Pressable
        accessibilityRole="button"
        onPress={goCreate}
        style={({ pressed }) => [
          styles.newRow,
          { paddingBottom: 14 + insets.bottom },
          pressed && styles.pressed,
        ]}>
        <PlusCircle size={18} color={Palette.accentInk} />
        <ThemedText style={styles.newRowText}>새 컬렉션 만들기</ThemedText>
      </Pressable>

      {toast && <ToastPill toast={toast} style={styles.toast} />}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  head: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Palette.line,
  },
  headTitle: {
    fontSize: 16,
    lineHeight: 21,
    fontWeight: 800,
    color: Palette.ink,
  },
  listScroll: {
    flexGrow: 0,
    flexShrink: 1,
  },
  list: {
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  pressed: {
    opacity: 0.8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingHorizontal: 10,
    paddingVertical: 11,
    borderRadius: Radius.input,
  },
  thumb: {
    width: 44,
    height: 44,
    borderRadius: Radius.input,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowInfo: {
    flex: 1,
    minWidth: 0,
  },
  rowTitle: {
    fontSize: 13.5,
    lineHeight: 18,
    fontWeight: 700,
    color: Palette.ink,
  },
  rowMeta: {
    marginTop: 1,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: 400,
    color: Palette.ink3,
  },
  rowSkeletonSub: {
    marginTop: 6,
  },
  stateWrap: {
    alignItems: 'center',
    gap: 6,
    paddingVertical: 20,
  },
  stateText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: 400,
    color: Palette.ink2,
  },
  retry: {
    marginTop: 4,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Palette.lineStrong,
    backgroundColor: Palette.surface,
  },
  retryText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: 600,
    color: Palette.ink,
  },
  emptyText: {
    paddingVertical: 20,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: 400,
    color: Palette.ink2,
    textAlign: 'center',
  },
  newRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: Palette.line,
  },
  newRowText: {
    fontSize: 13.5,
    lineHeight: 18,
    fontWeight: 700,
    color: Palette.accentInk,
  },
  toast: {
    bottom: 78,
  },
});

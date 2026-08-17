import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CaretDown,
  CaretUp,
  GlobeHemisphereEast,
  LockSimple,
  PlusCircle,
  SignIn,
  Trash,
  TrendUp,
  WarningCircle,
  X,
} from 'phosphor-react-native';

import { CollectionCollage } from '@/components/ui/CollectionCollage';
import { DetailTopBar } from '@/components/ui/DetailTopBar';
import { EmptyState, EmptyStateAction } from '@/components/ui/EmptyState';
import { SkeletonBlock, SkeletonPulse } from '@/components/ui/Skeleton';
import { TintPicker } from '@/components/ui/TintPicker';
import { VisibilityOption } from '@/components/ui/VisibilityOption';
import { domainFallbackIcon } from '@/components/ui/WorkCard';
import { ThemedText } from '@/components/themed-text';
import { useAuth } from '@/auth/AuthContext';
import {
  useApis,
  useCollectionDetail,
  useDeleteCollection,
} from '@aod/shared/hooks';
import { collectionKeys } from '@aod/shared/queries';
import type {
  CollectionDetail,
  CollectionTint,
  CollectionUpdateBody,
  CollectionVisibility,
} from '@aod/shared/api';
import { Palette, Radius } from '@/constants/theme';
import { fonts } from '@/theme/tokens';

/**
 * 컬렉션 편집 (collections-mockup 5c) - 웹 collection-edit-page의 모바일 이식.
 * X+제목+저장 상단 바 / 커버 미리보기(틴트 즉시 반영) / 틴트·이름·설명·공개 /
 * 아이템 리스트(위/아래 정렬 버튼 + 코멘트 인라인 + 제거) / 삭제.
 *
 * 편집은 드래프트 방식 (웹 규율 동일) - 화면 조작은 로컬 상태만 바꾸고, 저장 시
 * 제거(DELETE, 404 멱등)·순서(PUT order, 바뀐 경우만)·코멘트(PATCH, 바뀐 것만)·
 * 메타(PATCH, 바뀐 필드만)를 순차 일괄 실행한다. 취소는 전부 복원.
 * 실패 2분기: 5xx/네트워크 = 드래프트 유지 + 재시도(전 연산 멱등) /
 * 4xx(다른 기기의 변경으로 PUT order 집합 불일치 400 등) = "최신 상태로
 * 새로고침"(refetch + epoch 재마운트로 드래프트 재구성). 어느 쪽이든 부분
 * 성공으로 캐시가 어긋나지 않게 onError에서 상세를 무효화한다.
 * 저장 성공 시 상세 캐시는 드래프트로 직접 보정 - invalidate 재조회는 조회수를
 * +1 시키므로 피한다 (shared useCollections 조회수 회피 설계와 동일).
 *
 * 목업 대비 편차:
 * - 정렬은 위/아래 버튼만 (플랜 필수 지정) - RN 코어에는 HTML5 DnD가 없어
 *   드래그 핸들 생략 (제스처 라이브러리 미도입 결정과 일관).
 * - 컬렉션 삭제 버튼을 리스트 하단에 배치 (웹은 좌측 패널 하단 - 목업에 없던
 *   플랜 범위 진입점).
 * - "이번 주 N개 추가" 성장 메타 생략 - 주간 집계 데이터가 없다 (웹 동일).
 * - 작품 추가 행은 탐색 탭으로 연결 - 담기 진입점이 작품 상세에 있다 (웹 동일).
 */

const TITLE_MAX = 60;
const DESC_MAX = 300;
const COMMENT_MAX = 200;

interface DraftItem {
  itemId: number;
  contentId: number;
  title: string;
  posterUrl: string | null;
  domain: string;
  /** 빈 문자열 = 코멘트 없음 (저장 시 trim - 빈 값은 코멘트 삭제) */
  comment: string;
}

/** 편집 리스트의 아이템 행 (목업 .edit-item + 위/아래 이동 버튼) */
function EditItemRow({
  item,
  index,
  total,
  onMove,
  onCommentChange,
  onRemove,
}: {
  item: DraftItem;
  index: number;
  total: number;
  onMove: (index: number, delta: -1 | 1) => void;
  onCommentChange: (itemId: number, comment: string) => void;
  onRemove: (itemId: number) => void;
}) {
  const FallbackIcon = domainFallbackIcon(item.domain);
  return (
    <View style={styles.editItem}>
      <View style={styles.moveCol}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${item.title} 위로 이동`}
          disabled={index === 0}
          onPress={() => onMove(index, -1)}
          hitSlop={4}
          style={({ pressed }) => [
            styles.moveBtn,
            index === 0 && styles.moveBtnDisabled,
            pressed && styles.pressedDim,
          ]}>
          <CaretUp size={15} color={Palette.ink2} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${item.title} 아래로 이동`}
          disabled={index === total - 1}
          onPress={() => onMove(index, 1)}
          hitSlop={4}
          style={({ pressed }) => [
            styles.moveBtn,
            index === total - 1 && styles.moveBtnDisabled,
            pressed && styles.pressedDim,
          ]}>
          <CaretDown size={15} color={Palette.ink2} />
        </Pressable>
      </View>
      <View style={styles.editThumb}>
        {item.posterUrl ? (
          <Image
            source={{ uri: item.posterUrl }}
            style={styles.fill}
            contentFit="cover"
            transition={150}
          />
        ) : (
          <View style={styles.editThumbFallback}>
            <FallbackIcon size={18} color={Palette.ink3} />
          </View>
        )}
      </View>
      <View style={styles.editMain}>
        <ThemedText numberOfLines={1} style={styles.editTitle}>
          {item.title}
        </ThemedText>
        <TextInput
          value={item.comment}
          maxLength={COMMENT_MAX}
          onChangeText={(next) => onCommentChange(item.itemId, next)}
          placeholder="이 작품을 담은 이유를 한 줄로 남겨보세요"
          placeholderTextColor={Palette.ink3}
          accessibilityLabel={`${item.title} 코멘트`}
          style={styles.noteInput}
        />
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${item.title} 컬렉션에서 빼기`}
        onPress={() => onRemove(item.itemId)}
        hitSlop={4}
        style={({ pressed }) => [styles.removeBtn, pressed && styles.pressedDim]}>
        <X size={16} color={Palette.ink3} />
      </Pressable>
    </View>
  );
}

/**
 * 드래프트 편집기 - collection은 마운트 시점 스냅샷.
 * onRefresh: 상세 refetch 후 부모가 key(epoch)를 바꿔 재마운트한다
 * (드래프트 폐기 + 최신 서버 상태로 재구성 - 4xx 충돌 복구 경로, 웹 동일)
 */
function CollectionEditor({
  collection,
  onRefresh,
}: {
  collection: CollectionDetail;
  onRefresh: () => Promise<unknown>;
}) {
  const queryClient = useQueryClient();
  const { collectionApi } = useApis();

  const [title, setTitle] = useState(collection.title);
  const [description, setDescription] = useState(collection.description ?? '');
  const [tint, setTint] = useState<CollectionTint>(collection.tint);
  const [visibility, setVisibility] = useState<CollectionVisibility>(
    collection.visibility,
  );
  const [items, setItems] = useState<DraftItem[]>(() =>
    collection.items.map((i) => ({
      itemId: i.itemId,
      contentId: i.contentId,
      title: i.title,
      posterUrl: i.posterUrl,
      domain: i.domain,
      comment: i.comment ?? '',
    })),
  );
  const [removedIds, setRemovedIds] = useState<number[]>([]);
  const [showTitleError, setShowTitleError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // 재시도 시 diff 재계산의 기준점 - 저장 성공 전까지 고정 (웹 동일)
  const baselineRef = useRef({
    title: collection.title,
    description: collection.description ?? '',
    tint: collection.tint,
    visibility: collection.visibility,
    order: collection.items.map((i) => i.itemId),
    // 트림해 저장 - 서버 값의 공백 차이만으로 무편집 코멘트가 PATCH로 새지 않게
    comments: new Map(
      collection.items.map((i) => [i.itemId, (i.comment ?? '').trim()]),
    ),
  });
  const baseline = baselineRef.current;

  // ===== diff =====
  const currentOrder = items.map((i) => i.itemId);
  const baselineRemaining = baseline.order.filter(
    (itemId) => !removedIds.includes(itemId),
  );
  const orderChanged = currentOrder.join(',') !== baselineRemaining.join(',');
  const metaDiff: CollectionUpdateBody = {};
  if (title !== baseline.title) metaDiff.title = title.trim();
  if (description !== baseline.description)
    metaDiff.description = description.trim();
  if (tint !== baseline.tint) metaDiff.tint = tint;
  if (visibility !== baseline.visibility) metaDiff.visibility = visibility;
  const commentChanges = items.filter(
    (i) => i.comment.trim() !== (baseline.comments.get(i.itemId) ?? ''),
  );
  const dirty =
    orderChanged ||
    removedIds.length > 0 ||
    Object.keys(metaDiff).length > 0 ||
    commentChanges.length > 0;
  const valid = title.trim().length > 0;

  const goDetail = () =>
    router.replace({
      pathname: '/collection/[id]',
      params: { id: String(collection.id) },
    });

  // ===== 저장 - 순차 일괄, 전 연산 멱등 (재시도 = 전체 재실행, 웹 동일) =====
  const saveMutation = useMutation({
    mutationFn: async () => {
      for (const removedId of removedIds) {
        try {
          await collectionApi.deleteItem(collection.id, removedId);
        } catch (error) {
          // 404 = 이미 삭제됨 (직전 시도에서 성공) - 멱등 통과
          if (!(axios.isAxiosError(error) && error.response?.status === 404)) {
            throw error;
          }
        }
      }
      if (orderChanged) {
        await collectionApi.reorderItems(collection.id, currentOrder);
      }
      for (const item of commentChanges) {
        await collectionApi.updateItem(collection.id, item.itemId, {
          comment: item.comment.trim(),
        });
      }
      if (Object.keys(metaDiff).length > 0) {
        await collectionApi.updateCollection(collection.id, metaDiff);
      }
    },
    onSuccess: () => {
      // 상세 캐시를 드래프트로 직접 보정 - invalidate 재조회는 조회수를 +1
      // 시키므로 피한다 (좋아요 훅 전례, 웹 동일)
      queryClient.setQueryData<CollectionDetail>(
        collectionKeys.detail(collection.id),
        (old) => {
          if (!old) return old;
          const byId = new Map(old.items.map((i) => [i.itemId, i]));
          const newItems = items.flatMap((draft, index) => {
            const orig = byId.get(draft.itemId);
            return orig
              ? [
                  {
                    ...orig,
                    comment: draft.comment.trim() || null,
                    position: index,
                  },
                ]
              : [];
          });
          return {
            ...old,
            title: title.trim(),
            description: description.trim() || null,
            tint,
            visibility,
            itemCount: newItems.length,
            coverPosters: newItems
              .map((i) => i.posterUrl)
              .filter((p): p is string => !!p)
              .slice(0, 3),
            items: newItems,
            updatedAt: new Date().toISOString(),
          };
        },
      );
      queryClient.invalidateQueries({ queryKey: collectionKeys.root() });
      goDetail();
    },
    onError: () => {
      // 부분 성공(예: 제거 DELETE만 반영) 시 상세 캐시에 유령이 남지 않게
      // 무효화 - 재조회의 조회수 +1 한 번은 정합성 비용으로 수용 (웹 동일)
      queryClient.invalidateQueries({
        queryKey: collectionKeys.detail(collection.id),
      });
    },
  });

  // 4xx = 재시도 무의미 (서버 상태와 드래프트가 어긋남) / 5xx·네트워크만 재시도
  const saveStatus = axios.isAxiosError(saveMutation.error)
    ? saveMutation.error.response?.status
    : undefined;
  const saveConflict =
    saveStatus !== undefined && saveStatus >= 400 && saveStatus < 500;

  const handleRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  };

  const deleteMutation = useDeleteCollection();

  const handleSave = () => {
    if (saveMutation.isPending) return;
    if (!valid) {
      setShowTitleError(true);
      return;
    }
    if (!dirty) {
      goDetail();
      return;
    }
    saveMutation.mutate();
  };

  const handleClose = () => {
    if (dirty) {
      Alert.alert(
        '변경사항을 저장하지 않고 나갈까요?',
        '지금 나가면 편집한 내용이 사라져요.',
        [
          { text: '계속 편집', style: 'cancel' },
          { text: '나가기', style: 'destructive', onPress: goDetail },
        ],
      );
      return;
    }
    goDetail();
  };

  const handleDelete = () => {
    if (deleteMutation.isPending) return;
    Alert.alert(
      '컬렉션을 삭제할까요?',
      '담긴 작품 목록과 코멘트, 받은 좋아요가 함께 삭제되고 되돌릴 수 없어요.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: () =>
            deleteMutation.mutate(collection.id, {
              // 삭제 후 발견 탭으로 (replace - 뒤로가기가 죽은 상세로 가지 않게)
              onSuccess: () => router.replace('/(tabs)/collections'),
            }),
        },
      ],
    );
  };

  // ===== 아이템 조작 =====
  const move = (index: number, delta: -1 | 1) => {
    setItems((prev) => {
      const target = index + delta;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const changeComment = (itemId: number, comment: string) => {
    setItems((prev) =>
      prev.map((i) => (i.itemId === itemId ? { ...i, comment } : i)),
    );
  };

  const removeItem = (itemId: number) => {
    setItems((prev) => prev.filter((i) => i.itemId !== itemId));
    setRemovedIds((prev) => [...prev, itemId]);
  };

  const coverPreviewPosters = items
    .map((i) => i.posterUrl)
    .filter((p): p is string => !!p)
    .slice(0, 3);

  return (
    <View style={styles.screen}>
      <SafeAreaView edges={['top']} style={styles.top}>
        <DetailTopBar
          title="컬렉션 편집"
          variant="close"
          onBack={handleClose}
          actions={
            <Pressable
              accessibilityRole="button"
              disabled={saveMutation.isPending}
              onPress={handleSave}
              style={({ pressed }) => [
                styles.saveBtn,
                pressed && styles.pressedDim,
                saveMutation.isPending && styles.saveBtnDisabled,
              ]}>
              {saveMutation.isPending ? (
                <ActivityIndicator size="small" color={Palette.surface} />
              ) : (
                <ThemedText style={styles.saveBtnText}>저장</ThemedText>
              )}
            </Pressable>
          }
        />
      </SafeAreaView>

      <ScrollView
        style={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}>
        {saveMutation.isError && (
          <View accessibilityRole="alert" style={styles.errorBanner}>
            <View style={styles.errorBannerRow}>
              <WarningCircle size={17} color={Palette.danger} />
              <ThemedText style={styles.errorBannerText}>
                {saveConflict
                  ? '다른 곳에서 컬렉션이 바뀌었어요. 최신 상태로 새로고침한 뒤 다시 편집해 주세요.'
                  : '저장하지 못한 변경이 있어요. 네트워크 확인 후 다시 시도해 주세요.'}
              </ThemedText>
            </View>
            <Pressable
              accessibilityRole="button"
              disabled={refreshing}
              onPress={saveConflict ? handleRefresh : () => saveMutation.mutate()}
              style={({ pressed }) => [
                styles.errorBannerBtn,
                pressed && styles.pressedDim,
              ]}>
              {refreshing ? (
                <ActivityIndicator size="small" color={Palette.danger} />
              ) : (
                <ThemedText style={styles.errorBannerBtnText}>
                  {saveConflict ? '최신 상태로 새로고침' : '다시 시도'}
                </ThemedText>
              )}
            </Pressable>
          </View>
        )}

        {/* 커버 미리보기 + 틴트 (목업 .m-edit-cover/.m-tint-row) - 틴트 즉시 반영 */}
        <CollectionCollage
          posters={coverPreviewPosters}
          tint={tint}
          domain={collection.domain}
          style={styles.cover}
        />
        <TintPicker value={tint} onChange={setTint} style={styles.tintRow} />

        {/* 이름 */}
        <View style={styles.field}>
          <ThemedText style={styles.fieldLabel}>이름</ThemedText>
          <TextInput
            value={title}
            maxLength={TITLE_MAX}
            onChangeText={(next) => {
              setTitle(next);
              if (next.trim()) setShowTitleError(false);
            }}
            placeholderTextColor={Palette.ink3}
            style={styles.input}
          />
          <View style={styles.fieldFoot}>
            {showTitleError ? (
              <ThemedText style={styles.fieldError}>
                이름을 입력해 주세요.
              </ThemedText>
            ) : (
              <View />
            )}
            <ThemedText style={styles.fieldCount}>
              {title.length}/{TITLE_MAX}
            </ThemedText>
          </View>
        </View>

        {/* 설명 */}
        <View style={styles.field}>
          <ThemedText style={styles.fieldLabel}>설명</ThemedText>
          <TextInput
            value={description}
            maxLength={DESC_MAX}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
            placeholder="이 컬렉션에 담을 이야기를 소개해 주세요"
            placeholderTextColor={Palette.ink3}
            style={[styles.input, styles.inputMultiline]}
          />
          <View style={styles.fieldFoot}>
            <ThemedText style={styles.fieldHint}>
              컬렉션 카드와 상세 상단에 보여요.
            </ThemedText>
            <ThemedText style={styles.fieldCount}>
              {description.length}/{DESC_MAX}
            </ThemedText>
          </View>
        </View>

        {/* 공개 설정 */}
        <View style={styles.field}>
          <ThemedText style={styles.fieldLabel}>공개 설정</ThemedText>
          <View
            accessibilityRole="radiogroup"
            accessibilityLabel="공개 설정"
            style={styles.visRow}>
            <VisibilityOption
              active={visibility === 'PUBLIC'}
              onPress={() => setVisibility('PUBLIC')}
              icon={
                <GlobeHemisphereEast
                  size={16}
                  color={
                    visibility === 'PUBLIC' ? Palette.accentInk : Palette.ink2
                  }
                />
              }
              label="공개"
            />
            <VisibilityOption
              active={visibility === 'PRIVATE'}
              onPress={() => setVisibility('PRIVATE')}
              icon={
                <LockSimple
                  size={16}
                  color={
                    visibility === 'PRIVATE' ? Palette.accentInk : Palette.ink2
                  }
                />
              }
              label="나만 보기"
            />
          </View>
        </View>

        {/* 아이템 리스트 (목업 .edit-item) */}
        <View style={styles.itemSection}>
          {items.length > 0 ? (
            <View style={styles.itemList}>
              {items.map((item, index) => (
                <EditItemRow
                  key={item.itemId}
                  item={item}
                  index={index}
                  total={items.length}
                  onMove={move}
                  onCommentChange={changeComment}
                  onRemove={removeItem}
                />
              ))}
            </View>
          ) : (
            <EmptyState
              variant="note"
              title="아직 담긴 작품이 없어요. 탐색에서 작품을 열고 담기 버튼으로 채워보세요."
            />
          )}

          {/* 작품 추가 (목업 .add-row) - 담기 진입점은 작품 상세 */}
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/(tabs)/explore')}
            style={({ pressed }) => [styles.addRow, pressed && styles.pressedDim]}>
            <PlusCircle size={18} color={Palette.accentInk} />
            <ThemedText style={styles.addRowText}>
              작품 추가 - 탐색에서 작품을 열고 담기로 채울 수 있어요
            </ThemedText>
          </Pressable>

          {/* 성장 메타 (목업 .grow-note) */}
          <View style={styles.growNote}>
            <TrendUp size={15} color={Palette.ink3} />
            <ThemedText style={styles.growNoteText}>
              {items.length}작품 · 좋아요 {collection.likeCount.toLocaleString()}
              개 받는 중
            </ThemedText>
          </View>

          {/* 컬렉션 삭제 */}
          <Pressable
            accessibilityRole="button"
            disabled={deleteMutation.isPending}
            onPress={handleDelete}
            style={({ pressed }) => [
              styles.deleteBtn,
              pressed && styles.pressedDim,
              deleteMutation.isPending && styles.saveBtnDisabled,
            ]}>
            {deleteMutation.isPending ? (
              <ActivityIndicator size="small" color={Palette.danger} />
            ) : (
              <Trash size={16} color={Palette.danger} />
            )}
            <ThemedText style={styles.deleteBtnText}>컬렉션 삭제</ThemedText>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

function EditSkeleton() {
  return (
    <SkeletonPulse style={styles.skeleton}>
      <SkeletonBlock aspectRatio={16 / 9} radius={Radius.panel} />
      <SkeletonBlock
        height={30}
        width={220}
        radius={Radius.pill}
        style={styles.skeletonTint}
      />
      <SkeletonBlock height={44} style={styles.skeletonField} />
      <SkeletonBlock height={84} style={styles.skeletonField} />
      {Array.from({ length: 3 }, (_, i) => (
        <SkeletonBlock
          key={i}
          height={92}
          radius={Radius.panel}
          style={styles.skeletonField}
        />
      ))}
    </SkeletonPulse>
  );
}

export default function CollectionEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const collectionId = id ? Number(id) : 0;
  const { state: authState } = useAuth();
  const isAuthenticated = authState.status === 'authenticated';
  // 4xx 충돌 복구용 - 새로고침 완료 시 +1 해 편집기를 재마운트(드래프트 재구성)
  const [editorEpoch, setEditorEpoch] = useState(0);

  // 비로그인은 조회 자체를 막는다 (게이트 화면 + 불필요한 조회수 증가 방지)
  const { data, isLoading, isError, error, refetch } = useCollectionDetail(
    collectionId,
    { enabled: isAuthenticated && !!collectionId },
  );

  const handleRefresh = async () => {
    // refetch는 staleTime을 우회해 항상 서버를 친다 (조회수 +1 비용 수용) -
    // 완료 후 epoch를 올려 최신 데이터로 편집기를 새로 구성 (웹 동일)
    await refetch();
    setEditorEpoch((epoch) => epoch + 1);
  };

  const status = axios.isAxiosError(error) ? error.response?.status : undefined;
  const notFound = !collectionId || Number.isNaN(collectionId) || status === 404;
  // 403 = 서버가 열람 자체를 막은 타인 비공개 컬렉션 (상세로 보내도 같은 403)
  const isForbidden = status === 403;
  const notOwner = isForbidden || (data ? !data.owner : false);

  if (!isAuthenticated || isLoading || notFound || notOwner || isError || !data) {
    return (
      <View style={styles.screen}>
        <SafeAreaView edges={['top']} style={styles.top}>
          <DetailTopBar
            title="컬렉션 편집"
            variant="close"
            onBack={() => router.replace('/(tabs)/collections')}
          />
        </SafeAreaView>
        {!isAuthenticated ? (
          <EmptyState
            icon={<SignIn size={44} color={Palette.ink3} />}
            title="로그인하면 컬렉션을 편집할 수 있어요"
            description="내가 만든 컬렉션만 편집할 수 있어요."
            action={
              <EmptyStateAction
                label="로그인"
                onPress={() => router.push('/login')}
              />
            }
          />
        ) : isLoading ? (
          <EditSkeleton />
        ) : notFound ? (
          <EmptyState
            title="컬렉션을 찾을 수 없어요"
            description="주소가 잘못되었거나 삭제된 컬렉션일 수 있어요."
            action={
              <EmptyStateAction
                label="컬렉션 둘러보기"
                onPress={() => router.replace('/(tabs)/collections')}
              />
            }
          />
        ) : notOwner ? (
          <EmptyState
            icon={<LockSimple size={44} color={Palette.ink3} />}
            title="내 컬렉션만 편집할 수 있어요"
            description="이 컬렉션은 다른 큐레이터의 것이에요."
            action={
              // 403(타인 비공개)은 상세도 같은 403이라 발견 탭으로 보낸다
              isForbidden ? (
                <EmptyStateAction
                  label="컬렉션 둘러보기"
                  onPress={() => router.replace('/(tabs)/collections')}
                />
              ) : (
                <EmptyStateAction
                  label="컬렉션 보기"
                  onPress={() =>
                    router.replace({
                      pathname: '/collection/[id]',
                      params: { id: String(collectionId) },
                    })
                  }
                />
              )
            }
          />
        ) : (
          <EmptyState
            icon={<WarningCircle size={44} color={Palette.ink3} />}
            title="컬렉션을 불러오지 못했어요"
            description="네트워크 상태를 확인한 뒤 다시 시도해 주세요."
            action={
              <EmptyStateAction label="다시 시도" onPress={() => refetch()} />
            }
          />
        )}
      </View>
    );
  }

  return (
    <CollectionEditor
      key={editorEpoch}
      collection={data}
      onRefresh={handleRefresh}
    />
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Palette.canvas,
  },
  top: {
    backgroundColor: Palette.surface,
  },
  pressedDim: {
    opacity: 0.8,
  },
  fill: {
    width: '100%',
    height: '100%',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  saveBtn: {
    minWidth: 60,
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: Radius.pill,
    backgroundColor: Palette.accentInk,
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    fontSize: 13.5,
    lineHeight: 18,
    fontWeight: 700,
    color: Palette.surface,
  },
  errorBanner: {
    marginTop: 14,
    marginHorizontal: 16,
    padding: 12,
    gap: 10,
    borderRadius: Radius.panel,
    borderWidth: 1,
    borderColor: Palette.danger,
    backgroundColor: Palette.surface,
  },
  errorBannerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  errorBannerText: {
    flex: 1,
    fontSize: 13.5,
    lineHeight: 19,
    fontWeight: 400,
    color: Palette.danger,
  },
  errorBannerBtn: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Palette.danger,
  },
  errorBannerBtnText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: 700,
    color: Palette.danger,
  },
  cover: {
    marginTop: 14,
    marginHorizontal: 16,
    aspectRatio: 16 / 9,
    borderRadius: Radius.panel,
    // 목업 shadow-card 근사
    shadowColor: Palette.shadowInk,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  tintRow: {
    justifyContent: 'center',
    paddingTop: 12,
  },
  field: {
    paddingTop: 14,
    paddingHorizontal: 16,
  },
  fieldLabel: {
    marginBottom: 6,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: 700,
    color: Palette.ink,
  },
  input: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: Radius.input,
    borderWidth: 1,
    borderColor: Palette.lineStrong,
    backgroundColor: Palette.surface,
    fontSize: 14,
    fontFamily: fonts.regular,
    color: Palette.ink,
  },
  inputMultiline: {
    minHeight: 84,
    textAlignVertical: 'top',
  },
  fieldFoot: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 4,
  },
  fieldError: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: 600,
    color: Palette.danger,
  },
  fieldHint: {
    flexShrink: 1,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: 400,
    color: Palette.ink3,
  },
  fieldCount: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: 400,
    color: Palette.ink3,
    fontVariant: ['tabular-nums'],
  },
  visRow: {
    flexDirection: 'row',
    gap: 8,
  },
  itemSection: {
    paddingTop: 18,
    paddingHorizontal: 16,
  },
  itemList: {
    gap: 8,
  },
  editItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.line,
    borderRadius: Radius.panel,
  },
  moveCol: {
    gap: 2,
  },
  moveBtn: {
    width: 28,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.input,
  },
  moveBtnDisabled: {
    opacity: 0.3,
  },
  editThumb: {
    width: 52,
    aspectRatio: 3 / 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Palette.line,
    overflow: 'hidden',
    backgroundColor: Palette.canvas,
  },
  editThumbFallback: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.8,
  },
  editMain: {
    flex: 1,
    minWidth: 0,
  },
  editTitle: {
    fontSize: 13.5,
    lineHeight: 18,
    fontWeight: 700,
    color: Palette.ink,
  },
  noteInput: {
    marginTop: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: Radius.input,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Palette.lineStrong,
    backgroundColor: Palette.canvas,
    fontSize: 12.5,
    fontFamily: fonts.regular,
    color: Palette.ink2,
  },
  removeBtn: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.pill,
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: Radius.panel,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Palette.lineStrong,
    backgroundColor: Palette.surface,
  },
  addRowText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: 400,
    color: Palette.ink2,
  },
  growNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 14,
  },
  growNoteText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: 400,
    color: Palette.ink3,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 18,
    paddingVertical: 12,
    borderRadius: Radius.input,
    borderWidth: 1,
    borderColor: Palette.line,
    backgroundColor: Palette.surface,
  },
  deleteBtnText: {
    fontSize: 14,
    lineHeight: 19,
    fontWeight: 600,
    color: Palette.danger,
  },
  /* 스켈레톤 */
  skeleton: {
    paddingTop: 14,
    paddingHorizontal: 16,
  },
  skeletonTint: {
    alignSelf: 'center',
    marginTop: 12,
  },
  skeletonField: {
    marginTop: 14,
  },
});

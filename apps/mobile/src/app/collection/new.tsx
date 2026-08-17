import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';
import { GlobeHemisphereEast, LockSimple, SignIn } from 'phosphor-react-native';

import { CollectionCollage } from '@/components/ui/CollectionCollage';
import { DetailTopBar } from '@/components/ui/DetailTopBar';
import { EmptyState, EmptyStateAction } from '@/components/ui/EmptyState';
import { TintPicker } from '@/components/ui/TintPicker';
import { VisibilityOption } from '@/components/ui/VisibilityOption';
import { ThemedText } from '@/components/themed-text';
import { useAuth } from '@/auth/AuthContext';
import { useCreateCollection } from '@aod/shared/hooks';
import type { CollectionTint, CollectionVisibility } from '@aod/shared/api';
import { DOMAIN_LABEL_MAP } from '@aod/shared/constants';
import { Palette, Radius } from '@/constants/theme';
import { fonts } from '@/theme/tokens';

/**
 * 컬렉션 생성 (collections-mockup 5c 편집 바 문법) - 웹 collection-new-page의
 * 모바일 이식. X+제목+만들기 상단 바 / 커버 미리보기(포스터 0장 + 틴트 veil) /
 * 틴트 6종 / 이름(60자)·설명(300자) / 도메인 선택(생성 시만) / 공개 설정.
 * POST 후 편집 화면으로 replace - 바로 작품을 채울 수 있게 (웹 동일).
 *
 * 편차 (웹 동일): 도메인 선택지는 5종(영화/시리즈 분리) - 서버 domain이 enum
 * 단수라 통합 선택 불가. ?domain= 프리필은 담기 시트의 "새 컬렉션" 진입 경로.
 */

const DOMAIN_OPTIONS = ['GAME', 'WEBTOON', 'MOVIE', 'TV', 'WEBNOVEL'] as const;

const TITLE_MAX = 60;
const DESC_MAX = 300;

const parseDomainParam = (raw: string | string[] | undefined): string => {
  const upper = (Array.isArray(raw) ? raw[0] : raw)?.toUpperCase() ?? '';
  return (DOMAIN_OPTIONS as readonly string[]).includes(upper) ? upper : 'GAME';
};

export default function CollectionNewScreen() {
  const params = useLocalSearchParams<{ domain?: string }>();
  const { state: authState } = useAuth();
  const isAuthenticated = authState.status === 'authenticated';

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [domain, setDomain] = useState<string>(() =>
    parseDomainParam(params.domain),
  );
  const [tint, setTint] = useState<CollectionTint>('PINE');
  const [visibility, setVisibility] = useState<CollectionVisibility>('PUBLIC');
  const [showTitleError, setShowTitleError] = useState(false);

  const createMutation = useCreateCollection();

  const valid = title.trim().length > 0;

  const handleSubmit = () => {
    if (!valid) {
      setShowTitleError(true);
      return;
    }
    if (createMutation.isPending) return;
    createMutation.mutate(
      {
        title: title.trim(),
        description: description.trim() || undefined,
        domain,
        tint,
        visibility,
      },
      {
        // 빈 컬렉션이므로 편집 화면으로 - 작품 추가 동선이 그곳에 있다.
        // replace: 뒤로가기가 생성 폼으로 돌아오지 않게 (웹 동일)
        onSuccess: (created) =>
          router.replace({
            pathname: '/collection/[id]/edit',
            params: { id: String(created.id) },
          }),
      },
    );
  };

  const handleClose = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/collections');
  };

  const serverError = createMutation.isError
    ? ((axios.isAxiosError(createMutation.error) &&
        (createMutation.error.response?.data as { error?: string } | undefined)
          ?.error) ??
      '컬렉션을 만들지 못했어요. 잠시 후 다시 시도해 주세요.')
    : null;

  if (!isAuthenticated) {
    return (
      <View style={styles.screen}>
        <SafeAreaView edges={['top']} style={styles.top}>
          <DetailTopBar title="새 컬렉션" variant="close" onBack={handleClose} />
        </SafeAreaView>
        <EmptyState
          icon={<SignIn size={44} color={Palette.ink3} />}
          title="로그인하면 컬렉션을 만들 수 있어요"
          description="취향이 담긴 나만의 목록을 꾸려보세요."
          action={
            <EmptyStateAction
              label="로그인"
              onPress={() => router.push('/login')}
            />
          }
        />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <SafeAreaView edges={['top']} style={styles.top}>
        <DetailTopBar
          title="새 컬렉션"
          variant="close"
          onBack={handleClose}
          actions={
            <Pressable
              accessibilityRole="button"
              disabled={createMutation.isPending}
              onPress={handleSubmit}
              style={({ pressed }) => [
                styles.submitBtn,
                pressed && styles.pressedDim,
                createMutation.isPending && styles.submitBtnDisabled,
              ]}>
              {createMutation.isPending ? (
                <ActivityIndicator size="small" color={Palette.surface} />
              ) : (
                <ThemedText style={styles.submitBtnText}>만들기</ThemedText>
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
        {serverError && (
          <View accessibilityRole="alert" style={styles.errorBanner}>
            <ThemedText style={styles.errorBannerText}>{serverError}</ThemedText>
          </View>
        )}

        {/* 커버 미리보기 + 틴트 (목업 .m-edit-cover/.m-tint-row) - 틴트 즉시 반영 */}
        <CollectionCollage
          posters={[]}
          tint={tint}
          domain={domain}
          style={styles.cover}
        />
        <TintPicker value={tint} onChange={setTint} style={styles.tintRow} />
        <ThemedText style={styles.tintHint}>
          커버는 담긴 작품 포스터로 자동 구성되고, 틴트가 살짝 덮여 컬렉션의
          분위기를 만듭니다.
        </ThemedText>

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
            placeholder="예) 인생을 갈아넣은 갓겜 모음"
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

        {/* 도메인 - 생성 시만 선택 가능 (PATCH는 domain 불가) */}
        <View style={styles.field}>
          <ThemedText style={styles.fieldLabel}>도메인</ThemedText>
          <View
            accessibilityRole="radiogroup"
            accessibilityLabel="도메인"
            style={styles.domainRow}>
            {DOMAIN_OPTIONS.map((d) => {
              const active = domain === d;
              return (
                <Pressable
                  key={d}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active }}
                  onPress={() => setDomain(d)}
                  style={({ pressed }) => [
                    styles.domainChip,
                    active && styles.domainChipOn,
                    pressed && styles.pressedDim,
                  ]}>
                  <ThemedText
                    style={[
                      styles.domainChipText,
                      active && styles.domainChipTextOn,
                    ]}>
                    {DOMAIN_LABEL_MAP[d]}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
          <ThemedText style={styles.fieldHint}>
            컬렉션에는 같은 도메인의 작품만 담을 수 있고, 만든 뒤에는 바꿀 수
            없어요.
          </ThemedText>
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
      </ScrollView>
    </View>
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
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  submitBtn: {
    minWidth: 68,
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: Radius.pill,
    backgroundColor: Palette.accentInk,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    fontSize: 13.5,
    lineHeight: 18,
    fontWeight: 700,
    color: Palette.surface,
  },
  errorBanner: {
    marginTop: 14,
    marginHorizontal: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: Radius.panel,
    borderWidth: 1,
    borderColor: Palette.danger,
    backgroundColor: Palette.surface,
  },
  errorBannerText: {
    fontSize: 13.5,
    lineHeight: 19,
    fontWeight: 400,
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
  tintHint: {
    paddingTop: 10,
    paddingHorizontal: 16,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: 400,
    color: Palette.ink3,
    textAlign: 'center',
  },
  field: {
    paddingTop: 16,
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
    marginTop: 4,
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
  domainRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 6,
  },
  domainChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Palette.line,
    backgroundColor: Palette.surface,
  },
  domainChipOn: {
    borderColor: Palette.ink,
    backgroundColor: Palette.ink,
  },
  domainChipText: {
    fontSize: 13.5,
    lineHeight: 18,
    fontWeight: 600,
    color: Palette.ink2,
  },
  domainChipTextOn: {
    color: Palette.surface,
  },
  visRow: {
    flexDirection: 'row',
    gap: 8,
  },
});

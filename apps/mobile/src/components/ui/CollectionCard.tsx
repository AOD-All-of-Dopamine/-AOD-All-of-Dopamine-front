import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Eye, Heart, LockSimple } from 'phosphor-react-native';
import type { CollectionSummary } from '@aod/shared/api';
import { collectionDomainLabel } from '@aod/shared/constants';

import { ThemedText } from '@/components/themed-text';
import { CollectionCollage } from '@/components/ui/CollectionCollage';
import { SkeletonBlock } from '@/components/ui/Skeleton';
import { collectionTintColor } from '@/components/ui/collectionTints';
import { Palette, Radius } from '@/constants/theme';

/**
 * 컬렉션 발견 카드 (collections-mockup 5a .col-card) - 웹 ui/CollectionCard의 RN 이식판.
 * 콜라주 커버(16:9 + N작품 pill) / 도메인 라벨(+PRIVATE 배지) / 제목 /
 * foot(큐레이터 아바타·닉네임 + 좋아요·조회수).
 * 모바일 목업 5a는 설명 줄이 없어 생략한다 (웹 카드와 의도적으로 다름).
 */

/** 큐레이터 아바타 - 틴트 배경 + 닉네임 첫 글자 (상세 메타와 공용) */
export function CuratorAvatar({
  name,
  tint,
  size = 20,
}: {
  name: string;
  tint: string;
  size?: number;
}) {
  return (
    <View
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          backgroundColor: collectionTintColor(tint),
        },
      ]}>
      <ThemedText style={[styles.avatarText, { fontSize: size * 0.5 }]}>
        {name.charAt(0)}
      </ThemedText>
    </View>
  );
}

export function CollectionCard({
  collection,
  onPress,
  style,
}: {
  collection: CollectionSummary;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const {
    title,
    domain,
    tint,
    visibility,
    likeCount,
    viewCount,
    itemCount,
    curatorNickname,
    coverPosters,
  } = collection;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.card, style, pressed && styles.pressed]}>
      <View style={styles.collageWrap}>
        <CollectionCollage
          posters={coverPosters}
          tint={tint}
          domain={domain}
          itemCount={itemCount}
          style={styles.collage}
        />
      </View>
      <View style={styles.body}>
        <View style={styles.domainRow}>
          <ThemedText style={styles.domain}>
            {collectionDomainLabel(domain)}
          </ThemedText>
          {visibility === 'PRIVATE' && (
            <View style={styles.privateBadge}>
              <LockSimple size={11} color={Palette.ink2} />
              <ThemedText style={styles.privateBadgeText}>나만 보기</ThemedText>
            </View>
          )}
        </View>
        <ThemedText style={styles.title}>{title}</ThemedText>
        <View style={styles.foot}>
          <View style={styles.curator}>
            <CuratorAvatar name={curatorNickname} tint={tint} />
            <ThemedText numberOfLines={1} style={styles.curatorName}>
              {curatorNickname}
            </ThemedText>
          </View>
          <View style={styles.stats}>
            <View style={styles.stat}>
              <Heart size={13} weight="fill" color={Palette.ink3} />
              <ThemedText style={styles.statValue}>
                {likeCount.toLocaleString()}
              </ThemedText>
            </View>
            <View style={styles.stat}>
              <Eye size={13} color={Palette.ink3} />
              <ThemedText style={styles.statValue}>
                {viewCount.toLocaleString()}
              </ThemedText>
            </View>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

/** 카드 최종 모양을 따르는 스켈레톤 (발견 탭 로딩 상태) */
export function CollectionCardSkeleton({ style }: { style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.card, style]}>
      <SkeletonBlock aspectRatio={16 / 9} radius={0} style={styles.skeletonCover} />
      <View style={styles.body}>
        <SkeletonBlock height={12} width={40} />
        <SkeletonBlock height={16} width="78%" style={styles.skeletonTitle} />
        <View style={styles.skeletonFoot}>
          <SkeletonBlock height={20} width={20} radius={Radius.pill} />
          <SkeletonBlock height={12} width={72} />
          <SkeletonBlock height={12} width={56} style={styles.skeletonStats} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.line,
    borderRadius: Radius.panel,
    // 목업 shadow-card 근사 (WorkCard 동일)
    shadowColor: Palette.shadowInk,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  pressed: {
    opacity: 0.85,
  },
  // overflow hidden을 카드 전체에 걸면 iOS 그림자가 죽어 커버 래퍼에만 건다
  collageWrap: {
    borderTopLeftRadius: Radius.panel - 1,
    borderTopRightRadius: Radius.panel - 1,
    overflow: 'hidden',
  },
  collage: {
    aspectRatio: 16 / 9,
  },
  body: {
    paddingTop: 13,
    paddingHorizontal: 15,
    paddingBottom: 14,
  },
  domainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  domain: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: 700,
    color: Palette.accentInk,
  },
  privateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Palette.line,
    backgroundColor: Palette.canvas,
  },
  privateBadgeText: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: 600,
    color: Palette.ink2,
  },
  title: {
    marginTop: 3,
    fontSize: 15.5,
    lineHeight: 20,
    fontWeight: 800,
    letterSpacing: -0.15,
    color: Palette.ink,
  },
  foot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 11,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Palette.line,
  },
  curator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
    minWidth: 0,
  },
  avatar: {
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    lineHeight: 14,
    fontWeight: 800,
    color: Palette.surface,
  },
  curatorName: {
    flexShrink: 1,
    fontSize: 12.5,
    lineHeight: 17,
    fontWeight: 400,
    color: Palette.ink2,
  },
  stats: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 12.5,
    lineHeight: 17,
    fontWeight: 600,
    color: Palette.ink2,
    fontVariant: ['tabular-nums'],
  },
  skeletonCover: {
    borderTopLeftRadius: Radius.panel - 1,
    borderTopRightRadius: Radius.panel - 1,
  },
  skeletonTitle: {
    marginTop: 8,
  },
  skeletonFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
  },
  skeletonStats: {
    marginLeft: 'auto',
  },
});

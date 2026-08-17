import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';

import { ThemedText } from '@/components/themed-text';
import { domainFallbackIcon } from '@/components/ui/WorkCard';
import { collectionTintColor } from '@/components/ui/collectionTints';
import { Overlay, Palette } from '@/constants/theme';

/**
 * 컬렉션 콜라주 커버 (목업 .collage / .m-det-collage / .m-edit-cover 공용) -
 * 웹 ui/CollectionCollage의 RN 이식판.
 * 포스터 상위 3장을 큰 1(1.6fr) + 작은 2(1fr) 그리드로 배치하고 큐레이터 틴트를
 * opacity 18% veil로 덮는다. 빈 슬롯은 canvas 블록, 메인 슬롯만 도메인 폴백 아이콘.
 * 비율·라운드·그림자 등 컨테이너 형태는 쓰는 쪽이 style로 결정한다.
 */
export interface CollectionCollageProps {
  /** 상위 3개 포스터 URL (0~3장) */
  posters: string[];
  /** 서버 tint enum명 (PINE/OLIVE/...) - 미지 값은 PINE 폴백 */
  tint: string;
  /** 빈 메인 슬롯의 폴백 아이콘 선택용 도메인 (MOVIE/TV/GAME/...) */
  domain: string;
  /** 우하단 "N작품" pill - 발견 카드 전용 (미전달 시 생략) */
  itemCount?: number;
  style?: StyleProp<ViewStyle>;
}

function Slot({ poster, isMain, domain }: { poster?: string; isMain?: boolean; domain?: string }) {
  const FallbackIcon = domainFallbackIcon(domain);
  return (
    <View style={[styles.slot, isMain ? styles.mainSlot : undefined]}>
      {poster ? (
        <Image source={{ uri: poster }} style={styles.fill} contentFit="cover" transition={150} />
      ) : (
        isMain && (
          <View style={styles.fallback}>
            <FallbackIcon size={30} color={Palette.ink3} />
          </View>
        )
      )}
    </View>
  );
}

export function CollectionCollage({
  posters,
  tint,
  domain,
  itemCount,
  style,
}: CollectionCollageProps) {
  return (
    <View style={[styles.wrap, style]}>
      <Slot poster={posters[0]} isMain domain={domain} />
      <View style={styles.side}>
        <Slot poster={posters[1]} />
        <Slot poster={posters[2]} />
      </View>
      {/* 틴트 veil - 콘텐츠 색 전용 (collectionTints.ts) */}
      <View
        pointerEvents="none"
        style={[styles.veil, { backgroundColor: collectionTintColor(tint) }]}
      />
      {itemCount !== undefined && (
        <View style={styles.countPill}>
          <ThemedText style={styles.countPillText}>{itemCount}작품</ThemedText>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    gap: 2,
    overflow: 'hidden',
    backgroundColor: Palette.canvas,
  },
  side: {
    flex: 1,
    gap: 2,
  },
  slot: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: Palette.canvas,
  },
  mainSlot: {
    flex: 1.6,
  },
  fill: {
    width: '100%',
    height: '100%',
  },
  fallback: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.8,
  },
  veil: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.18,
  },
  countPill: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: Overlay.pillDim,
  },
  countPillText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: 700,
    color: Palette.surface,
  },
});

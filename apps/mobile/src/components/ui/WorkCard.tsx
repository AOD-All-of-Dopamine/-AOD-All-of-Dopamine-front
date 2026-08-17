import { ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Image } from 'expo-image';
import {
  BookOpenText,
  Books,
  FilmSlate,
  GameController,
  TelevisionSimple,
  type Icon,
} from 'phosphor-react-native';

import { ThemedText } from '@/components/themed-text';
import { Tag } from '@/components/ui/Tag';
import { Palette, Radius } from '@/constants/theme';

/**
 * 목업 .card / .card-body / .card-t / .card-m / .card-foot (mobile-light-mockup.html)
 * - portrait: 포스터 3:4 (영화·시리즈·웹툰·웹소설)
 * - landscape: 게임 가로 16:9
 * meta/tags/footer 파생은 components/ui/workCardInfo.tsx 사용.
 */
export interface WorkCardProps {
  variant: 'portrait' | 'landscape';
  title: string;
  meta?: string;
  /** 장르 pill 상위 3 (workCardTags 파생) */
  tags?: string[];
  /** 카드 하단 행 - 구분선 위 도메인별 정보 (workCardFooter 파생) */
  footer?: ReactNode;
  /** null이면 도메인별 Phosphor 폴백 아이콘을 중앙 표시 */
  imageUrl: string | null;
  /** 폴백 아이콘 선택용 도메인 (MOVIE/TV/GAME/WEBTOON/WEBNOVEL) */
  domain?: string;
  onPress?: () => void;
  /** 그리드 배치(width 등) 외부 지정 */
  style?: StyleProp<ViewStyle>;
}

// 신규 카드 폴백은 Phosphor 도메인 아이콘 (구 svg-assets 세트 사용 금지)
const FALLBACK_ICON: Record<string, Icon> = {
  MOVIE: FilmSlate,
  TV: TelevisionSimple,
  GAME: GameController,
  WEBTOON: BookOpenText,
  WEBNOVEL: Books,
};

export function WorkCard({
  variant,
  title,
  meta,
  tags,
  footer,
  imageUrl,
  domain,
  onPress,
  style,
}: WorkCardProps) {
  const FallbackIcon = FALLBACK_ICON[domain ?? ''] ?? FilmSlate;

  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      onPress={onPress}
      style={({ pressed }) => [styles.card, style, pressed && styles.pressed]}>
      <View
        style={[
          styles.thumbWrap,
          variant === 'landscape' ? styles.thumbLandscape : styles.thumbPortrait,
        ]}>
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            style={styles.thumb}
            contentFit="cover"
            transition={150}
          />
        ) : (
          <View style={styles.fallback}>
            <FallbackIcon size={32} color={Palette.ink3} />
          </View>
        )}
      </View>
      <View style={styles.body}>
        <ThemedText numberOfLines={1} style={styles.title}>
          {title}
        </ThemedText>
        {meta && (
          <ThemedText numberOfLines={1} style={styles.meta}>
            {meta}
          </ThemedText>
        )}
        {tags && tags.length > 0 && (
          <View style={styles.tags}>
            {tags.map((tag) => (
              <Tag key={tag}>{tag}</Tag>
            ))}
          </View>
        )}
        {footer && <View style={styles.foot}>{footer}</View>}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.line,
    borderRadius: Radius.panel,
    // 목업 shadow-card 근사 (iOS 그림자 + Android elevation)
    shadowColor: Palette.shadowInk,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  pressed: {
    opacity: 0.85,
  },
  // overflow hidden을 카드 전체에 걸면 iOS 그림자가 죽어 썸네일 래퍼에만 건다
  thumbWrap: {
    width: '100%',
    borderTopLeftRadius: Radius.panel - 1,
    borderTopRightRadius: Radius.panel - 1,
    overflow: 'hidden',
    backgroundColor: Palette.canvas,
  },
  thumbPortrait: {
    aspectRatio: 3 / 4,
  },
  thumbLandscape: {
    aspectRatio: 16 / 9,
  },
  thumb: {
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
  body: {
    paddingTop: 10,
    paddingHorizontal: 12,
    paddingBottom: 11,
  },
  title: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: 700,
    color: Palette.ink,
  },
  meta: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: 400,
    color: Palette.ink3,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    marginTop: 7,
  },
  foot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Palette.line,
  },
});

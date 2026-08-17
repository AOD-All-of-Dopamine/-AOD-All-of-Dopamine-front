import { ReactNode, useEffect, useRef } from 'react';
import {
  Animated,
  StyleSheet,
  View,
  type DimensionValue,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { Palette, Radius } from '@/constants/theme';

/**
 * 스켈레톤 - 최종 형상 근사 원칙 (웹 animate-pulse 규율의 RN 대응).
 * 화면별 스켈레톤은 SkeletonPulse(펄스 1회 래핑) 안에 SkeletonBlock으로 조립한다.
 */

/** 펄스 래퍼 - 하위 전체 opacity를 0.55~1로 루프. 접근성 트리에서 숨긴다 */
export function SkeletonPulse({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.55,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[style, { opacity }]}>
      {children}
    </Animated.View>
  );
}

/** 단색 블록 - width/height 또는 aspectRatio로 형상 지정 */
export function SkeletonBlock({
  width,
  height,
  aspectRatio,
  radius = Radius.input,
  style,
}: {
  width?: DimensionValue;
  height?: DimensionValue;
  aspectRatio?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View
      style={[
        styles.block,
        { width, height, aspectRatio, borderRadius: radius },
        style,
      ]}
    />
  );
}

/** WorkCard 형상 스켈레톤 (썸네일 + 제목·메타 줄) */
export function WorkCardSkeleton({
  variant,
  style,
}: {
  variant: 'portrait' | 'landscape';
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.card, style]}>
      <SkeletonBlock
        aspectRatio={variant === 'landscape' ? 16 / 9 : 3 / 4}
        radius={0}
        style={styles.cardThumb}
      />
      <View style={styles.cardBody}>
        <SkeletonBlock height={14} width="72%" />
        <SkeletonBlock height={11} width="45%" style={styles.cardMeta} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    backgroundColor: Palette.line,
  },
  card: {
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.line,
    borderRadius: Radius.panel,
    overflow: 'hidden',
  },
  cardThumb: {
    width: '100%',
  },
  cardBody: {
    paddingTop: 10,
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  cardMeta: {
    marginTop: 7,
  },
});

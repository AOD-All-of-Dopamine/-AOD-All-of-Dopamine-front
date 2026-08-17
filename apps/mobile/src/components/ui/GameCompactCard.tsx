import {
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Image } from 'expo-image';
import { GameController } from 'phosphor-react-native';
import { WorkSummary } from '@aod/shared/types';
import { steamReviewDescKo } from '@aod/shared/constants';

import { ThemedText } from '@/components/themed-text';
import { workCardMeta } from '@/components/ui/workCardInfo';
import { Palette, Radius } from '@/constants/theme';

/**
 * 혼합 목록(탐색 전체 탭·검색)용 게임 컴팩트 가로 행 - 웹 ui/GameCompactCard
 * (mixed-grid-mockup.html 1-C 확정안)의 RN 이식. 좌측 460:215 원본(Steam header)
 * 무크롭 썸네일(42% 폭, 인셋 - WorkCard landscape와 동일 비율 관례) +
 * 우측 제목·meta(도메인·연도·개발사)·Steam 평가(desc + 긍정 %).
 * 앱에서는 풀폭 가로 행 1개씩 - 행 배치(마진)는 소비처 style이 담당한다.
 * 썸네일 폴백은 웹 svg 에셋 대신 Phosphor 도메인 아이콘 (M-A 관례).
 */
export interface GameCompactCardProps {
  work: WorkSummary;
  onPress?: () => void;
  /** 목록 배치(마진 등) 외부 지정 */
  style?: StyleProp<ViewStyle>;
}

export function GameCompactCard({ work, onPress, style }: GameCompactCardProps) {
  const meta = workCardMeta(work, { withDomain: true });
  const desc = work.steamReviewDesc
    ? steamReviewDescKo(work.steamReviewDesc)
    : undefined;
  const pct =
    typeof work.steamPositivePct === 'number'
      ? work.steamPositivePct
      : undefined;

  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      onPress={onPress}
      style={({ pressed }) => [styles.card, style, pressed && styles.pressed]}>
      <View style={styles.thumbWrap}>
        {work.thumbnail ? (
          <Image
            source={{ uri: work.thumbnail }}
            style={styles.thumb}
            contentFit="cover"
            transition={150}
          />
        ) : (
          <View style={styles.fallback}>
            <GameController size={28} color={Palette.ink3} />
          </View>
        )}
      </View>
      <View style={styles.body}>
        <ThemedText numberOfLines={1} style={styles.title}>
          {work.title}
        </ThemedText>
        {meta && (
          <ThemedText numberOfLines={1} style={styles.meta}>
            {meta}
          </ThemedText>
        )}
        {(desc || pct !== undefined) && (
          <ThemedText numberOfLines={1} style={styles.review}>
            {desc && <ThemedText style={styles.reviewDesc}>{desc}</ThemedText>}
            {desc && pct !== undefined && ' · '}
            {pct !== undefined && (
              <ThemedText style={styles.reviewPct}>{pct}%</ThemedText>
            )}
          </ThemedText>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.line,
    borderRadius: Radius.panel,
    // WorkCard와 동일한 shadow-card 근사 (iOS 그림자 + Android elevation)
    shadowColor: Palette.shadowInk,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  pressed: {
    opacity: 0.85,
  },
  thumbWrap: {
    width: '42%',
    aspectRatio: 460 / 215,
    alignSelf: 'center',
    marginVertical: 12,
    marginLeft: 12,
    borderRadius: Radius.input,
    overflow: 'hidden',
    backgroundColor: Palette.canvas,
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
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 13,
    paddingVertical: 11,
  },
  title: {
    fontSize: 14.5,
    lineHeight: 19,
    fontWeight: 700,
    // 웹 tracking-[-0.01em]의 픽셀 대응치 (14.5px 기준)
    letterSpacing: -0.15,
    color: Palette.ink,
  },
  meta: {
    marginTop: 2,
    fontSize: 12.5,
    lineHeight: 17,
    fontWeight: 400,
    color: Palette.ink3,
  },
  review: {
    marginTop: 6,
    fontSize: 12.5,
    lineHeight: 17,
    fontWeight: 400,
    color: Palette.ink3,
  },
  reviewDesc: {
    fontSize: 12.5,
    lineHeight: 17,
    fontWeight: 700,
    color: Palette.ink,
  },
  reviewPct: {
    fontSize: 12.5,
    lineHeight: 17,
    fontWeight: 400,
    color: Palette.ink3,
    fontVariant: ['tabular-nums'],
  },
});

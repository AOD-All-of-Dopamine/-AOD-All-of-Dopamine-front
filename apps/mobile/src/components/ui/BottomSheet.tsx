import { ReactNode, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';

import { Overlay, Palette } from '@/constants/theme';

/**
 * 바텀시트 (목업 .sheet/.sheet-dim/.sheet-grip) - RN Modal + Animated 슬라이드업 자작.
 * (플랜 결정: heavy 의존성 지양 - @gorhom/bottom-sheet 미도입)
 * - visible 전환에 따라 progress(0~1) 하나로 딤 opacity + 시트 translateY를 구동
 * - 닫힘은 슬라이드 다운이 끝난 뒤 Modal을 내린다(mounted 분리).
 *   visible이 어떤 순서로 몇 번 바뀌어도 이펙트가 목표값으로만 수렴 - 상태 정리 멱등
 * - 딤 탭·Android back(onRequestClose) 모두 onClose 요청으로 위임
 */
interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  /** 접근성 라벨 (시트 제목) */
  label: string;
  children: ReactNode;
}

const DURATION = 260;

export function BottomSheet({
  visible,
  onClose,
  label,
  children,
}: BottomSheetProps) {
  const [mounted, setMounted] = useState(visible);
  const progress = useRef(new Animated.Value(visible ? 1 : 0)).current;
  const { height } = useWindowDimensions();

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.timing(progress, {
        toValue: 1,
        duration: DURATION,
        useNativeDriver: true,
      }).start();
      return;
    }
    Animated.timing(progress, {
      toValue: 0,
      duration: DURATION,
      useNativeDriver: true,
    }).start(({ finished }) => {
      // 닫힘 전환 중 재열림이 시작되면 finished=false - 언마운트하지 않는다
      if (finished) setMounted(false);
    });
  }, [visible, progress]);

  if (!mounted) return null;

  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [height, 0],
  });

  return (
    <Modal
      transparent
      statusBarTranslucent
      navigationBarTranslucent
      visible
      animationType="none"
      onRequestClose={onClose}>
      <Animated.View style={[styles.dim, { opacity: progress }]}>
        <Pressable
          style={StyleSheet.absoluteFill}
          accessibilityRole="button"
          accessibilityLabel="시트 닫기"
          onPress={onClose}
        />
      </Animated.View>
      <View style={styles.host} pointerEvents="box-none">
        <Animated.View
          accessibilityViewIsModal
          accessibilityLabel={label}
          style={[styles.sheet, { transform: [{ translateY }] }]}>
          <View style={styles.grip} />
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  dim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Overlay.dim,
  },
  host: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '82%',
    backgroundColor: Palette.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    // 목업 shadow-lift 근사
    shadowColor: Palette.shadowInk,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 14,
    elevation: 12,
  },
  grip: {
    width: 36,
    height: 4,
    borderRadius: 999,
    backgroundColor: Palette.lineStrong,
    alignSelf: 'center',
    marginTop: 10,
  },
});

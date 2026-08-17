import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

/**
 * 라이트 락 - 다크 매핑은 백로그(웹과 동일 정책).
 * use-color-scheme 스캐폴드는 유지하되 테마 해석은 라이트로 고정한다.
 */
export function useTheme() {
  useColorScheme(); // 스캐폴드 유지 (다크 대응 재개 시 이 값으로 분기)

  return Colors.light;
}

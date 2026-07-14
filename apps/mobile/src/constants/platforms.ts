import { PLATFORM_LABELS } from '@aod/shared/constants';

// 웹 apps/web/src/constants/platforms.ts 미러:
// 라벨은 shared에서, 로고는 앱 번들 에셋에서 합성한다.
const PLATFORM_LOGOS: Record<string, number> = {
  TMDB_MOVIE: require('@/assets/images/platform/tmdb-logo.png'),
  TMDB_TV: require('@/assets/images/platform/tmdb-logo.png'),
  Netflix: require('@/assets/images/platform/netflix-logo.png'),
  Watcha: require('@/assets/images/platform/watcha-logo.png'),
  'Disney Plus': require('@/assets/images/platform/disney-logo.png'),
  TVING: require('@/assets/images/platform/tving-logo.png'),
  wavve: require('@/assets/images/platform/wavve-logo.png'),
  'Coupang Play': require('@/assets/images/platform/coupang-logo.png'),
  'Apple TV': require('@/assets/images/platform/appletv-logo.png'),
  Steam: require('@/assets/images/platform/steam-logo.png'),
  NaverWebtoon: require('@/assets/images/platform/nwebtoon-logo.png'),
  NaverSeries: require('@/assets/images/platform/nnovel-logo.webp'),
  KakaoPage: require('@/assets/images/platform/kakaopage-logo.png'),
};

export interface PlatformMeta {
  label: string;
  logo?: number;
}

export const PLATFORM_META: Record<string, PlatformMeta> = Object.fromEntries(
  Object.entries(PLATFORM_LABELS).map(([key, label]): [string, PlatformMeta] => [
    key,
    PLATFORM_LOGOS[key] ? { label, logo: PLATFORM_LOGOS[key] } : { label },
  ]),
);

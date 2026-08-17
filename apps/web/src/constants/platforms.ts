import TMDB_LOGO from "../assets/platform-icon/tmdb-logo.png";
import NETFLIX_LOGO from "../assets/platform-icon/netflix-logo.png";
import WATCHA_LOGO from "../assets/platform-icon/watcha-logo.png";
import DISNEY_LOGO from "../assets/platform-icon/disney-logo.png";
import TVING_LOGO from "../assets/platform-icon/tving-logo.png";
import WAVVE_LOGO from "../assets/platform-icon/wavve-logo.png";
import COUPANG_LOGO from "../assets/platform-icon/coupang-logo.png";
import APPLE_LOGO from "../assets/platform-icon/appletv-logo.png";
import STEAM_LOGO from "../assets/platform-icon/steam-logo.png";
import NAVER_WEBTOON_LOGO from "../assets/platform-icon/nwebtoon-logo.png";
import NAVER_WEBNOVEL_LOGO from "../assets/platform-icon/nnovel-logo.webp";
import KAKAO_WEBNOVEL_LOGO from "../assets/platform-icon/kakaopage-logo.png";
import { PLATFORM_LABELS } from "@aod/shared/constants";

export {
  DOMAIN_PLATFORMS,
  COLLECTION_SOURCES,
  platformLabel,
  watchPlatformLabels,
} from "@aod/shared/constants";

// 로고는 웹 번들 에셋이라 shared에 둘 수 없다 — 라벨(공유)과 여기서 합성한다.
const PLATFORM_LOGOS: Record<string, string> = {
  TMDB_MOVIE: TMDB_LOGO,
  TMDB_TV: TMDB_LOGO,
  Netflix: NETFLIX_LOGO,
  Watcha: WATCHA_LOGO,
  "Disney Plus": DISNEY_LOGO,
  TVING: TVING_LOGO,
  wavve: WAVVE_LOGO,
  "Coupang Play": COUPANG_LOGO,
  "Apple TV": APPLE_LOGO,
  Steam: STEAM_LOGO,
  NaverWebtoon: NAVER_WEBTOON_LOGO,
  NaverSeries: NAVER_WEBNOVEL_LOGO,
  KakaoPage: KAKAO_WEBNOVEL_LOGO,
};

export const PLATFORM_META: Record<string, { label: string; logo?: string }> =
  Object.fromEntries(
    Object.entries(PLATFORM_LABELS).map(
      ([key, label]): [string, { label: string; logo?: string }] => [
        key,
        PLATFORM_LOGOS[key] ? { label, logo: PLATFORM_LOGOS[key] } : { label },
      ],
    ),
  );

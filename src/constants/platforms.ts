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

export const DOMAIN_PLATFORMS: Record<string, string[]> = {
  MOVIE: [
    "ALL",
    "TMDB_MOVIE",
    "Netflix",
    "Watcha",
    "Disney Plus",
    "TVING",
    "wavve",
    "Coupang Play",
    "Apple TV",
  ],
  TV: [
    "ALL",
    "TMDB_TV",
    "Netflix",
    "Watcha",
    "Disney Plus",
    "TVING",
    "wavve",
    "Coupang Play",
    "Apple TV",
  ],
  GAME: ["ALL", "Steam"],
  WEBTOON: ["ALL", "NaverWebtoon"],
  WEBNOVEL: ["ALL", "NaverSeries", "KakaoPage"],
};

export const PLATFORM_META: Record<string, { label: string; logo?: string }> = {
  ALL: { label: "전체" },

  TMDB_MOVIE: { label: "TMDB", logo: TMDB_LOGO },
  TMDB_TV: { label: "TMDB", logo: TMDB_LOGO },

  Netflix: { label: "넷플릭스", logo: NETFLIX_LOGO },
  Watcha: { label: "왓챠", logo: WATCHA_LOGO },
  "Disney Plus": { label: "디즈니+", logo: DISNEY_LOGO },
  TVING: { label: "티빙", logo: TVING_LOGO },
  wavve: { label: "웨이브", logo: WAVVE_LOGO },
  "Coupang Play": { label: "쿠팡플레이", logo: COUPANG_LOGO },
  "Apple TV": { label: "애플TV", logo: APPLE_LOGO },

  Steam: { label: "스팀", logo: STEAM_LOGO },

  NaverWebtoon: { label: "네이버웹툰", logo: NAVER_WEBTOON_LOGO },

  NaverSeries: { label: "네이버시리즈", logo: NAVER_WEBNOVEL_LOGO },
  KakaoPage: { label: "카카오페이지", logo: KAKAO_WEBNOVEL_LOGO },
};

/** 수집 소스 식별자 - 시청 가능한 OTT가 아니므로 "볼 수 있는 곳" 표기·필터에서 제외 */
export const COLLECTION_SOURCES = ["TMDB_MOVIE", "TMDB_TV"];

export const platformLabel = (key: string) => PLATFORM_META[key]?.label ?? key;

/**
 * 카드 표기용 플랫폼 한글 라벨 목록 - 수집 소스(TMDB_*)는 제외.
 * TMDB 제공처 변형(예: "Netflix Standard with Ads")은 같은 목록에 본
 * 플랫폼("Netflix")이 있으면 흡수하고, 라벨 중복은 제거한다.
 */
export const watchPlatformLabels = (platforms?: string[] | null) => {
  const list = (platforms ?? []).filter((p) => !COLLECTION_SOURCES.includes(p));
  const bases = list.filter(
    (p) => !list.some((base) => base !== p && p.startsWith(`${base} `)),
  );
  return [...new Set(bases.map(platformLabel))];
};

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

// 플랫폼 표시 라벨. 로고 등 에셋은 각 앱 소유 — 웹은 apps/web/src/constants/platforms.ts에서
// 이 라벨에 로고를 합성해 PLATFORM_META를 만든다.
export const PLATFORM_LABELS: Record<string, string> = {
  ALL: "전체",

  TMDB_MOVIE: "TMDB",
  TMDB_TV: "TMDB",

  Netflix: "넷플릭스",
  Watcha: "왓챠",
  "Disney Plus": "디즈니+",
  TVING: "티빙",
  wavve: "웨이브",
  "Coupang Play": "쿠팡플레이",
  "Apple TV": "애플TV",
  "Amazon Prime Video": "프라임 비디오",

  Steam: "스팀",

  NaverWebtoon: "네이버웹툰",

  NaverSeries: "네이버시리즈",
  KakaoPage: "카카오페이지",
};

/** 수집 소스 식별자 - 시청 가능한 OTT가 아니므로 "볼 수 있는 곳" 표기·필터에서 제외 */
export const COLLECTION_SOURCES = ["TMDB_MOVIE", "TMDB_TV"];

export const platformLabel = (key: string) => PLATFORM_LABELS[key] ?? key;

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

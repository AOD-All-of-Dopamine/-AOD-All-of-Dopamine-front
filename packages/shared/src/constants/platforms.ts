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

  Steam: "스팀",

  NaverWebtoon: "네이버웹툰",

  NaverSeries: "네이버시리즈",
  KakaoPage: "카카오페이지",
};

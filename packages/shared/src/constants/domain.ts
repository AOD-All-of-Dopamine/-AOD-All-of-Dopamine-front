export const DOMAIN_LABEL_MAP: Record<string, string> = {
  MOVIE: "영화",
  TV: "시리즈",
  GAME: "게임",
  WEBTOON: "웹툰",
  WEBNOVEL: "웹소설",
};

export const DOMAIN_FILTERS = [
  { id: "ALL", label: "전체" },
  { id: "MOVIE", label: DOMAIN_LABEL_MAP.MOVIE },
  { id: "TV", label: DOMAIN_LABEL_MAP.TV },
  { id: "GAME", label: DOMAIN_LABEL_MAP.GAME },
  { id: "WEBTOON", label: DOMAIN_LABEL_MAP.WEBTOON },
  { id: "WEBNOVEL", label: DOMAIN_LABEL_MAP.WEBNOVEL },
] as const;

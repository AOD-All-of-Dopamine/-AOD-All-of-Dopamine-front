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

/**
 * 웹툰 연재 요일(DB 실측값 mon~sun 소문자) 한글 - "월요웹툰" 조립용.
 * 카드 foot(workCardInfo)·상세 요일 필·컬렉션 아이템 스탯 공용 -
 * 웹·모바일 workCardInfo의 로컬 정의에서 승격 (2026-08-17 마무리 라운드).
 */
export const WEEKDAY_KO: Record<string, string> = {
  mon: "월",
  tue: "화",
  wed: "수",
  thu: "목",
  fri: "금",
  sat: "토",
  sun: "일",
};

/**
 * Steam review_score_desc 한글화 (스팀 상점 공식 표기 기준).
 * work-detail 통계 필과 목록 카드(workCardInfo) 공용 - 중복 정의 금지.
 */
export const STEAM_REVIEW_DESC_KO: Record<string, string> = {
  "Overwhelmingly Positive": "압도적으로 긍정적",
  "Very Positive": "매우 긍정적",
  Positive: "긍정적",
  "Mostly Positive": "대체로 긍정적",
  Mixed: "복합적",
  "Mostly Negative": "대체로 부정적",
  Negative: "부정적",
  "Very Negative": "매우 부정적",
  "Overwhelmingly Negative": "압도적으로 부정적",
};

/**
 * Steam 평가 문구 한글. 9개 판정은 표대로, 판정 전 문구도 옮긴다(탐색 가벼운 카드 2026-09-26):
 * "No user reviews" → "평가 없음", "N user review(s)" → "평가 N개". 그 밖의 모르는 값은 원문 그대로.
 * 웹 · 모바일 모든 소비처가 이 함수를 쓴다(표를 직접 읽지 않는다).
 */
export const steamReviewDescKo = (desc: string) => {
  const verdict = STEAM_REVIEW_DESC_KO[desc];
  if (verdict) return verdict;
  const trimmed = desc.trim();
  if (/^no user reviews?$/i.test(trimmed)) return "평가 없음";
  const count = /^(\d[\d,]*) user reviews?$/i.exec(trimmed);
  if (count) return `평가 ${Number(count[1].replace(/,/g, "")).toLocaleString("ko-KR")}개`;
  return desc;
};

/** 9개 판정 중 하나인지 — 판정 전("평가 N개")에는 긍정 %를 믿기 어렵다. */
export const isSteamVerdict = (desc?: string | null): boolean =>
  !!desc && Object.prototype.hasOwnProperty.call(STEAM_REVIEW_DESC_KO, desc);

/** 긍정 판정인지 (가벼운 카드에서 판정 글자를 굵게 · 진하게 — 색은 쓰지 않는다). */
export const isPositiveSteamVerdict = (desc?: string | null): boolean =>
  isSteamVerdict(desc) && /Positive$/.test(desc as string);

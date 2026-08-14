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

/** 미등록 desc는 영문 원문 그대로 노출 */
export const steamReviewDescKo = (desc: string) =>
  STEAM_REVIEW_DESC_KO[desc] ?? desc;

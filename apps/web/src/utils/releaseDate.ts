/**
 * 출시일("yyyy-MM-dd") 파싱과 D-day 계산 공용 헬퍼.
 * home-page(출시 예정 섹션)와 new-releases-page(신작 타임라인)가 공유한다.
 * 모든 계산은 클라이언트 로컬 시간 기준 (Date 파싱 대신 문자열 분해로
 * 타임존·NaN 문제 회피).
 */

/** "yyyy-MM-dd" 파싱. 실패 시 null */
export const parseYmd = (
  value?: string,
): { y: number; m: number; d: number } | null => {
  const [y, m, d] = (value ?? "").split("-").map(Number);
  return y && m && d ? { y, m, d } : null;
};

/** 오늘 0시 기준 남은 일수. 날짜 없음·파싱 실패면 null */
export const daysUntil = (releaseDate?: string): number | null => {
  const ymd = parseYmd(releaseDate);
  if (!ymd) return null;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round(
    (new Date(ymd.y, ymd.m - 1, ymd.d).getTime() - today.getTime()) /
      86_400_000,
  );
};

/** D-day 클라 계산 - 오늘 이하=D-DAY, 미래=D-n, 날짜 없음·파싱 실패=미정(tba) */
export const dDayOf = (
  releaseDate?: string,
): { label: string; variant: "default" | "tba" } => {
  const diff = daysUntil(releaseDate);
  if (diff === null) return { label: "미정", variant: "tba" };
  return diff <= 0
    ? { label: "D-DAY", variant: "default" }
    : { label: `D-${diff}`, variant: "default" };
};

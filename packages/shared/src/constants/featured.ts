import type { FeaturedReason, WorkSummary } from "../types";
import { isSteamVerdict, steamReviewDescKo } from "./steam";
import { EXTERNAL_RATING_MIN_VOTES, STEAM_PCT_MIN_REVIEWS } from "./workSignal";

/**
 * 홈 "오늘의 작품" (설계: docs/superpowers/specs/2026-09-26-home-featured-today-design.md).
 * 부제는 중점 1개 — 고른 근거(평가 · 순위)를 한 줄로.
 */

/** 날짜가 넘어가는 시각 05:00 KST = 전날 20:00 UTC */
const SWITCH_UTC_HOUR = 20;
/** 탭을 열어 둔 채 날이 바뀌어도 이 안에 다시 받는다 */
export const FEATURED_MAX_STALE_MS = 30 * 60 * 1000;

/**
 * 응답 date(yyyy-MM-dd)의 다음 날짜가 시작될 때(date+1 05:00 KST)까지 남은 ms. 형식이 틀리면 0.
 */
export function msUntilNextFeaturedSwitch(date: string, now: number = Date.now()): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!m) return 0;
  const next = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), SWITCH_UTC_HOUR);
  return Math.max(0, next - now);
}

/** react-query staleTime — 다음 05:00 까지, 최대 30분. 없음(204)이면 30분. */
export function featuredStaleTime(date: string | undefined, now: number = Date.now()): number {
  if (!date) return FEATURED_MAX_STALE_MS;
  return Math.min(msUntilNextFeaturedSwitch(date, now), FEATURED_MAX_STALE_MS);
}

/**
 * 게임: "매우 긍정적 94% · 스팀 인기 8위"
 * 영화 · 시리즈: "★ 8.4 · 이번 주 인기 3위"
 * 문턱을 넘은 작품만 오므로 평가가 빠지는 건 데이터가 없을 때뿐 — 그래도 적은 표본 규칙은 목록 카드와 같다.
 */
export function featuredSubline(reason: FeaturedReason): string {
  const { ratingScore: score, ratingCount: count, ratingLabel: label } = reason;
  const hasCount = typeof count === "number";
  if (reason.platform === "Steam") {
    const verdict = label && isSteamVerdict(label) ? steamReviewDescKo(label) : undefined;
    const pct =
      verdict && typeof score === "number" && hasCount && count >= STEAM_PCT_MIN_REVIEWS
        ? `${Math.round(score * 100)}%`
        : undefined;
    const rating = [verdict, pct].filter(Boolean).join(" ");
    return [rating, `스팀 인기 ${reason.ranking}위`].filter(Boolean).join(" · ");
  }
  const star =
    typeof score === "number" && score > 0 && hasCount && count >= EXTERNAL_RATING_MIN_VOTES
      ? `★ ${score.toFixed(1)}`
      : undefined;
  return [star, `이번 주 인기 ${reason.ranking}위`].filter(Boolean).join(" · ");
}

/** 대체(최신 출시) 부제 — "2026 출시". 우리 리뷰 평균은 쓰지 않는다. */
export function releaseSubline(work: Pick<WorkSummary, "releaseDate">): string | undefined {
  const year = work.releaseDate?.slice(0, 4);
  return year && /^\d{4}$/.test(year) ? `${year} 출시` : undefined;
}

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
  return featuredReasonParts(reason).join(" · ");
}

/** 고른 근거 조각 — 히어로 1줄(굵게)에 쓴다. ["매우 긍정적 94%", "스팀 인기 3위"] · ["★ 8.6", "이번 주 인기 5위"] */
export function featuredReasonParts(reason: FeaturedReason): string[] {
  const { ratingScore: score, ratingCount: count, ratingLabel: label } = reason;
  const hasCount = typeof count === "number";
  if (reason.platform === "Steam") {
    const verdict = label && isSteamVerdict(label) ? steamReviewDescKo(label) : undefined;
    const pct =
      verdict && typeof score === "number" && hasCount && count >= STEAM_PCT_MIN_REVIEWS
        ? `${Math.round(score * 100)}%`
        : undefined;
    const rating = [verdict, pct].filter(Boolean).join(" ");
    return [rating, `스팀 인기 ${reason.ranking}위`].filter(Boolean);
  }
  const star =
    typeof score === "number" && score > 0 && hasCount && count >= EXTERNAL_RATING_MIN_VOTES
      ? `★ ${score.toFixed(1)}`
      : undefined;
  return [star, `이번 주 인기 ${reason.ranking}위`].filter((x): x is string => Boolean(x));
}

/** 큰 수는 만 단위 — 973066 → "97만", 41213 → "4.1만" */
export function compactCount(n: number): string {
  if (n < 10_000) return n.toLocaleString("ko-KR");
  const man = n / 10_000;
  return `${man >= 10 ? Math.round(man) : Math.round(man * 10) / 10}만`;
}

/**
 * 히어로 2줄(흐리게) — 연도 · 시즌/러닝타임 · 장르 2개 · 평가 수.
 * "2005 · 시즌 9 · 코미디 · 5,389명 평가" / "2020 · RPG · 액션 · 리뷰 97만개"
 */
export function featuredFactsLine(
  work: Pick<WorkSummary, "releaseDate" | "genres">,
  reason: FeaturedReason,
  facts?: { seasons?: number | null; runtimeMinutes?: number | null } | null,
): string {
  const parts: string[] = [];
  const year = work.releaseDate?.slice(0, 4);
  if (year && /^\d{4}$/.test(year)) parts.push(year);
  if (facts?.seasons) parts.push(`시즌 ${facts.seasons}`);
  if (facts?.runtimeMinutes) {
    const h = Math.floor(facts.runtimeMinutes / 60), m = facts.runtimeMinutes % 60;
    parts.push(h > 0 ? `${h}시간${m ? ` ${m}분` : ""}` : `${m}분`);
  }
  parts.push(...(work.genres ?? []).filter(Boolean).slice(0, 2));
  if (typeof reason.ratingCount === "number" && reason.ratingCount > 0) {
    parts.push(reason.platform === "Steam" ? `리뷰 ${compactCount(reason.ratingCount)}개` : `${compactCount(reason.ratingCount)}명 평가`);
  }
  return parts.join(" · ");
}

/** 히어로 제목 — 끝의 괄호 부제를 뗀다. "에이스 컴뱃 8: 시브의 날개 (ACE COMBAT 8: …)" → "에이스 컴뱃 8: 시브의 날개" */
export function heroTitle(title: string): string {
  const stripped = title.replace(/\s*[(（][^()（）]*[)）]\s*$/, "").trim();
  return stripped || title;
}

/** 대체(최신 출시) 부제 — "2026 출시". 우리 리뷰 평균은 쓰지 않는다. */
export function releaseSubline(work: Pick<WorkSummary, "releaseDate">): string | undefined {
  const year = work.releaseDate?.slice(0, 4);
  return year && /^\d{4}$/.test(year) ? `${year} 출시` : undefined;
}

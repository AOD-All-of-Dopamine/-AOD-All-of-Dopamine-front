import type { ExternalRanking } from "../api/rankingApi";
import type { NotableReason } from "../types";
import { compactCount as compact } from "./featured";
import { isSteamVerdict, steamReviewDescKo } from "./steam";
import { EXTERNAL_RATING_MIN_VOTES, STEAM_PCT_MIN_REVIEWS } from "./workSignal";

/**
 * 트렌드 (설계 docs/superpowers/specs/2026-10-04-trend-explore-design.md).
 * 순위 변동 · 주목 이유 · 순위 출처 문구 — 웹 · 앱이 같이 쓴다.
 */

/** 순위 플랫폼 → 분야 · 출처 문구 */
export const TREND_PLATFORMS = [
  { platform: "TMDB_MOVIE", domain: "MOVIE", label: "영화", source: "국내 OTT 인기" },
  { platform: "TMDB_TV", domain: "TV", label: "시리즈", source: "국내 OTT 인기" },
  { platform: "Steam", domain: "GAME", label: "게임", source: "스팀 최고 판매" },
  { platform: "NaverWebtoon", domain: "WEBTOON", label: "웹툰", source: "네이버웹툰 오늘 연재 인기" },
  { platform: "NaverSeries", domain: "WEBNOVEL", label: "웹소설", source: "네이버 시리즈 일간" },
] as const;

export type TrendPlatform = (typeof TREND_PLATFORMS)[number]["platform"];

export interface RankChange {
  kind: "up" | "down" | "same" | "new";
  /** 오르내린 칸 수 (up · down) */
  steps?: number;
  /** 화면에 보일 글 — "▲3" · "▼1" · "–" · "NEW" */
  text: string;
  /** 화면 읽기용 — "3계단 상승" */
  label: string;
}

/**
 * 순위 변동. 비교할 기록이 없으면(rankBaseDate 없음 · 옛 응답) null — 칸을 비운다.
 * 기준일 기록에 없으면 NEW.
 */
export function rankChange(row: Pick<ExternalRanking, "ranking" | "previousRanking" | "rankBaseDate">): RankChange | null {
  if (!row.rankBaseDate) return null;
  const prev = row.previousRanking;
  if (prev == null) return { kind: "new", text: "NEW", label: "새로 진입" };
  const diff = prev - row.ranking;
  if (diff > 0) return { kind: "up", steps: diff, text: `▲${diff}`, label: `${diff}계단 상승` };
  if (diff < 0) return { kind: "down", steps: -diff, text: `▼${-diff}`, label: `${-diff}계단 하락` };
  return { kind: "same", text: "–", label: "변동 없음" };
}

const SOURCE_SHORT: Record<string, string> = {
  TMDB_MOVIE: "OTT 인기",
  TMDB_TV: "OTT 인기",
  Steam: "스팀",
  NaverWebtoon: "네이버웹툰",
  NaverSeries: "시리즈",
};

/** 주목작 이유 한 줄 — "스팀 6위" · "28명 평가" · "리뷰 458개" · "10월 3일 시작" */
export function notableReasonText(reason: NotableReason): string {
  switch (reason.type) {
    case "RANK":
      return `${SOURCE_SHORT[reason.platform ?? ""] ?? "순위"} ${reason.value}위`;
    case "VOTES":
      return reason.value ? `${compact(reason.value)}명 평가` : "";
    case "REVIEWS":
      return reason.value ? `리뷰 ${compact(reason.value)}개` : "";
    case "LATEST": {
      const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(reason.date ?? "");
      return m ? `${Number(m[2])}월 ${Number(m[3])}일 시작` : "";
    }
    default:
      return "";
  }
}

/**
 * 순위 행 신호 한 줄 — 순위를 받을 때의 평가.
 * 게임 "매우 긍정적 94%" · 영화/시리즈 "★ 8.4" · 웹툰/웹소설은 평가가 수집되지 않아 "".
 * 적은 표본 규칙은 목록 카드와 같다(리뷰 10개 · 투표 20개).
 */
export function rankingSignal(row: Pick<ExternalRanking, "platform" | "ratingScore" | "ratingCount" | "ratingLabel">): string {
  const { ratingScore: score, ratingCount: count, ratingLabel: label } = row;
  const enough = (min: number) => typeof count === "number" && count >= min;
  if (row.platform === "Steam") {
    const verdict = label && isSteamVerdict(label) ? steamReviewDescKo(label) : "";
    const pct = verdict && typeof score === "number" && enough(STEAM_PCT_MIN_REVIEWS) ? ` ${Math.round(score * 100)}%` : "";
    return verdict + pct;
  }
  if (row.platform === "TMDB_MOVIE" || row.platform === "TMDB_TV") {
    return typeof score === "number" && score > 0 && enough(EXTERNAL_RATING_MIN_VOTES) ? `★ ${score.toFixed(1)}` : "";
  }
  return "";
}

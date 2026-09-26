import type { WorkSummary } from "../types";
import { WEEKDAY_KO } from "./domain";
import { PLATFORM_LABELS, watchPlatformLabels } from "./platforms";
import { isPositiveSteamVerdict, isSteamVerdict, steamReviewDescKo } from "./steam";

/**
 * 가벼운 카드(탐색)의 한 줄 신호와 **적은 표본 점수 숨김** 규칙 (설계 2026-09-26-explore-light-card).
 * 판단은 여기서 하고 웹 · 모바일은 그리기만 한다.
 */

/** TMDB 별점을 보여 줄 최소 투표 수 — 투표 1개로 ★10.0 이 뜨지 않게. */
export const EXTERNAL_RATING_MIN_VOTES = 20;
/** Steam 긍정 %를 보여 줄 최소 리뷰 수 — 리뷰 1개로 100% 가 뜨지 않게. */
export const STEAM_PCT_MIN_REVIEWS = 10;

/** 별점을 보여 줄지 — 수를 모르면 숨긴다(적은 표본을 가려내는 게 목적이라 모를 때 숨기는 쪽이 안전하다). */
export function showExternalRating(work: Pick<WorkSummary, "externalRating" | "externalVoteCount">): boolean {
  return (
    typeof work.externalRating === "number" &&
    work.externalRating > 0 &&
    typeof work.externalVoteCount === "number" &&
    work.externalVoteCount >= EXTERNAL_RATING_MIN_VOTES
  );
}

/** 긍정 %를 보여 줄지 — 9개 판정이 있고 리뷰가 충분할 때만. */
export function showSteamPct(
  work: Pick<WorkSummary, "steamReviewDesc" | "steamPositivePct" | "steamReviewCount">,
): boolean {
  return (
    typeof work.steamPositivePct === "number" &&
    isSteamVerdict(work.steamReviewDesc) &&
    typeof work.steamReviewCount === "number" &&
    work.steamReviewCount >= STEAM_PCT_MIN_REVIEWS
  );
}

/**
 * "12세이용가" → "12세". 전체이용가는 생략(undefined).
 * 웹소설 실데이터는 "15세 이용가"처럼 공백이 있어 비교 전에 흡수한다.
 */
export function ageLabel(ageRating?: string | null): string | undefined {
  const normalized = ageRating?.replace(/\s+/g, "");
  if (!normalized || normalized === "전체이용가") return undefined;
  return normalized.replace(/이용가$/, "");
}

const LABEL_ORDER = Object.values(PLATFORM_LABELS);
/** 볼 수 있는 곳 라벨 — PLATFORM_LABELS 순서(알려진 OTT 먼저), 모르는 이름은 뒤. */
export function orderedWatchLabels(platforms?: string[] | null): string[] {
  const rank = (label: string) => {
    const index = LABEL_ORDER.indexOf(label);
    return index === -1 ? Number.MAX_SAFE_INTEGER : index;
  };
  return watchPlatformLabels(platforms)
    .map((label, index) => ({ label, index }))
    .sort((a, b) => rank(a.label) - rank(b.label) || a.index - b.index)
    .map((entry) => entry.label);
}

export interface SignalPart {
  text: string;
  /** 굵게 · 진하게 (긍정 판정 · 연재 상태) */
  strong?: boolean;
}

export interface WorkLiteSignal {
  /** 왼쪽 조각 — 이을 때 " · " 를 넣는다. 한 줄 중점 1개 규칙상 최대 2조각. */
  left: SignalPart[];
  /** 오른쪽 끝 값 */
  right?: { kind: "pct" | "star" | "age"; text: string; srLabel: string };
}

/** 조각 원문에 든 "·" 를 공백으로 — 이을 때 넣는 중점만 남게(한 줄 중점 1개). */
const clean = (text?: string | null) => (text ?? "").replace(/[·•]/g, " ").replace(/\s+/g, " ").trim();

function year(work: Pick<WorkSummary, "releaseDate">): string | undefined {
  const value = work.releaseDate?.slice(0, 4);
  return value && /^\d{4}$/.test(value) ? value : undefined;
}

function isUpcoming(work: Pick<WorkSummary, "releaseDate">, today: Date): boolean {
  if (!work.releaseDate) return false;
  const release = new Date(`${work.releaseDate.slice(0, 10)}T00:00:00`);
  return !Number.isNaN(release.getTime()) && release.getTime() > today.getTime();
}

/**
 * 분야별 한 줄 신호 (설계 "신호 줄 규칙"):
 * - 게임: 판정이 있으면 [판정(긍정이면 strong), 연도] + 긍정 %(리뷰 10개 이상) · 없으면 [연도] · 출시 예정이면 ["출시 예정", 연도]
 * - 영화 · 시리즈: [연도, OTT 1개(+외 N)] + ★(투표 20개 이상)
 * - 웹툰: [작가, 요일웹툰|연재중|완결(strong)] + 연령
 * - 웹소설: [작가 또는 연도] + 연령
 */
export function workLiteSignal(work: WorkSummary, today: Date = new Date()): WorkLiteSignal {
  const left: SignalPart[] = [];
  const push = (text?: string | null, strong?: boolean) => {
    const value = clean(text);
    if (value) left.push(strong ? { text: value, strong } : { text: value });
  };
  switch (work.domain) {
    case "GAME": {
      if (isUpcoming(work, today)) {
        push("출시 예정");
        push(year(work));
        return { left };
      }
      if (isSteamVerdict(work.steamReviewDesc)) {
        push(steamReviewDescKo(work.steamReviewDesc as string), isPositiveSteamVerdict(work.steamReviewDesc));
      }
      push(year(work));
      return showSteamPct(work)
        ? { left, right: { kind: "pct", text: `${work.steamPositivePct}%`, srLabel: "긍정 평가" } }
        : { left };
    }
    case "MOVIE":
    case "TV": {
      push(year(work));
      const labels = orderedWatchLabels(work.platforms);
      if (labels.length > 0) push(labels.length > 1 ? `${labels[0]} 외 ${labels.length - 1}` : labels[0]);
      return showExternalRating(work)
        ? {
            left,
            right: { kind: "star", text: (work.externalRating as number).toFixed(1), srLabel: "평점" },
          }
        : { left };
    }
    case "WEBTOON": {
      push(work.creator);
      const weekday = work.weekday ? WEEKDAY_KO[work.weekday] : undefined;
      const status =
        work.status === "연재중" ? (weekday ? `${weekday}요웹툰` : "연재중") : work.status === "완결" ? "완결" : undefined;
      push(status, true);
      const age = ageLabel(work.ageRating);
      return age ? { left, right: { kind: "age", text: age, srLabel: "연령" } } : { left };
    }
    case "WEBNOVEL": {
      push(clean(work.creator) || year(work));
      const age = ageLabel(work.ageRating);
      return age ? { left, right: { kind: "age", text: age, srLabel: "연령" } } : { left };
    }
    default:
      push(year(work));
      return { left };
  }
}

/** 왼쪽 조각을 한 줄 문자열로 (테스트 · 접근성 이름). */
export function signalText(signal: WorkLiteSignal): string {
  return signal.left.map((part) => part.text).join(" · ");
}

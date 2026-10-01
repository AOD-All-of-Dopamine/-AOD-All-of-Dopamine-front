import type { RecTab, WorkSummary } from "../types";
import { DOMAIN_LABEL_MAP } from "./domain";
import { isPositiveSteamVerdict, isSteamVerdict, steamReviewDescKo } from "./steam";
import { isUpcomingRelease, releaseYear, showSteamPct } from "./workSignal";

/**
 * 홈 추천 카드 아래 줄 — **게임만** (게임 세로 표지 설계 2026-10-01, 시안 A).
 * 비게임은 null — 호출자는 지금 규칙(workCardMeta)을 그대로 쓴다.
 *
 * - 게임 탭: "**매우 긍정적 88%** · 2025" (판정 굵게 — 긍정일 때만, % 는 판정 · 리뷰 10개 이상)
 * - 전체 탭: "게임 · **매우 긍정적 88%**" — 섞인 줄이라 도메인을 남기고 연도를 뺀다(168px 에서 셋 다면 잘린다)
 * - 판정이 없으면 연도(출시 예정이면 "출시 예정")
 *
 * 조각 묶음(group)은 " · " 로, 묶음 안 조각은 띄어쓰기로 잇는다. 넘치면 줄 끝(연도 쪽)이 말줄임으로 잘린다.
 */
export interface RecMetaPart {
  text: string;
  strong?: boolean;
  /** 화면에는 안 보이고 스크린리더만 앞에 읽는 말 (예: "긍정 평가 ") */
  srPrefix?: string;
}

export type RecMetaGroup = RecMetaPart[];

export function recCardMeta(
  work: WorkSummary,
  tab: RecTab,
  today: Date = new Date(),
): RecMetaGroup[] | null {
  if (work.domain !== "GAME") return null;
  const groups: RecMetaGroup[] = [];
  const mixed = tab !== "game";
  if (mixed) groups.push([{ text: DOMAIN_LABEL_MAP.GAME ?? "게임" }]);

  let verdict: RecMetaGroup | undefined;
  if (isUpcomingRelease(work, today)) {
    verdict = [{ text: "출시 예정" }];
  } else if (isSteamVerdict(work.steamReviewDesc)) {
    const strong = isPositiveSteamVerdict(work.steamReviewDesc);
    verdict = [{ text: steamReviewDescKo(work.steamReviewDesc as string), strong }];
    if (showSteamPct(work)) verdict.push({ text: `${work.steamPositivePct}%`, strong, srPrefix: "긍정 평가 " });
  }
  if (verdict) groups.push(verdict);

  const year = releaseYear(work);
  // 연도: 게임 탭은 늘, 전체 탭은 판정이 없을 때만(그때는 자리가 남는다)
  if (year && (!mixed || !verdict)) groups.push([{ text: year }]);
  return groups.length > 0 ? groups : null;
}

/** 한 줄 문자열 (테스트 · 접근성 이름). */
export function recCardMetaText(groups: RecMetaGroup[]): string {
  return groups.map((g) => g.map((p) => `${p.srPrefix ?? ""}${p.text}`).join(" ")).join(" · ");
}

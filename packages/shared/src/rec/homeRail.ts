/**
 * 홈 추천 가로 줄의 위치 계산 (설계 2026-09-26-home-rec-only "화면 구성").
 * DOM 을 모르는 순수 함수 — 웹은 스크롤 · 크기 값을 재서 넘기고, 결과대로 그린다.
 */

/** 한 줄의 지금 모양. 폭은 모두 CSS px. */
export interface RailMetrics {
  scrollLeft: number;
  clientWidth: number;
  scrollWidth: number;
  /** 카드 한 장 폭(끝 카드도 같은 폭). */
  itemWidth: number;
  /** 카드 사이 간격. */
  gap: number;
  /** 작품 카드 수(닫힌 👎 자리는 빼고, 흐린 자리는 센다 — 화면에 있는 칸 수). */
  count: number;
  /** 줄 끝에 끝 카드가 있는지 — 쪽 막대에만 센다. */
  hasEndCard: boolean;
}

export interface RailWindow {
  /** 보이는 첫 카드 번호(1부터). 카드가 없으면 0. */
  first: number;
  /** 보이는 마지막 카드 번호. 끝 카드는 세지 않는다. */
  last: number;
  total: number;
  /** 쪽 막대 수(끝 카드 포함). */
  pages: number;
  /** 지금 쪽(0부터). */
  page: number;
}

/** 끝 · 처음 판정 오차 — 소수점 스크롤 · 스냅 반올림. */
export const RAIL_EDGE_TOLERANCE_PX = 4;

function perScreen(m: Pick<RailMetrics, "clientWidth" | "itemWidth" | "gap">): number {
  const step = m.itemWidth + m.gap;
  if (!(step > 0) || !(m.clientWidth > 0)) return 1;
  return Math.max(1, Math.floor((m.clientWidth + m.gap) / step));
}

function maxLeft(m: Pick<RailMetrics, "scrollWidth" | "clientWidth">): number {
  return Math.max(0, m.scrollWidth - m.clientWidth);
}

export function railWindow(m: RailMetrics): RailWindow {
  const total = Math.max(0, Math.floor(m.count));
  if (total === 0) return { first: 0, last: 0, total: 0, pages: 0, page: 0 };
  const step = m.itemWidth + m.gap;
  const per = perScreen(m);
  const slots = total + (m.hasEndCard ? 1 : 0);
  const pages = Math.max(1, Math.ceil(slots / per));
  const atEnd = m.scrollLeft >= maxLeft(m) - RAIL_EDGE_TOLERANCE_PX;
  // 첫 칸 = 오른쪽 끝이 화면 왼쪽 끝을 넘는 첫 카드 (간격에 걸친 위치면 다음 카드).
  const left = Math.max(0, m.scrollLeft) + RAIL_EDGE_TOLERANCE_PX;
  let firstIndex = step > 0 ? Math.floor(left / step) : 0;
  if (step > 0 && firstIndex * step + m.itemWidth <= left) firstIndex += 1;
  const first = Math.min(total, firstIndex + 1);
  const last = Math.min(total, firstIndex + per);
  const page = atEnd ? pages - 1 : Math.min(pages - 1, Math.round(Math.max(0, m.scrollLeft) / (per * step || 1)));
  return { first, last, total, pages, page };
}

/** 다음 화면 위치. 끝이면 처음(0)으로 — `wrapped` 면 즉시 옮긴다(부드럽게 되감으면 사이 카드가 노출로 쌓인다). */
export function railNextLeft(m: RailMetrics): { left: number; wrapped: boolean } {
  const max = maxLeft(m);
  if (m.scrollLeft >= max - RAIL_EDGE_TOLERANCE_PX) return { left: 0, wrapped: true };
  return { left: Math.min(max, m.scrollLeft + perScreen(m) * (m.itemWidth + m.gap)), wrapped: false };
}

/** 이전 화면 위치. 처음이면 끝으로. */
export function railPrevLeft(m: RailMetrics): { left: number; wrapped: boolean } {
  const max = maxLeft(m);
  if (m.scrollLeft <= RAIL_EDGE_TOLERANCE_PX) return { left: max, wrapped: true };
  return { left: Math.max(0, m.scrollLeft - perScreen(m) * (m.itemWidth + m.gap)), wrapped: false };
}

/** 위치 숫자 문구 — 한 장만 보이면 "7 / 30". */
export function railWindowLabel(w: RailWindow): string {
  if (w.total === 0) return "";
  return w.first === w.last ? `${w.last} / ${w.total}` : `${w.first}–${w.last} / ${w.total}`;
}

/**
 * 첫 요청에 저장된 체인을 실을지 (useRecChain).
 * 쪽을 합쳐 보이는 화면은 캐시가 없으면 싣지 않는다 — 앞쪽이 사라진 이어 보기는 말이 안 된다.
 * 마지막 묶음만 보이는 홈은 캐시가 없어도 싣는다 — 새로고침 뒤 1번째 묶음을 다시 보는 것보다 다음 묶음이 낫다.
 */
export function chainIdForFirstRequest(args: {
  storedChainId: string | null;
  hasCachedPages: boolean;
  continueWithoutCache: boolean;
}): string | null {
  if (args.hasCachedPages || args.continueWithoutCache) return args.storedChainId;
  return null;
}

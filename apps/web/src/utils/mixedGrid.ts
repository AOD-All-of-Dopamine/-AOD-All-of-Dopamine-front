/**
 * 검색 혼합 목록(전 도메인 섞임)의 1-C 렌더 시퀀스 파생 (mixed-grid-mockup.html).
 * 탐색 전체 탭 제거(2026-08-18) 후 검색 페이지 전용.
 * 서버 정렬 순서를 유지한 채 연속된 게임끼리 2개씩 페어링하고(비게임이 끼면
 * 그 지점에서 끊어 홀수 페어 허용), 나머지는 포스터 카드 그대로 흘려보낸다.
 * 페어는 그리드에서 2칸 스팬 셀(상하 스택)로, <lg에서는 풀폭 가로 행으로 렌더된다.
 */
export type MixedGridItem<T> =
  | { type: "poster"; work: T }
  | { type: "gamePair"; works: T[] };

export function groupMixedGrid<T extends { domain: string }>(
  works: T[],
): MixedGridItem<T>[] {
  const out: MixedGridItem<T>[] = [];
  let run: T[] = [];
  const flush = () => {
    if (run.length > 0) {
      out.push({ type: "gamePair", works: run });
      run = [];
    }
  };
  for (const work of works) {
    if (work.domain === "GAME") {
      run.push(work);
      if (run.length === 2) flush();
    } else {
      flush();
      out.push({ type: "poster", work });
    }
  }
  flush();
  return out;
}

/**
 * 게임 페어 셀 래퍼 클래스 - 소비처 그리드(gap-y 14px / 768px+ 20px)와 동일한
 * 내부 gap으로 행높이를 맞춘다. <lg: 풀폭 세로 나열(풀폭 가로 행 1개씩),
 * lg+: 2칸 스팬 + 2행 그리드(1개만 있으면 아래 행은 여백으로 남는다 - 1-C 규칙).
 */
export const gamePairCellClass =
  "col-span-full flex flex-col gap-3.5 min-[768px]:gap-5 lg:col-span-2 lg:grid lg:grid-rows-2";

/**
 * 혼합 목록(탐색 전체 탭·검색)의 FlatList 행 시퀀스 파생 - 웹 utils/mixedGrid.ts의
 * RN 대응. 웹은 CSS 그리드 스팬(게임 페어 셀)으로 풀지만, RN FlatList는 한 목록에서
 * numColumns를 아이템별로 섞을 수 없어 목록 자체를 "행" 단위로 재구성한다:
 * - mixed 모드의 게임 = 풀폭 컴팩트 가로 행 1개 (목업 1-C의 <lg·앱 규칙)
 * - 나머지 = 포스터 카드 2개씩 한 행. 게임이 끼면 그 지점에서 끊어 1개짜리 행을
 *   허용한다 (빈 자리는 소비처가 스페이서로 채워 카드 폭을 유지)
 * 서버 정렬 순서는 그대로 유지된다. mixed=false면 전 아이템을 2개씩 행으로만 묶는다
 * (도메인 단독 탭 - 기존 numColumns=2 그리드와 같은 시각).
 */
export type ListRow<T> =
  | { key: string; type: 'pair'; works: T[] }
  | { key: string; type: 'game'; work: T };

export function toListRows<T extends { id: number; domain: string }>(
  works: T[],
  mixed: boolean,
): ListRow<T>[] {
  const rows: ListRow<T>[] = [];
  let pending: T[] = [];
  const flush = () => {
    if (pending.length > 0) {
      rows.push({ key: `pair-${pending[0].id}`, type: 'pair', works: pending });
      pending = [];
    }
  };
  for (const work of works) {
    if (mixed && work.domain === 'GAME') {
      flush();
      rows.push({ key: `game-${work.id}`, type: 'game', work });
    } else {
      pending.push(work);
      if (pending.length === 2) flush();
    }
  }
  flush();
  return rows;
}

/**
 * 최종 모양을 그대로 따르는 스켈레톤 - 색은 토큰(line/canvas)만 사용,
 * animate-pulse로 로딩 표시.
 * - "portrait" = WorkCard (통일 2:3 썸네일 틀 - 도메인 무관)
 * - "row" = RankRow(feature) - 홈 인기 리스트용
 * - "panel-row" = RankRow(panel) 형상 (마지막 행 구분선 없음 - 랭킹 포디움
 *   제거 후 실사용처는 없고 dev 갤러리 전시만 남음)
 * - "lite-landscape" · "lite-portrait" = WorkLiteCard(탐색). 가로는 767px 이하에서 목록형으로 — 카드와 같은 CSS 반응형
 */
export interface SkeletonCardProps {
  variant: "portrait" | "row" | "panel-row" | "lite-landscape" | "lite-portrait";
}

const SkeletonCard = ({ variant }: SkeletonCardProps) => {
  if (variant === "lite-landscape") {
    return (
      <div aria-hidden="true" className="flex animate-pulse flex-col gap-2 max-[767px]:flex-row max-[767px]:items-center max-[767px]:gap-3">
        <div className="aspect-[460/215] rounded-panel bg-line max-[767px]:w-[132px] max-[767px]:flex-none max-[767px]:rounded-input" />
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div className="h-4 w-4/5 rounded-input bg-line" />
          <div className="h-3 w-3/5 rounded-input bg-canvas" />
        </div>
      </div>
    );
  }

  if (variant === "lite-portrait") {
    return (
      <div aria-hidden="true" className="flex animate-pulse flex-col gap-2">
        <div className="aspect-[2/3] rounded-panel bg-line" />
        <div className="h-4 w-4/5 rounded-input bg-line" />
        <div className="h-3 w-3/5 rounded-input bg-canvas" />
      </div>
    );
  }

  if (variant === "row") {
    return (
      <div
        aria-hidden="true"
        className="flex animate-pulse items-center gap-4 border-b border-line px-1 py-3"
      >
        <div className="h-6 w-[34px] flex-none rounded-input bg-line" />
        <div className="aspect-[2/3] w-11 flex-none rounded-input bg-line" />
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div className="h-4 w-3/5 rounded-input bg-line" />
          <div className="h-3 w-2/5 rounded-input bg-canvas" />
        </div>
      </div>
    );
  }

  if (variant === "panel-row") {
    return (
      <div
        aria-hidden="true"
        className="flex animate-pulse items-center gap-4 border-b border-line px-5 py-3 last:border-b-0"
      >
        <div className="h-5 w-[30px] flex-none rounded-input bg-line" />
        <div className="aspect-[2/3] w-[42px] flex-none rounded-input bg-line" />
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div className="h-4 w-3/5 rounded-input bg-line" />
          <div className="h-3 w-2/5 rounded-input bg-canvas" />
        </div>
      </div>
    );
  }

  return (
    <div
      aria-hidden="true"
      className="flex animate-pulse flex-col overflow-hidden rounded-panel border border-line bg-surface shadow-card"
    >
      <div className="aspect-[2/3] bg-line" />
      <div className="flex flex-1 flex-col gap-[7px] px-[15px] pb-[14px] pt-[13px]">
        <div className="h-4 w-4/5 rounded-input bg-line" />
        <div className="h-3 w-3/5 rounded-input bg-canvas" />
        <div className="mt-1 flex gap-[5px]">
          <div className="h-[18px] w-12 rounded-full bg-canvas" />
          <div className="h-[18px] w-14 rounded-full bg-canvas" />
        </div>
      </div>
    </div>
  );
};

export default SkeletonCard;

/**
 * 최종 모양을 그대로 따르는 스켈레톤 - 색은 토큰(line/canvas)만 사용,
 * animate-pulse로 로딩 표시.
 * - "portrait"/"landscape" = WorkCard
 * - "row" = RankRow(feature) - 홈 인기 리스트용
 * - "panel-row" = RankRow(panel) 형상 (마지막 행 구분선 없음 - 랭킹 포디움
 *   제거 후 실사용처는 없고 dev 갤러리 전시만 남음)
 * - "game-row" = GameCompactCard - 검색 혼합 목록 게임 가로 행용
 */
export interface SkeletonCardProps {
  variant: "portrait" | "landscape" | "row" | "panel-row" | "game-row";
}

const SkeletonCard = ({ variant }: SkeletonCardProps) => {
  if (variant === "game-row") {
    return (
      <div
        aria-hidden="true"
        className="flex animate-pulse flex-row overflow-hidden rounded-panel border border-line bg-surface shadow-card"
      >
        <div className="my-3 ml-3 w-[42%] flex-none self-center overflow-hidden rounded-input">
          <div className="aspect-[460/215] bg-line" />
        </div>
        <div className="flex min-w-0 flex-1 flex-col justify-center gap-1.5 px-[13px] py-[11px]">
          <div className="h-4 w-3/5 rounded-input bg-line" />
          <div className="h-3 w-2/5 rounded-input bg-canvas" />
          <div className="h-3 w-1/3 rounded-input bg-canvas" />
        </div>
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
      <div
        className={`bg-line ${
          variant === "landscape" ? "aspect-[460/215]" : "aspect-[2/3]"
        }`}
      />
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

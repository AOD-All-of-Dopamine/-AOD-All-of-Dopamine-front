/**
 * WorkCard(portrait/landscape) · RankRow(row) 최종 모양을 그대로 따르는 스켈레톤.
 * 색은 토큰(line/canvas)만 사용, animate-pulse로 로딩 표시.
 */
export interface SkeletonCardProps {
  variant: "portrait" | "landscape" | "row";
}

const SkeletonCard = ({ variant }: SkeletonCardProps) => {
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

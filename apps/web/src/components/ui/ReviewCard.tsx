import { ReactNode } from "react";
import { Star } from "@phosphor-icons/react";

/**
 * 목업 .review-card / .review-top / .avatar (work-detail-mockup.html)
 * 이니셜 아바타 + 이름 + 날짜 + 별점 헤더, 본문은 children.
 */
export interface ReviewCardProps {
  name: string;
  date: string;
  score: number;
  children: ReactNode;
}

const ReviewCard = ({ name, date, score, children }: ReviewCardProps) => {
  return (
    <article className="rounded-panel border border-line bg-surface px-5 py-[18px]">
      <div className="flex items-center gap-2.5">
        <span className="grid h-[34px] w-[34px] flex-none place-items-center rounded-full border border-line bg-canvas text-sm font-bold text-ink-2">
          {name.charAt(0)}
        </span>
        <span className="text-sm font-bold text-ink">{name}</span>
        <span className="text-[13px] text-ink-3">{date}</span>
        <span className="ml-auto inline-flex items-center gap-1 font-bold tabular-nums text-ink">
          <Star weight="fill" size={14} className="text-star" />
          {score.toFixed(1)}
        </span>
      </div>
      <p className="mt-2.5 text-[14.5px] text-ink-2">{children}</p>
    </article>
  );
};

export default ReviewCard;

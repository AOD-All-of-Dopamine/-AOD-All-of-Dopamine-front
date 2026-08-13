import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { cardBase, cardLift } from "./cardStyles";

/**
 * 목업 .pod-card / .pod-body (ranking-mockup.html) - 랭킹 톱3 카드.
 * 1위만 순위 숫자에 text-accent. 포디움 단차(2·3위 margin-top)는 페이지 레이아웃 책임.
 * to가 없으면 정적 div로 렌더하며 호버 리프트 등 인터랙티브 어포던스를 끈다.
 */
export interface PodiumCardProps {
  rank: 1 | 2 | 3;
  imageUrl: string;
  /** 제목이 인접 텍스트로 함께 렌더되므로 기본은 장식 이미지("") 취급 */
  imageAlt?: string;
  title: string;
  meta?: string;
  slot?: ReactNode;
  to?: string;
}

const PodiumCard = ({
  rank,
  imageUrl,
  imageAlt = "",
  title,
  meta,
  slot,
  to,
}: PodiumCardProps) => {
  const content = (
    <>
      <div className="aspect-[2/3] overflow-hidden bg-canvas">
        <img
          src={imageUrl}
          alt={imageAlt}
          loading="lazy"
          className="h-full w-full object-cover"
        />
      </div>
      <div className="flex items-center gap-3 px-4 py-[13px]">
        <span
          className={`text-[30px] font-extrabold leading-none tracking-[-0.04em] tabular-nums ${
            rank === 1 ? "text-accent" : "text-ink-3"
          }`}
        >
          {rank}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-[15.5px] font-bold text-ink">
            {title}
          </span>
          {meta && (
            <span className="mt-px block truncate text-[13px] text-ink-2">
              {meta}
            </span>
          )}
        </span>
        {slot && <span className="ml-auto flex-none">{slot}</span>}
      </div>
    </>
  );

  if (to) {
    return (
      <Link to={to} className={`block bg-surface ${cardLift}`}>
        {content}
      </Link>
    );
  }

  return <div className={`bg-surface ${cardBase}`}>{content}</div>;
};

export default PodiumCard;

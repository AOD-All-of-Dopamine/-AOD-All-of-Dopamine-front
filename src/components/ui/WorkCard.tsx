import { ReactNode } from "react";
import { Link } from "react-router-dom";
import Tag from "./Tag";
import { cardLift } from "./cardStyles";

/**
 * 목업 .card / .card-thumb / .card-body / .card-title / .card-meta / .card-tags / .card-foot
 * (explore-light-mockup.html) - 세로(portrait, 2/3) · 가로(landscape, 460/215) 두 비율 지원.
 */
export interface WorkCardProps {
  variant: "portrait" | "landscape";
  title: string;
  meta?: string;
  tags?: string[];
  /** 카드 하단 행 - 페이지마다 다른 내용(평점·리뷰율·요일 등)을 그대로 전달 */
  footer?: ReactNode;
  imageUrl: string;
  /** 제목이 인접 텍스트로 함께 렌더되므로 기본은 장식 이미지("") 취급 */
  imageAlt?: string;
  to: string;
}

const WorkCard = ({
  variant,
  title,
  meta,
  tags,
  footer,
  imageUrl,
  imageAlt = "",
  to,
}: WorkCardProps) => {
  return (
    <Link to={to} className={`flex flex-col bg-surface ${cardLift}`}>
      <div
        className={`overflow-hidden bg-canvas ${
          variant === "landscape" ? "aspect-[460/215]" : "aspect-[2/3]"
        }`}
      >
        <img
          src={imageUrl}
          alt={imageAlt}
          loading="lazy"
          className="h-full w-full object-cover"
        />
      </div>
      <div className="flex flex-1 flex-col gap-[7px] px-[15px] pb-[14px] pt-[13px]">
        <div className="truncate text-[15.5px] font-bold tracking-[-0.01em] text-ink">
          {title}
        </div>
        {meta && <div className="truncate text-[13px] text-ink-2">{meta}</div>}
        {tags && tags.length > 0 && (
          <div className="flex flex-wrap gap-[5px]">
            {tags.map((tag) => (
              <Tag key={tag}>{tag}</Tag>
            ))}
          </div>
        )}
        {footer && (
          <div className="mt-auto flex items-center gap-[7px] border-t border-line pt-[9px] text-[12.5px] text-ink-2 tabular-nums">
            {footer}
          </div>
        )}
      </div>
    </Link>
  );
};

export default WorkCard;

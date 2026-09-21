import { ReactNode } from "react";
import { Link } from "react-router-dom";
import Tag from "./Tag";
import WorkThumb from "./WorkThumb";
import { cardLift } from "./cardStyles";

/**
 * 목업 .card / .card-thumb / .card-body / .card-title / .card-meta / .card-tags / .card-foot
 * (explore-light-mockup.html). 카드 크기·썸네일 틀(2:3)은 모든 도메인에서 같고,
 * 틀 안의 이미지 맞춤만 도메인이 정한다 (WorkThumb).
 */
export interface WorkCardProps {
  title: string;
  meta?: string;
  tags?: string[];
  /** 카드 하단 행 - 페이지마다 다른 내용(평점·리뷰율·요일 등)을 그대로 전달 */
  footer?: ReactNode;
  /** null이면 도메인 폴백 아이콘을 중앙 표시 (실데이터 썸네일 누락 대응) */
  imageUrl: string | null;
  /** 제목이 인접 텍스트로 함께 렌더되므로 기본은 장식 이미지("") 취급 */
  imageAlt?: string;
  /** 백엔드 도메인 문자열 - 썸네일 맞춤 방식과 폴백 아이콘을 정한다 */
  domain?: string;
  to: string;
}

const WorkCard = ({
  title,
  meta,
  tags,
  footer,
  imageUrl,
  imageAlt = "",
  domain,
  to,
}: WorkCardProps) => {
  return (
    <Link to={to} className={`flex flex-col bg-surface ${cardLift}`}>
      <WorkThumb imageUrl={imageUrl} domain={domain} alt={imageAlt} />
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

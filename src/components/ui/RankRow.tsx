import { ReactNode } from "react";
import { Link } from "react-router-dom";

/**
 * 랭킹 리스트 행. variant "panel"(기본) = ranking-mockup .rrow 수치(카드 안에 담기는
 * 리스트, 마지막 행 구분선 없음). variant "feature" = home-mockup .rank 수치(카드 없이
 * 바로 놓이는 리스트, 모든 행에 구분선). accent가 true면 순위 숫자를 text-accent로
 * 강조(feature에서 홈 페이지 1·2위 표시용). to를 넘기면 Link, 아니면 정적 div로
 * 렌더하며 정적 렌더에서는 호버 시 제목 색 전환 등 인터랙티브 어포던스를 끈다.
 */
export interface RankRowProps {
  no: number;
  imageUrl: string;
  /** 제목이 인접 텍스트로 함께 렌더되므로 기본은 장식 이미지("") 취급 */
  imageAlt?: string;
  title: string;
  meta?: string;
  slot?: ReactNode;
  to?: string;
  variant?: "panel" | "feature";
  accent?: boolean;
}

const RankRow = ({
  no,
  imageUrl,
  imageAlt = "",
  title,
  meta,
  slot,
  to,
  variant = "panel",
  accent = false,
}: RankRowProps) => {
  const isFeature = variant === "feature";

  const rowLayout = isFeature
    ? "flex items-center gap-4 border-b border-line px-1 py-[13px]"
    : "flex items-center gap-4 border-b border-line px-5 py-3 last:border-b-0";

  const noClassName = isFeature
    ? `w-[34px] flex-none text-2xl font-extrabold tracking-[-0.03em] tabular-nums ${
        accent ? "text-accent" : "text-ink-3"
      }`
    : "w-[30px] flex-none text-lg font-extrabold tabular-nums text-ink-3";

  const thumbClassName = isFeature
    ? "aspect-[2/3] w-11 flex-none overflow-hidden rounded-input bg-canvas"
    : "aspect-[2/3] w-[42px] flex-none overflow-hidden rounded-input bg-canvas";

  const content = (
    <>
      <span className={noClassName}>{no}</span>
      <div className={thumbClassName}>
        <img
          src={imageUrl}
          alt={imageAlt}
          loading="lazy"
          className="h-full w-full object-cover"
        />
      </div>
      <span className="min-w-0 flex-1">
        <span
          className={`block truncate text-[15px] font-bold text-ink${
            to ? " transition-colors group-hover:text-accent-ink" : ""
          }`}
        >
          {title}
        </span>
        {meta && (
          <span className="mt-px block truncate text-[13px] text-ink-2">
            {meta}
          </span>
        )}
      </span>
      {slot && <span className="ml-auto flex-none">{slot}</span>}
    </>
  );

  if (to) {
    return (
      <Link to={to} className={`group ${rowLayout}`}>
        {content}
      </Link>
    );
  }

  return <div className={rowLayout}>{content}</div>;
};

export default RankRow;

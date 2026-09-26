import { Link } from "react-router-dom";
import { Star } from "@phosphor-icons/react";
import { workLiteSignal } from "@aod/shared/constants";
import type { WorkSummary } from "@aod/shared/types";
import { categoryOf, thumbShapeMap } from "../../constants/thumbnail";
import WorkThumb from "./WorkThumb";

export interface WorkLiteCardProps {
  work: WorkSummary;
  to: string;
}

/**
 * 가벼운 카드 — 그림 + 제목 한 줄 + 신호 한 줄 (탐색, 설계 2026-09-26-explore-light-card).
 * 상자(테두리 · 그림자 · 떠오름 · 구분선) 없이 그림만 둥글다. 장르 · 개발사 · 감독은 뺐다(필터 · 상세에 있다).
 * 모양은 도메인으로 정한다(thumbShapeMap) — 게임은 가로(460:215), 767px 이하에서는 **CSS 만으로** 목록형(그림 132px + 글)이 된다
 * (prop 으로 바꾸면 첫 화면에서 튄다). 그 밖은 세로 2:3.
 */
const WorkLiteCard = ({ work, to }: WorkLiteCardProps) => {
  const landscape = thumbShapeMap[categoryOf(work.domain)] === "landscape";
  const signal = workLiteSignal(work);

  return (
    <Link
      to={to}
      className={`group flex min-w-0 flex-col gap-2 rounded-panel ${
        landscape ? "max-[767px]:flex-row max-[767px]:items-center max-[767px]:gap-3" : ""
      }`}
    >
      <WorkThumb
        imageUrl={work.thumbnail}
        domain={work.domain}
        shape={landscape ? "landscape" : "portrait"}
        className={`rounded-panel transition-[filter] duration-150 group-hover:brightness-95 motion-reduce:transition-none ${
          landscape ? "max-[767px]:w-[132px] max-[767px]:flex-none max-[767px]:rounded-input" : ""
        }`}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span title={work.title} className="truncate text-[14.5px] font-semibold text-ink">
          {work.title}
        </span>
        {/* 값이 없어도 줄 높이는 지킨다 — 스켈레톤에서 바뀔 때 튀지 않게 */}
        <span className="flex min-h-[18px] items-center gap-2 text-[12.5px] text-ink-2">
          <span className="min-w-0 truncate">
            {signal.left.map((part, index) => (
              <span key={index}>
                {index > 0 && " · "}
                <span className={part.strong ? "font-semibold text-ink" : undefined}>{part.text}</span>
              </span>
            ))}
          </span>
          {signal.right && (
            <span className="ml-auto inline-flex flex-none items-center gap-1 font-semibold tabular-nums text-ink">
              <span className="sr-only">{signal.right.srLabel}</span>
              {signal.right.kind === "star" && (
                <Star weight="fill" size={12} className="text-star" aria-hidden="true" />
              )}
              {signal.right.text}
            </span>
          )}
        </span>
      </div>
    </Link>
  );
};

export default WorkLiteCard;

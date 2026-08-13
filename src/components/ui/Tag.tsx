import { ReactNode } from "react";

/**
 * 작은 정적 라벨 태그.
 * - variant "canvas"(기본) = explore-light-mockup .tag(11.5px, bg-canvas)
 * - variant "surface" = work-detail-mockup .tag(12px, bg-surface, 상세 장르 태그)
 * - variant "accent" = work-detail-mockup .domain-chip(12.5px, accent-tint, 도메인 칩)
 */
export interface TagProps {
  children: ReactNode;
  variant?: "canvas" | "surface" | "accent";
}

const VARIANT_CLASS: Record<NonNullable<TagProps["variant"]>, string> = {
  canvas:
    "border border-line bg-canvas px-2.5 py-[2.5px] text-[11.5px] font-semibold text-ink-2",
  surface:
    "border border-line bg-surface px-[11px] py-[3.5px] text-xs font-semibold text-ink-2",
  accent:
    "bg-accent-tint px-3 py-[3px] text-[12.5px] font-bold text-accent-ink",
};

const Tag = ({ children, variant = "canvas" }: TagProps) => {
  return (
    <span className={`rounded-full ${VARIANT_CLASS[variant]}`}>{children}</span>
  );
};

export default Tag;

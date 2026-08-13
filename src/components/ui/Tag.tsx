import { ReactNode } from "react";

/**
 * 작은 장르 태그. variant "canvas"(기본) = explore-light-mockup .tag(11.5px, bg-canvas),
 * variant "surface" = work-detail-mockup .tag(12px, bg-surface, 상세 페이지용).
 */
export interface TagProps {
  children: ReactNode;
  variant?: "canvas" | "surface";
}

const Tag = ({ children, variant = "canvas" }: TagProps) => {
  return (
    <span
      className={`rounded-full border border-line font-semibold text-ink-2 ${
        variant === "surface"
          ? "bg-surface px-[11px] py-[3.5px] text-xs"
          : "bg-canvas px-2.5 py-[2.5px] text-[11.5px]"
      }`}
    >
      {children}
    </span>
  );
};

export default Tag;

import { ReactNode } from "react";

/** 목업 .dday / .dday.tba (home-light-mockup.html) - D-day 필 */
export interface DdayPillProps {
  children: ReactNode;
  variant?: "default" | "tba";
}

const DdayPill = ({ children, variant = "default" }: DdayPillProps) => {
  return (
    <span
      className={`flex-none rounded-full px-[11px] py-[5px] text-[12.5px] font-extrabold tabular-nums ${
        variant === "tba"
          ? "border border-line bg-canvas text-ink-2"
          : "bg-accent-tint text-accent-ink"
      }`}
    >
      {children}
    </span>
  );
};

export default DdayPill;

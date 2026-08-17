import { ReactNode } from "react";

/** 목업 .stat (work-detail-mockup.html) - 통계 필 */
export interface StatPillProps {
  icon: ReactNode;
  children: ReactNode;
}

const StatPill = ({ icon, children }: StatPillProps) => {
  return (
    <span className="inline-flex items-center gap-[7px] rounded-input border border-line bg-surface px-[14px] py-[9px] text-sm font-semibold tabular-nums text-ink">
      {icon}
      {children}
    </span>
  );
};

export default StatPill;

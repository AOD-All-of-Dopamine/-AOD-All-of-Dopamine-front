import { ReactNode } from "react";

/** "준비 중" 표기 pill. DomainChip · FilterGroup 공유. */
export interface SoonBadgeProps {
  children: ReactNode;
  className?: string;
}

const SoonBadge = ({ children, className }: SoonBadgeProps) => {
  return (
    <span
      className={`rounded-full border border-line px-[7px] py-px text-[11px] font-semibold text-ink-3${
        className ? ` ${className}` : ""
      }`}
    >
      {children}
    </span>
  );
};

export default SoonBadge;

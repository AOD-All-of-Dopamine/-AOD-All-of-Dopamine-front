import { ReactNode } from "react";
import SoonBadge from "./SoonBadge";

/**
 * 1차 선택 칩. 활성 = bg-ink text-surface, 비활성 = surface + border.
 * size "md"(기본) = ranking-mockup .dchip(8px 16px), size "lg" = explore-light-mockup
 * .domain-tab(9px 18px), size "sm" = ranking-mockup .pchip(6px 14px, 13px - 플랫폼 칩).
 */
export interface DomainChipProps {
  children: ReactNode;
  active?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  /** 준비 중 표기(예: "준비 중") - disabled와 함께 사용 */
  soonLabel?: string;
  size?: "sm" | "md" | "lg";
}

const SIZE_CLASS: Record<NonNullable<DomainChipProps["size"]>, string> = {
  sm: "px-3.5 py-1.5 text-[13px]",
  md: "px-4 py-2 text-sm",
  lg: "px-[18px] py-[9px] text-sm",
};

const DomainChip = ({
  children,
  active = false,
  onClick,
  disabled = false,
  soonLabel,
  size = "md",
}: DomainChipProps) => {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={`inline-flex items-center gap-1.5 rounded-full border font-semibold transition-colors active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 ${
        SIZE_CLASS[size]
      } ${
        active
          ? "border-ink bg-ink text-surface"
          : "border-line bg-surface text-ink-2 hover:border-line-strong hover:text-ink"
      }`}
    >
      {children}
      {soonLabel && <SoonBadge>{soonLabel}</SoonBadge>}
    </button>
  );
};

export default DomainChip;

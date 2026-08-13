import { ReactNode } from "react";
import SoonBadge from "./SoonBadge";

/**
 * 1차 선택 칩. 활성 = bg-ink text-surface, 비활성 = surface + border.
 * size "md"(기본) = ranking-mockup .dchip(8px 16px), size "lg" = explore-light-mockup
 * .domain-tab(9px 18px).
 */
export interface DomainChipProps {
  children: ReactNode;
  active?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  /** 준비 중 표기(예: "준비 중") - disabled와 함께 사용 */
  soonLabel?: string;
  size?: "md" | "lg";
}

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
      className={`inline-flex items-center gap-1.5 rounded-full border text-sm font-semibold transition-colors active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 ${
        size === "lg" ? "px-[18px] py-[9px]" : "px-4 py-2"
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

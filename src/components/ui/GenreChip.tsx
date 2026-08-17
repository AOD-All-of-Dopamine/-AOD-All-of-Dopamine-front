import { ReactNode } from "react";

/**
 * 목업 .gchip (ranking-mockup.html) - 2차 선택 칩. 활성 = bg-accent-tint text-accent-ink.
 */
export interface GenreChipProps {
  children: ReactNode;
  active?: boolean;
  onClick?: () => void;
}

const GenreChip = ({ children, active = false, onClick }: GenreChipProps) => {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`whitespace-nowrap rounded-full border px-[14px] py-[6px] text-[13px] font-semibold transition-colors active:scale-[0.98] ${
        active
          ? "border-transparent bg-accent-tint text-accent-ink"
          : "border-line bg-surface text-ink-2 hover:border-line-strong hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
};

export default GenreChip;

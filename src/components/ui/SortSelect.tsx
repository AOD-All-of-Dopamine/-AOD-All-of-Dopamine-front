import { CaretDown } from "@phosphor-icons/react";

/**
 * 목업 .sort (explore-light-mockup.html) - 배경 SVG 캐럿은 hex를 포함하므로 금지,
 * 대신 Phosphor CaretDown을 절대위치로 겹쳐 표시.
 */
export interface SortOption {
  value: string;
  label: string;
}

export interface SortSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SortOption[];
  ariaLabel?: string;
}

const SortSelect = ({
  value,
  onChange,
  options,
  ariaLabel = "정렬",
}: SortSelectProps) => {
  return (
    <div className="relative inline-block">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={ariaLabel}
        className="appearance-none rounded-input border border-line bg-surface py-[9px] pl-[14px] pr-9 text-sm font-medium text-ink transition-colors hover:border-line-strong"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <CaretDown
        size={12}
        weight="bold"
        className="pointer-events-none absolute right-[13px] top-1/2 -translate-y-1/2 text-ink-2"
      />
    </div>
  );
};

export default SortSelect;

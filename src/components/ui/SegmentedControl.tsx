/** 목업 .segmented / .seg-btn (ranking-mockup.html) - pill 세그먼트 컨트롤 */
export interface SegmentedControlOption {
  value: string;
  label: string;
}

export interface SegmentedControlProps {
  options: SegmentedControlOption[];
  value: string;
  onChange: (value: string) => void;
  size?: "md" | "sm";
  /** role="group"에 붙는 접근성 이름(예: "기간 선택") */
  ariaLabel?: string;
}

const SegmentedControl = ({
  options,
  value,
  onChange,
  size = "md",
  ariaLabel,
}: SegmentedControlProps) => {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="inline-flex rounded-full border border-line bg-surface p-1"
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={`rounded-full font-semibold transition-colors active:scale-[0.98] ${
              size === "sm" ? "px-[13px] py-[5px] text-[13px]" : "px-4 py-[7px] text-sm"
            } ${active ? "bg-ink text-surface" : "text-ink-2"}`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
};

export default SegmentedControl;

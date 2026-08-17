import { X } from "@phosphor-icons/react";

/** 목업 .chip (explore-light-mockup.html) - 제거 가능한 활성 필터 칩 */
export interface ChipProps {
  label: string;
  onRemove: () => void;
}

const Chip = ({ label, onRemove }: ChipProps) => {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-tint py-1.5 pl-[13px] pr-2 text-[13.5px] font-semibold text-accent-ink">
      {label}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`${label} 필터 해제`}
        className="grid h-[18px] w-[18px] place-items-center rounded-full text-accent-ink transition-colors hover:bg-accent-ink/15 active:scale-[0.98]"
      >
        <X size={12} weight="bold" />
      </button>
    </span>
  );
};

export default Chip;

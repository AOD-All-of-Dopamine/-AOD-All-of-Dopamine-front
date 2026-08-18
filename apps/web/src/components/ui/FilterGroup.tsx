import { useId, type ReactNode } from "react";
import SoonBadge from "./SoonBadge";

/** 목업 .filter-group / .filter-item / .soon (explore-light-mockup.html) */
export interface FilterOption {
  value: string;
  label: string;
  /** 라벨 옆 작품 수 표기 (장르 축 - genres-with-count) */
  count?: number;
  disabled?: boolean;
  soonLabel?: string;
}

export type FilterGroupProps =
  | {
      title: ReactNode;
      type: "checkbox";
      options: FilterOption[];
      values: string[];
      onChange: (values: string[]) => void;
      /** 목록 아래 부가 요소 (예: 장르 더 보기/접기 토글) */
      footer?: ReactNode;
    }
  | {
      title: ReactNode;
      type: "radio";
      options: FilterOption[];
      value: string;
      onChange: (value: string) => void;
      /** 목록 아래 부가 요소 (예: 장르 더 보기/접기 토글) */
      footer?: ReactNode;
    };

const FilterGroup = (props: FilterGroupProps) => {
  const { title, type, options, footer } = props;
  const name = useId();

  const isChecked = (value: string) =>
    type === "checkbox" ? props.values.includes(value) : props.value === value;

  const handleChange = (value: string) => {
    if (type === "checkbox") {
      const next = props.values.includes(value)
        ? props.values.filter((v) => v !== value)
        : [...props.values, value];
      props.onChange(next);
    } else {
      props.onChange(value);
    }
  };

  return (
    <div className="border-t border-line px-0.5 py-4">
      <h3 className="mb-2.5 text-[13.5px] font-bold text-ink">{title}</h3>
      <div className="flex flex-col gap-0.5">
        {options.map((option) => {
          const checked = isChecked(option.value);
          return (
            <label
              key={option.value}
              className={`-mx-1.5 flex items-center gap-2.5 rounded-input px-1.5 py-[5px] text-sm text-ink-2 transition-colors ${
                option.disabled
                  ? "cursor-not-allowed opacity-45"
                  : "cursor-pointer hover:bg-ink/5 hover:text-ink"
              }`}
            >
              <input
                type={type}
                name={type === "radio" ? name : undefined}
                checked={checked}
                disabled={option.disabled}
                onChange={() => handleChange(option.value)}
                className="h-[15px] w-[15px] accent-accent"
              />
              <span className={checked ? "font-semibold text-ink" : ""}>
                {option.label}
              </span>
              {option.count !== undefined && (
                <span className="text-xs tabular-nums text-ink-3">
                  {option.count.toLocaleString()}
                </span>
              )}
              {option.soonLabel && (
                <SoonBadge className="ml-auto">{option.soonLabel}</SoonBadge>
              )}
            </label>
          );
        })}
      </div>
      {footer}
    </div>
  );
};

export default FilterGroup;

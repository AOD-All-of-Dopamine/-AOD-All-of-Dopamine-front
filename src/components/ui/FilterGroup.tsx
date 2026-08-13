import { useId } from "react";
import SoonBadge from "./SoonBadge";

/** 목업 .filter-group / .filter-item / .soon (explore-light-mockup.html) */
export interface FilterOption {
  value: string;
  label: string;
  disabled?: boolean;
  soonLabel?: string;
}

export type FilterGroupProps =
  | {
      title: string;
      type: "checkbox";
      options: FilterOption[];
      values: string[];
      onChange: (values: string[]) => void;
    }
  | {
      title: string;
      type: "radio";
      options: FilterOption[];
      value: string;
      onChange: (value: string) => void;
    };

const FilterGroup = (props: FilterGroupProps) => {
  const { title, type, options } = props;
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
              {option.soonLabel && (
                <SoonBadge className="ml-auto">{option.soonLabel}</SoonBadge>
              )}
            </label>
          );
        })}
      </div>
    </div>
  );
};

export default FilterGroup;

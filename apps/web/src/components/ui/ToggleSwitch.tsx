/**
 * 온/오프 스위치 (mixed-grid-mockup.html .switch 수치) - 36x21 트랙 + 16px 노브.
 * on = accent-ink 트랙, off = line-strong 트랙. 라벨은 소비처가 옆에 배치한다.
 */
export interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  "aria-label"?: string;
}

const ToggleSwitch = ({
  checked,
  onChange,
  disabled = false,
  "aria-label": ariaLabel,
}: ToggleSwitchProps) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={ariaLabel}
    disabled={disabled}
    onClick={() => onChange(!checked)}
    className={`relative h-[21px] w-9 flex-none rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${
      checked ? "bg-accent-ink" : "bg-line-strong"
    }`}
  >
    <span
      aria-hidden="true"
      className={`absolute left-[2.5px] top-[2.5px] h-4 w-4 rounded-full bg-surface transition-transform motion-reduce:transition-none ${
        checked ? "translate-x-[15px]" : ""
      }`}
    />
  </button>
);

export default ToggleSwitch;

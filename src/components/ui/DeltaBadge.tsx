/**
 * 목업 deltaHTML() (ranking-mockup.html) - 순위 변동 뱃지.
 *
 * 입력 계약: delta는 "+n" | "-n" | "0" | "new" 형태의 문자열.
 * - "+n" → ▲ n (accent-ink) / "-n" → ▼ n (ink-3)
 * - "0" → - (ink-3) / "new"(대소문자 무관) → NEW (accent-tint pill)
 * - 부호 없는 숫자 문자열("3" 등)은 상승("+n")과 동일하게 처리한다.
 */
export interface DeltaBadgeProps {
  /** "+n" | "-n" | "0" | "new" (부호 없는 숫자는 상승 취급) */
  delta: "0" | "new" | (string & {});
}

const DeltaBadge = ({ delta }: DeltaBadgeProps) => {
  if (delta.toLowerCase() === "new") {
    return (
      <span className="whitespace-nowrap rounded-full bg-accent-tint px-[9px] py-[3px] text-[12.5px] font-bold tabular-nums text-accent-ink">
        NEW
      </span>
    );
  }

  if (delta === "0") {
    return (
      <span className="whitespace-nowrap text-[12.5px] font-bold tabular-nums text-ink-3">
        -
      </span>
    );
  }

  const isUp = !delta.startsWith("-");
  const value = delta.replace(/^[+-]/, "");

  return (
    <span
      className={`whitespace-nowrap text-[12.5px] font-bold tabular-nums ${
        isUp ? "text-accent-ink" : "text-ink-3"
      }`}
    >
      {isUp ? "▲" : "▼"} {value}
    </span>
  );
};

export default DeltaBadge;

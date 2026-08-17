import { CollectionTint } from "@aod/shared/api";
import {
  COLLECTION_TINTS,
  COLLECTION_TINT_BG,
  COLLECTION_TINT_LABEL,
} from "@aod/shared/constants";

/**
 * 커버 틴트 6종 선택 (목업 .tint-row / .m-tint-row).
 * 선택 상태 = ink 테두리 + 안쪽 surface 링 (목업 .tint.sel의 inset 섀도 등가).
 * 틴트는 콘텐츠 색 토큰(bg-tint-*)만 사용 - UI 액센트 규율과 분리.
 */
export interface TintPickerProps {
  value: CollectionTint;
  onChange: (tint: CollectionTint) => void;
  /** md = 데스크톱 34px, sm = 모바일 30px (목업 수치) */
  size?: "md" | "sm";
  className?: string;
}

const TintPicker = ({
  value,
  onChange,
  size = "md",
  className = "",
}: TintPickerProps) => {
  const sizeClass = size === "sm" ? "h-[30px] w-[30px]" : "h-[34px] w-[34px]";
  return (
    <div
      role="radiogroup"
      aria-label="커버 틴트"
      className={`flex gap-2.5 ${className}`}
    >
      {COLLECTION_TINTS.map((tint) => {
        const selected = tint === value;
        return (
          <button
            key={tint}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={COLLECTION_TINT_LABEL[tint]}
            onClick={() => onChange(tint)}
            className={`${sizeClass} rounded-full border-2 transition-transform active:scale-95 ${
              COLLECTION_TINT_BG[tint]
            } ${
              selected
                ? "border-ink ring-2 ring-inset ring-surface"
                : "border-transparent"
            }`}
          />
        );
      })}
    </div>
  );
};

export default TintPicker;

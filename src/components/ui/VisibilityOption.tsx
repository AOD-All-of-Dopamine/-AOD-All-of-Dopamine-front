import { ReactNode } from "react";

/**
 * 공개 설정 옵션 버튼 (목업 .vis-opt) - 컬렉션 생성/편집 공용.
 * 활성 = accent-ink 테두리 + accent-tint 배경 (목업 .vis-opt.on).
 * 부모에 role="radiogroup"을 두고 2개(공개/나만 보기)를 나란히 배치한다.
 */
export interface VisibilityOptionProps {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  label: string;
}

const VisibilityOption = ({
  active,
  onClick,
  icon,
  label,
}: VisibilityOptionProps) => (
  <button
    type="button"
    role="radio"
    aria-checked={active}
    onClick={onClick}
    className={`flex flex-1 items-center gap-2 rounded-input border px-3 py-2.5 text-[13.5px] transition-colors ${
      active
        ? "border-accent-ink bg-accent-tint font-bold text-accent-ink"
        : "border-line text-ink-2 hover:border-line-strong"
    }`}
  >
    {icon}
    {label}
  </button>
);

export default VisibilityOption;

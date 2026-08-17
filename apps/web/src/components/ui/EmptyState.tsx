import { ReactNode } from "react";
import { Ghost } from "@phosphor-icons/react";

/**
 * 빈 상태 (dashed border).
 * - variant "default" = explore-light-mockup .empty (아이콘 + 88px 패딩)
 * - variant "note" = new-releases-mockup .empty-note (아이콘 없음, 48px 패딩,
 *   보조 텍스트 톤 - 섹션 단위의 가벼운 0건 안내용)
 */
export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  variant?: "default" | "note";
}

const EmptyState = ({
  icon,
  title,
  description,
  action,
  variant = "default",
}: EmptyStateProps) => {
  if (variant === "note") {
    return (
      <div className="rounded-panel border border-dashed border-line-strong bg-surface p-12 text-center">
        <p className="text-[15px] text-ink-2">{title}</p>
        {description && (
          <p className="mt-1 text-[13px] text-ink-3">{description}</p>
        )}
        {action && <div className="mt-4">{action}</div>}
      </div>
    );
  }

  return (
    <div className="rounded-panel border border-dashed border-line-strong bg-surface px-6 py-[88px] text-center">
      <div className="flex justify-center text-ink-3">
        {icon ?? <Ghost size={44} />}
      </div>
      <p className="mt-3.5 text-base font-semibold text-ink">{title}</p>
      {description && (
        <p className="mt-1.5 text-[13px] text-ink-2">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
};

export default EmptyState;

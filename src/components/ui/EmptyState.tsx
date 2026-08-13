import { ReactNode } from "react";
import { Ghost } from "@phosphor-icons/react";

/** 목업 .empty (explore-light-mockup.html) - 빈 상태 (dashed border) */
export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

const EmptyState = ({ icon, title, description, action }: EmptyStateProps) => {
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

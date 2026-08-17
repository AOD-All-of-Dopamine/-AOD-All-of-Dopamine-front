import { CaretLeft, CaretRight } from "@phosphor-icons/react";

/** 목업 .pagination / .page-btn / .page-ellipsis (explore-light-mockup.html) */
export interface PaginationProps {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}

type PageItem = number | "ellipsis-start" | "ellipsis-end";

function getPageItems(page: number, totalPages: number): PageItem[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const items = new Set<number>([
    1,
    2,
    totalPages - 1,
    totalPages,
    page - 1,
    page,
    page + 1,
  ]);
  const sorted = [...items]
    .filter((n) => n >= 1 && n <= totalPages)
    .sort((a, b) => a - b);

  const result: PageItem[] = [];
  let prev = 0;
  for (const n of sorted) {
    if (prev && n - prev > 1) {
      result.push(prev < page ? "ellipsis-start" : "ellipsis-end");
    }
    result.push(n);
    prev = n;
  }
  return result;
}

const Pagination = ({ page, totalPages, onChange }: PaginationProps) => {
  const items = getPageItems(page, totalPages);
  const baseBtn =
    "grid h-[38px] min-w-[38px] place-items-center rounded-input px-1.5 text-sm font-medium tabular-nums text-ink-2 transition-colors active:scale-[0.98] disabled:cursor-default disabled:opacity-35";
  const idleBtn = `${baseBtn} enabled:hover:bg-ink/5 enabled:hover:text-ink`;

  return (
    <nav aria-label="페이지" className="flex justify-center gap-[5px]">
      <button
        type="button"
        className={idleBtn}
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        aria-label="이전 페이지"
      >
        <CaretLeft size={14} />
      </button>
      {items.map((item) =>
        typeof item === "number" ? (
          <button
            key={item}
            type="button"
            aria-current={item === page ? "page" : undefined}
            onClick={() => onChange(item)}
            className={
              item === page ? `${baseBtn} bg-ink font-bold text-surface` : idleBtn
            }
          >
            {item}
          </button>
        ) : (
          <span key={item} className="self-center px-1 text-ink-3">
            …
          </span>
        ),
      )}
      <button
        type="button"
        className={idleBtn}
        onClick={() => onChange(page + 1)}
        disabled={page >= totalPages}
        aria-label="다음 페이지"
      >
        <CaretRight size={14} />
      </button>
    </nav>
  );
};

export default Pagination;

import { ReactNode, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CaretLeft, CaretRight, X } from "@phosphor-icons/react";
import type { CollectionItem } from "@aod/shared/api";
import WorkThumb from "../ui/WorkThumb";
import { workCardFooter } from "../ui/workCardInfo";
import { itemMetaLine, toWorkSummary } from "./collectionItemInfo";

/** 코멘트 길이 상한 - collection-edit-page 와 같은 값 (서버 검증 기준) */
const COMMENT_MAX = 200;

export interface PulledWorkPanelProps {
  item: CollectionItem;
  curator: string;
  /** 소유자 - 메모 편집·자리 옮기기·빼기가 열린다 */
  owner: boolean;
  /** 책장에서 몇 번째인지 (0부터) / 전체 권수 */
  index: number;
  total: number;
  onMove: (delta: -1 | 1) => void;
  onRemove: () => void;
  onSaveComment: (comment: string) => void;
  /** <lg 하단 카드 - 도로 꽂기(×)를 보인다 */
  onClose?: () => void;
  /** 방문자용 "내 컬렉션에 담기" 자리 */
  collectSlot?: ReactNode;
}

const iconBtnClass =
  "grid h-9 w-9 place-items-center rounded-full border border-line-strong bg-surface text-ink transition-colors hover:border-ink active:scale-[0.96] disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:border-line-strong";

/**
 * 뽑아든 작품 - 책등을 누르면 여기에 놓인다.
 * 소유자는 이 자리에서 메모를 쓰고(포커스를 떼거나 Ctrl/⌘+Enter 로 저장), 한 칸씩 옮기고, 뺀다.
 * 메모 초안은 작품마다 따로다 - 부모가 key={itemId} 로 다시 마운트한다.
 */
const PulledWorkPanel = ({
  item,
  curator,
  owner,
  index,
  total,
  onMove,
  onRemove,
  onSaveComment,
  onClose,
  collectSlot,
}: PulledWorkPanelProps) => {
  const saved = item.comment ?? "";
  const [draft, setDraft] = useState(saved);
  const work = toWorkSummary(item);
  const meta = itemMetaLine(work);
  const footer = workCardFooter(work);

  const commit = () => {
    if (draft.trim() !== saved.trim()) onSaveComment(draft);
  };

  return (
    <div className="rounded-panel border border-line bg-surface p-4 shadow-card">
      <div className="flex items-center justify-between">
        <div className="text-[12.5px] font-bold text-ink-3">
          뽑아든 작품
          <span className="ml-1.5 font-semibold tabular-nums">
            {index + 1} / {total}
          </span>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="도로 꽂기"
            className="-mr-1.5 -mt-1.5 grid h-9 w-9 place-items-center rounded-full text-ink-2 transition-colors active:bg-ink/5"
          >
            <X size={18} />
          </button>
        )}
      </div>

      <div className="mt-2.5 flex gap-3.5">
        <WorkThumb
          imageUrl={item.posterUrl}
          domain={item.domain}
          className="w-[84px] flex-none self-start rounded-input border border-line max-lg:w-[64px]"
        />
        <div className="min-w-0 flex-1">
          <div className="line-clamp-2 text-[17px] font-extrabold leading-[1.3] tracking-[-0.02em] text-ink max-lg:text-[15.5px]">
            {item.title}
          </div>
          {meta && <div className="mt-1 text-[13px] text-ink-2">{meta}</div>}
          {footer && (
            <div className="mt-1.5 flex items-center gap-1.5 text-[12.5px] tabular-nums text-ink-2">
              {footer}
            </div>
          )}
        </div>
      </div>

      {owner ? (
        <div className="mt-3.5">
          <label
            htmlFor={`memo-${item.itemId}`}
            className="mb-1.5 flex items-baseline justify-between text-[12.5px] font-bold text-ink"
          >
            메모
            <span className="font-medium tabular-nums text-ink-3">
              {draft.length} / {COMMENT_MAX}
            </span>
          </label>
          <textarea
            id={`memo-${item.itemId}`}
            value={draft}
            maxLength={COMMENT_MAX}
            rows={3}
            placeholder="왜 꽂았는지 한마디"
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                e.currentTarget.blur();
              }
            }}
            className="w-full resize-none rounded-input border border-line-strong bg-memo px-3 py-2 font-memo text-[21px] leading-[1.15] text-ink placeholder:text-ink-3 focus:border-ink"
          />
          <p className="mt-1 text-[12px] text-ink-3">
            메모를 남기면 표지가 보이게 세워져요 (앞에서 3개).
          </p>
        </div>
      ) : (
        item.comment && (
          <figure className="mt-3.5 rounded-input border border-line bg-memo px-3 py-2.5">
            <blockquote className="font-memo text-[21px] leading-[1.15] text-ink">
              {item.comment}
            </blockquote>
            <figcaption className="mt-1 text-[12px] font-semibold text-ink-3">
              {curator}
            </figcaption>
          </figure>
        )
      )}

      <Link
        to={`/work/${item.contentId}`}
        className="mt-3.5 flex h-11 items-center justify-center gap-1.5 rounded-full bg-ink text-sm font-semibold text-surface transition-opacity hover:opacity-85 active:scale-[0.98]"
      >
        작품 보기
        <ArrowRight size={15} weight="bold" aria-hidden="true" />
      </Link>

      {owner && (
        <div className="mt-2.5 flex items-center gap-2">
          <button
            type="button"
            onClick={() => onMove(-1)}
            disabled={index === 0}
            aria-label="왼쪽으로 한 칸 옮기기"
            className={iconBtnClass}
          >
            <CaretLeft size={16} weight="bold" />
          </button>
          <button
            type="button"
            onClick={() => onMove(1)}
            disabled={index >= total - 1}
            aria-label="오른쪽으로 한 칸 옮기기"
            className={iconBtnClass}
          >
            <CaretRight size={16} weight="bold" />
          </button>
          <span className="text-[12.5px] text-ink-3">자리 옮기기</span>
          <button
            type="button"
            onClick={onRemove}
            className="ml-auto rounded-full px-3 py-2 text-[13px] font-semibold text-ink-2 transition-colors hover:bg-ink/5 hover:text-danger"
          >
            책장에서 빼기
          </button>
        </div>
      )}

      {collectSlot && <div className="mt-2.5">{collectSlot}</div>}
    </div>
  );
};

export default PulledWorkPanel;

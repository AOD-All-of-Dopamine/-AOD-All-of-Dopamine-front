import type { WorkSummary } from "@aod/shared/types";
import WorkThumb from "../ui/WorkThumb";
import { cardBase } from "../ui/cardStyles";

export interface HiddenCardSlotProps {
  work: Pick<WorkSummary, "title" | "thumbnail" | "domain">;
  /** 가린 이유 한 줄 — 싫어요는 "덜 보여드릴게요". */
  message: string;
  onUndo: () => void;
  className?: string;
}

/**
 * 👎 로 가린 카드의 자리 (REC_TAB_DESIGN §2-4 · 홈 설계 2026-09-25).
 * 목록에서 빼지 않고 **그 자리에 흐리게 남긴다** — 카드를 빼면 옆 카드가 밀려와 방금 누른 것을 잃고,
 * 되돌리기가 토스트에만 있으면 몇 초 뒤 사라진다. 되돌리기는 이 자리에 계속 있다.
 *
 * 노출 추적을 붙이지 않는다 — 가려진 상태는 "보인 노출"이 아니다(별도 컴포넌트인 이유).
 * 링크도 아니다 — 가린 작품으로 상세에 가게 하지 않는다.
 */
const HiddenCardSlot = ({ work, message, onUndo, className = "" }: HiddenCardSlotProps) => (
  <div role="group" aria-label={`${work.title} 가려짐`} className={`relative ${className}`}>
    <div className={`relative bg-canvas ${cardBase}`}>
      <WorkThumb
        imageUrl={work.thumbnail}
        domain={work.domain}
        className="opacity-25 grayscale"
      />
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2.5 px-3 text-center">
        <p className="text-[13px] font-bold text-ink">{message}</p>
        <button
          type="button"
          onClick={onUndo}
          className="rounded-full border border-line-strong bg-surface px-3.5 py-1.5 text-[12.5px] font-bold text-ink transition-colors hover:border-ink"
        >
          되돌리기
        </button>
      </div>
    </div>
    <div className="mt-[9px] truncate text-sm font-bold text-ink-3">{work.title}</div>
  </div>
);

export default HiddenCardSlot;

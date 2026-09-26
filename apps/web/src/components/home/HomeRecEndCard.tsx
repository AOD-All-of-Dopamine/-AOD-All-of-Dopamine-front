import { ArrowClockwise, ArrowCounterClockwise } from "@phosphor-icons/react";

export interface HomeRecEndCardProps {
  /** 이 묶음의 카드 수. */
  count: number;
  /** 개인 추천이면 "다 봤어요" + 새 추천 받기. 대체 목록이면 처음으로만. */
  personal: boolean;
  /** 서버가 다음 묶음을 줄 수 있을 때. */
  canRefresh: boolean;
  /** 새 묶음을 받는 중 — 버튼은 두되(포커스가 빠지지 않게) 누름을 막는다. */
  refreshing: boolean;
  onRefresh: () => void;
  onFirst: () => void;
}

/**
 * 가로 줄 끝의 한 장 (설계 2026-09-26-home-rec-only "화면 구성").
 * 모바일은 화살표가 없어 여기서 처음으로 돌아간다. 카드와 같은 폭 · 포스터 높이라 줄 모양이 흐트러지지 않는다.
 */
const HomeRecEndCard = ({ count, personal, canRefresh, refreshing, onRefresh, onFirst }: HomeRecEndCardProps) => (
  <div className="grid aspect-[2/3] w-[168px] flex-none snap-start content-center gap-2.5 rounded-panel border border-dashed border-line-strong bg-surface p-3 text-center">
    {personal && (
      <p className="text-[13.5px] font-bold text-ink">
        {count}개를 다 봤어요
      </p>
    )}
    {personal && canRefresh && (
      <>
        <p className="text-[11.5px] text-ink-2">마음에 드는 게 없었다면</p>
        <button
          type="button"
          onClick={onRefresh}
          aria-disabled={refreshing}
          className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-full bg-ink px-3 py-2 text-[13px] font-semibold text-surface transition-opacity hover:opacity-85 aria-disabled:opacity-50"
        >
          {refreshing ? "받는 중…" : "새 추천 받기"}
          <ArrowClockwise size={14} aria-hidden="true" />
        </button>
      </>
    )}
    <button
      type="button"
      onClick={onFirst}
      className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-full border border-line-strong bg-surface px-3 py-2 text-[13px] font-semibold text-ink transition-colors hover:border-ink"
    >
      처음으로
      <ArrowCounterClockwise size={14} aria-hidden="true" />
    </button>
  </div>
);

export default HomeRecEndCard;

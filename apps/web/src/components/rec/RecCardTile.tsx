import { Link } from "react-router-dom";
import { Heart } from "@phosphor-icons/react";
import { recCardFields, recWorkPath } from "@aod/shared/rec";
import type { RecCard } from "@aod/shared/types";
import { useImpressionTracker } from "../../tracking/useImpressionTracker";
import Tag from "../ui/Tag";
import WorkThumb from "../ui/WorkThumb";
import { cardLiftOpen } from "../ui/cardStyles";
import { workCardFooter, workCardMeta, workCardTags } from "../ui/workCardInfo";
import RecFeedbackMenu from "./RecFeedbackMenu";

export interface RecCardTileProps {
  card: RecCard;
  liked: boolean;
  /** 비로그인 대체 목록에서는 피드백 행을 그리지 않는다 (설계 §3). */
  feedbackEnabled: boolean;
  onOpen: (card: RecCard) => void;
  onToggleLike: (card: RecCard) => void;
  onDislike: (card: RecCard) => void;
  onNotInterested: (card: RecCard) => void;
  onBookmark: (card: RecCard) => void;
}

/**
 * 추천 카드 1장 = 기존 WorkCard + 이유 한 줄 + 피드백 행.
 * WorkCard 는 카드 전체가 <Link> 라 안에 버튼을 넣을 수 없다(a 안의 button 은 잘못된 마크업).
 * 그래서 같은 조각(cardLift·workCardMeta·workCardTags·workCardFooter)으로 다시 조립하고
 * 링크 영역과 버튼 행을 형제로 둔다.
 * 카드 전체가 노출 계측 대상이다 — 대체 목록 카드도 impressionId 가 있으므로 똑같이 잰다(분모).
 *
 * WorkCard 와 달리 카드 상자에 overflow-hidden 을 두지 않는다(cardLiftOpen) — 좁은 화면에서
 * 더보기 메뉴가 카드 밖으로 나가야 하기 때문이다. 위쪽 모서리는 썸네일 상자가 맡는다.
 */
const RecCardTile = ({
  card,
  liked,
  feedbackEnabled,
  onOpen,
  onToggleLike,
  onDislike,
  onNotInterested,
  onBookmark,
}: RecCardTileProps) => {
  const setImpressionRef = useImpressionTracker(recCardFields(card));
  const work = card.work;
  const meta = workCardMeta(work, { withDomain: true });
  const tags = workCardTags(work);
  const footer = workCardFooter(work);

  return (
    <article ref={setImpressionRef} className={`flex flex-col bg-surface ${cardLiftOpen}`}>
      <Link to={recWorkPath(card)} onClick={() => onOpen(card)} className="flex flex-1 flex-col">
        <WorkThumb imageUrl={work.thumbnail} domain={work.domain} className="rounded-t-panel" />
        <div className="flex flex-1 flex-col gap-[7px] px-[15px] pb-[14px] pt-[13px]">
          <div className="truncate text-[15.5px] font-bold tracking-[-0.01em] text-ink">{work.title}</div>
          {card.reason && (
            <div className="truncate text-[12.5px] font-semibold text-accent-ink">{card.reason.text}</div>
          )}
          {meta && <div className="truncate text-[13px] text-ink-2">{meta}</div>}
          {tags && tags.length > 0 && (
            <div className="flex flex-wrap gap-[5px]">
              {tags.map((tag) => (
                <Tag key={tag}>{tag}</Tag>
              ))}
            </div>
          )}
          {footer && (
            <div className="mt-auto flex items-center gap-[7px] border-t border-line pt-[9px] text-[12.5px] text-ink-2 tabular-nums">
              {footer}
            </div>
          )}
        </div>
      </Link>

      {feedbackEnabled && (
        <div className="flex items-center gap-1 border-t border-line px-[9px] py-1.5">
          <button
            type="button"
            onClick={() => onToggleLike(card)}
            aria-pressed={liked}
            aria-label={liked ? `${work.title} 좋아요 취소` : `${work.title} 좋아요`}
            className={`grid h-9 w-9 place-items-center rounded-full transition-colors hover:bg-ink/5 ${
              liked ? "text-accent" : "text-ink-3"
            }`}
          >
            <Heart size={18} weight={liked ? "fill" : "regular"} />
          </button>
          <RecFeedbackMenu
            title={work.title}
            onDislike={() => onDislike(card)}
            onNotInterested={() => onNotInterested(card)}
            onBookmark={() => onBookmark(card)}
          />
        </div>
      )}
    </article>
  );
};

export default RecCardTile;

import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { HOME_REC_SURFACE } from "@aod/shared/constants";
import { recCardFields, recWorkPath } from "@aod/shared/rec";
import type { RecCard } from "@aod/shared/types";
import { useImpressionTracker } from "../../tracking/useImpressionTracker";
import RecThumbs from "../rec/RecThumbs";
import WorkThumb from "../ui/WorkThumb";
import { cardLift } from "../ui/cardStyles";
import { workCardMeta } from "../ui/workCardInfo";

export interface HomeRecCardProps {
  card: RecCard;
  /** 이유 한 줄 — 개인화 추천에만. 대체 목록에 붙이면 인기 목록이 개인화처럼 보인다. */
  showReason: boolean;
  /** 👍/👎. 비로그인이면 null(저장되지 않는다). */
  feedback: { liked: boolean; onLike: () => void; onDislike: () => void } | null;
  onOpen: (card: RecCard) => void;
  /** 가린 자리에서 되돌려 이 카드가 다시 생겼으면 카드(링크)로 포커스를 옮긴다. */
  autoFocus?: boolean;
}

/**
 * 홈 추천 릴의 카드 1장 — 기존 홈 릴 카드(RailCard, 168px)와 같은 규격에 이유 한 줄과 👍/👎 를 더했다.
 * RailCard 는 카드 전체가 <Link> 라 안에 버튼을 넣을 수 없다(a 안의 button 은 잘못된 마크업).
 * 그래서 링크와 버튼 묶음을 **형제**로 두고, 버튼은 포스터와 같은 크기(2:3)의 투명한 틀 위에 얹는다 —
 * 카드 폭이 고정이라 포스터 오른쪽 아래에 정확히 앉는다.
 * 카드 전체가 노출 계측 대상이다(홈 surface). 대체 목록 카드도 impressionId 가 있어 똑같이 잰다(분모).
 */
const HomeRecCard = ({ card, showReason, feedback, onOpen, autoFocus = false }: HomeRecCardProps) => {
  const setImpressionRef = useImpressionTracker(recCardFields(card, HOME_REC_SURFACE));
  const linkRef = useRef<HTMLAnchorElement>(null);
  useEffect(() => {
    if (autoFocus) linkRef.current?.focus({ preventScroll: true });
    // 마운트될 때 한 번만
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const work = card.work;
  const meta = workCardMeta(work, { withDomain: true });

  return (
    <article ref={setImpressionRef} className="group relative w-[168px] flex-none snap-start">
      <Link ref={linkRef} to={recWorkPath(card)} onClick={() => onOpen(card)} className="block">
        <div
          className={`bg-canvas ${cardLift} group-hover:-translate-y-[3px] group-hover:shadow-lift motion-reduce:group-hover:translate-y-0`}
        >
          <WorkThumb imageUrl={work.thumbnail} domain={work.domain} />
        </div>
        <div className="mt-[9px] truncate text-sm font-bold text-ink">{work.title}</div>
        {showReason && card.reason && (
          <div className="mt-0.5 truncate text-[12.5px] font-semibold text-accent-ink">{card.reason.text}</div>
        )}
        {meta && <div className="mt-0.5 truncate text-[12.5px] text-ink-2">{meta}</div>}
      </Link>

      {feedback && (
        // 포스터와 같은 틀 — 빈 곳은 클릭을 통과시켜 포스터(링크)를 누를 수 있게 한다
        <div className="pointer-events-none absolute inset-x-0 top-0 aspect-[2/3] max-w-full transition group-hover:-translate-y-[3px] motion-reduce:group-hover:translate-y-0">
          <RecThumbs
            title={work.title}
            liked={feedback.liked}
            onLike={feedback.onLike}
            onDislike={feedback.onDislike}
            className="pointer-events-auto absolute bottom-2 right-2"
          />
        </div>
      )}
    </article>
  );
};

export default HomeRecCard;

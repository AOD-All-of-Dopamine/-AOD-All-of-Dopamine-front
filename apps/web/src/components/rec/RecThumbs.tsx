import { ThumbsDown, ThumbsUp } from "@phosphor-icons/react";

export interface RecThumbsProps {
  /** 버튼 이름에 붙일 작품 제목 — 카드가 여러 장이라 "좋아요"만으로는 어느 작품인지 모른다. */
  title: string;
  liked: boolean;
  onLike: () => void;
  onDislike: () => void;
  className?: string;
}

/**
 * 추천 카드의 👍/👎 (REC_TAB_DESIGN §2-4 · 홈 설계 2026-09-25).
 * **항상 보인다** — 호버에만 띄우면 터치·키보드 사용자는 누를 수 없다(§2-4 가 상시 노출로 확정).
 * 버튼 36px, 사이 8px — 엄지로 누를 때 옆 버튼을 잘못 누르지 않게.
 * 👍 는 켜고 끄는 토글이라 aria-pressed 로 상태를 알리고, 👎 는 누르면 카드가 가려지는 동작이라 상태가 없다.
 */
const RecThumbs = ({ title, liked, onLike, onDislike, className = "" }: RecThumbsProps) => (
  <div className={`flex gap-2 ${className}`}>
    <button
      type="button"
      onClick={onLike}
      aria-pressed={liked}
      aria-label={liked ? `${title} 좋아요 취소` : `${title} 좋아요`}
      className={`grid h-9 w-9 place-items-center rounded-full border shadow-card transition-colors ${
        liked
          ? "border-accent bg-accent text-surface"
          : "border-line bg-surface text-ink-2 hover:text-ink"
      }`}
    >
      <ThumbsUp size={17} weight={liked ? "fill" : "regular"} aria-hidden="true" />
    </button>
    <button
      type="button"
      onClick={onDislike}
      aria-label={`${title} 관심 없어요`}
      className="grid h-9 w-9 place-items-center rounded-full border border-line bg-surface text-ink-2 shadow-card transition-colors hover:text-ink"
    >
      <ThumbsDown size={17} aria-hidden="true" />
    </button>
  </div>
);

export default RecThumbs;

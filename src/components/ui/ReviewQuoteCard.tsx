import { Star } from "@phosphor-icons/react";
import { Link } from "react-router-dom";
import { cardLift } from "./cardStyles";

/**
 * 목업 .rv / .thumb / .t / .score / q / .who (home-light-mockup.html)
 * 홈 "방금 올라온 리뷰" 인용 카드 - 포스터(64px) + 제목 + 별점 + 인용 2줄 + 캡션.
 * quote(인용문)·caption(.who 슬롯 - 닉네임 또는 보조 메타)·score는 데이터가 있을
 * 때만 렌더한다 (홈은 현재 API에 리뷰 본문·닉네임이 없어 생략, 별점은 0이면 미표시).
 * 참고: 목업은 hover 시 translate만 적용하나, RailCard 전례대로 스펙 호버 리프트
 * 패턴(cardLift: translate + shadow-lift)을 함께 적용함.
 */
export interface ReviewQuoteCardProps {
  title: string;
  /** 별점 - 미제공 또는 0이면 렌더하지 않음 */
  score?: number;
  /** 리뷰 인용문 (2줄 클램프) */
  quote?: string;
  /** 목업 .who 슬롯 - 닉네임 또는 보조 메타 텍스트 */
  caption?: string;
  imageUrl: string | null;
  /** 제목이 인접 텍스트로 함께 렌더되므로 기본은 장식 이미지("") 취급 */
  imageAlt?: string;
  /** imageUrl 부재 시 썸네일 영역 중앙에 표시할 도메인별 아이콘 */
  fallbackIconUrl?: string;
  to: string;
}

const ReviewQuoteCard = ({
  title,
  score,
  quote,
  caption,
  imageUrl,
  imageAlt = "",
  fallbackIconUrl,
  to,
}: ReviewQuoteCardProps) => {
  return (
    <Link to={to} className={`flex gap-3.5 bg-surface p-4 ${cardLift}`}>
      <div className="aspect-[2/3] w-16 flex-none overflow-hidden rounded-input bg-canvas">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={imageAlt}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="grid h-full w-full place-items-center">
            {fallbackIconUrl && (
              <img
                src={fallbackIconUrl}
                alt={imageAlt}
                loading="lazy"
                className="w-[clamp(20px,50%,36px)] opacity-80"
              />
            )}
          </div>
        )}
      </div>
      <div className="min-w-0">
        <div className="line-clamp-2 text-[14.5px] font-bold text-ink">
          {title}
        </div>
        {typeof score === "number" && score > 0 && (
          <span className="mt-0.5 inline-flex items-center gap-[3px] text-[13px] font-bold tabular-nums text-ink">
            <Star weight="fill" size={13} className="text-star" />
            {score.toFixed(1)}
          </span>
        )}
        {quote && (
          <q className="mt-[7px] line-clamp-2 text-[13.5px] text-ink-2">
            {quote}
          </q>
        )}
        {caption && (
          <div className="mt-1.5 text-[12.5px] text-ink-3">{caption}</div>
        )}
      </div>
    </Link>
  );
};

export default ReviewQuoteCard;

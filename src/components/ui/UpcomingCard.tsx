import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { cardLift } from "./cardStyles";

/**
 * 목업 .up-card / .thumb / .t / .m (home-light-mockup.html)
 * 출시 예정 카드 - 썸네일(56px) + 제목 + 메타 + 우측 slot(DdayPill).
 * 참고: 목업 .up-card에는 hover 효과가 없으나, 링크 어포던스를 위해 RailCard
 * 전례대로 스펙 호버 리프트 패턴(cardLift)을 적용함.
 */
export interface UpcomingCardProps {
  title: string;
  meta?: string;
  imageUrl: string | null;
  /** 제목이 인접 텍스트로 함께 렌더되므로 기본은 장식 이미지("") 취급 */
  imageAlt?: string;
  /** imageUrl 부재 시 썸네일 영역 중앙에 표시할 도메인별 아이콘 */
  fallbackIconUrl?: string;
  /** 우측 고정 슬롯 - DdayPill 등 */
  slot?: ReactNode;
  to: string;
}

const UpcomingCard = ({
  title,
  meta,
  imageUrl,
  imageAlt = "",
  fallbackIconUrl,
  slot,
  to,
}: UpcomingCardProps) => {
  return (
    <Link
      to={to}
      className={`flex items-center gap-3.5 bg-surface p-4 ${cardLift}`}
    >
      <div className="aspect-[2/3] w-14 flex-none overflow-hidden rounded-input bg-canvas">
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
      <div className="min-w-0 flex-1">
        <div className="line-clamp-2 text-[14.5px] font-bold text-ink">
          {title}
        </div>
        {meta && (
          <div className="mt-0.5 truncate text-[13px] text-ink-2">{meta}</div>
        )}
      </div>
      {slot && <span className="flex-none">{slot}</span>}
    </Link>
  );
};

export default UpcomingCard;

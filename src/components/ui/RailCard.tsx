import { Link } from "react-router-dom";
import { cardLift } from "./cardStyles";

/**
 * 목업 .rail-card / .thumb / .t / .m (home-light-mockup.html)
 * 가로 릴에 쓰이는 고정폭(168px) 세로 포스터 카드. scroll-snap-align: start 포함
 * (snap 컨테이너가 아니면 무해). imageUrl이 없으면 fallbackIconUrl 아이콘을
 * 중앙 표시 (WorkCard와 동일 규약).
 * 참고: 목업은 hover 시 썸네일 transform만 적용하나, 스펙 §절대규칙 6의 호버 리프트
 * 패턴(translate + shadow-lift)을 기계 게이트 요구대로 함께 적용함.
 * 리프트 트리거는 카드 전체(Link group) - 제목·메타 위에 올려도 썸네일이 뜬다.
 */
export interface RailCardProps {
  title: string;
  meta?: string;
  /** null이면 fallbackIconUrl 아이콘을 중앙 표시 (실데이터 썸네일 누락 대응) */
  imageUrl: string | null;
  /** 제목이 인접 텍스트로 함께 렌더되므로 기본은 장식 이미지("") 취급 */
  imageAlt?: string;
  /** imageUrl 부재 시 썸네일 영역 중앙에 표시할 도메인별 아이콘 */
  fallbackIconUrl?: string;
  to: string;
}

const RailCard = ({
  title,
  meta,
  imageUrl,
  imageAlt = "",
  fallbackIconUrl,
  to,
}: RailCardProps) => {
  return (
    <Link to={to} className="group w-[168px] flex-none snap-start">
      <div
        className={`aspect-[2/3] bg-canvas ${cardLift} group-hover:-translate-y-[3px] group-hover:shadow-lift motion-reduce:group-hover:translate-y-0`}
      >
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
                className="w-[clamp(32px,30%,64px)] opacity-80"
              />
            )}
          </div>
        )}
      </div>
      <div className="mt-[9px] truncate text-sm font-bold text-ink">
        {title}
      </div>
      {meta && <div className="mt-0.5 text-[12.5px] text-ink-2">{meta}</div>}
    </Link>
  );
};

export default RailCard;

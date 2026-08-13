import { Link } from "react-router-dom";
import { cardLift } from "./cardStyles";

/**
 * 목업 .rail-card / .thumb / .t / .m (home-light-mockup.html)
 * 가로 릴에 쓰이는 고정폭(168px) 세로 포스터 카드.
 * 참고: 목업은 hover 시 썸네일 transform만 적용하나, 스펙 §절대규칙 6의 호버 리프트
 * 패턴(translate + shadow-lift)을 기계 게이트 요구대로 함께 적용함.
 * 리프트 트리거는 카드 전체(Link group) - 제목·메타 위에 올려도 썸네일이 뜬다.
 */
export interface RailCardProps {
  title: string;
  meta?: string;
  imageUrl: string;
  /** 제목이 인접 텍스트로 함께 렌더되므로 기본은 장식 이미지("") 취급 */
  imageAlt?: string;
  to: string;
}

const RailCard = ({ title, meta, imageUrl, imageAlt = "", to }: RailCardProps) => {
  return (
    <Link to={to} className="group w-[168px] flex-none">
      <div
        className={`aspect-[2/3] bg-canvas ${cardLift} group-hover:-translate-y-[3px] group-hover:shadow-lift motion-reduce:group-hover:translate-y-0`}
      >
        <img
          src={imageUrl}
          alt={imageAlt}
          loading="lazy"
          className="h-full w-full object-cover"
        />
      </div>
      <div className="mt-[9px] truncate text-sm font-bold text-ink">
        {title}
      </div>
      {meta && <div className="mt-0.5 text-[12.5px] text-ink-2">{meta}</div>}
    </Link>
  );
};

export default RailCard;

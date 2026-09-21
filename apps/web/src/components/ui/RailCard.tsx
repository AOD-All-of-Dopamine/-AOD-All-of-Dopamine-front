import { Link } from "react-router-dom";
import WorkThumb from "./WorkThumb";
import { cardLift } from "./cardStyles";

/**
 * 목업 .rail-card / .thumb / .t / .m (home-light-mockup.html)
 * 가로 릴에 쓰이는 고정폭(168px) 세로 포스터 카드. scroll-snap-align: start 포함
 * (snap 컨테이너가 아니면 무해). 썸네일은 WorkThumb(통일 2:3 틀 + 도메인별 맞춤,
 * 이미지 부재 시 도메인 폴백 아이콘).
 * 참고: 목업은 hover 시 썸네일 transform만 적용하나, 스펙 §절대규칙 6의 호버 리프트
 * 패턴(translate + shadow-lift)을 기계 게이트 요구대로 함께 적용함.
 * 리프트 트리거는 카드 전체(Link group) - 제목·메타 위에 올려도 썸네일이 뜬다.
 */
export interface RailCardProps {
  title: string;
  meta?: string;
  /** null이면 도메인 폴백 아이콘을 중앙 표시 (실데이터 썸네일 누락 대응) */
  imageUrl: string | null;
  /** 제목이 인접 텍스트로 함께 렌더되므로 기본은 장식 이미지("") 취급 */
  imageAlt?: string;
  /** 백엔드 도메인 문자열 - 썸네일 맞춤 방식과 폴백 아이콘을 정한다 */
  domain?: string;
  to: string;
}

const RailCard = ({
  title,
  meta,
  imageUrl,
  imageAlt = "",
  domain,
  to,
}: RailCardProps) => {
  return (
    <Link to={to} className="group w-[168px] flex-none snap-start">
      <div
        className={`bg-canvas ${cardLift} group-hover:-translate-y-[3px] group-hover:shadow-lift motion-reduce:group-hover:translate-y-0`}
      >
        <WorkThumb imageUrl={imageUrl} domain={domain} alt={imageAlt} />
      </div>
      <div className="mt-[9px] truncate text-sm font-bold text-ink">
        {title}
      </div>
      {meta && <div className="mt-0.5 text-[12.5px] text-ink-2">{meta}</div>}
    </Link>
  );
};

export default RailCard;

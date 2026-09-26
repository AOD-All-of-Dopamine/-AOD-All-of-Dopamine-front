import { Link } from "react-router-dom";
import {
  categoryOf,
  thumbShapeMap,
  thumbnailFallbackMap,
} from "../../constants/thumbnail";
import { cardLift } from "./cardStyles";

/**
 * 목업 .feature / .feature-main / .feature-side .feature / .scrim / .kicker / .sub
 * (home-light-mockup.html) - 피처드 히어로 카드. 이미지 위 하단 스크림 + 흰 텍스트.
 * variant "main" = 큰 카드(min-h 400, 제목 30px), "side" = 우측 서브(min-h 160, 제목 19px).
 *
 * 카드 틀은 가로로 길다(약 2:1). 썸네일은 도메인마다 모양이 다르므로 틀에 맞춰 넣는다(thumbShapeMap):
 * - landscape(게임 - Steam 460:215): 틀과 비율이 비슷해 그대로 채운다(cover).
 * - portrait(영화·시리즈·웹툰·웹소설 - 세로 포스터): 채우면 가운데 띠만 남는다. 자르지 않고
 *   오른쪽에 세워 두고, 같은 이미지의 블러가 뒤를 채운다. 제목은 왼쪽 아래라 포스터와 겹치지 않는다.
 *   (그리드 카드의 WorkThumb 와 같은 규칙 - 틀은 고정, 이미지만 도메인에 맞춘다.)
 *
 * 스크림 그라디언트는 목업 rgb(12 10 8 / .78)을 토큰(ink/80)으로 치환, 텍스트는
 * text-surface 계열 토큰 사용 (스펙 게이트 - 임의 hex 금지).
 * imageUrl이 없으면 토큰 배경(bg-canvas) + 도메인 아이콘 폴백으로 렌더하고
 * 스크림 없이 잉크 텍스트로 전환한다.
 * 제목은 heading이 아닌 strong(block)으로 렌더 - 페이지 헤딩 아웃라인 오염 방지
 * (홈은 sr-only h1 + 섹션 h2 구조).
 */
export interface FeatureCardProps {
  variant?: "main" | "side";
  /** 상단 소제목 (예: "오늘의 작품 · 게임") */
  kicker: string;
  title: string;
  /** 보조 한 줄 (main 전용 목업 .sub 슬롯) */
  sub?: string;
  imageUrl: string | null;
  /** 제목이 인접 텍스트로 함께 렌더되므로 기본은 장식 이미지("") 취급 */
  imageAlt?: string;
  /** 백엔드 도메인 문자열 - 썸네일 맞춤 방식과 폴백 아이콘을 정한다 */
  domain?: string;
  to: string;
  /** 클릭 추적 (이동은 링크가 한다) */
  onClick?: () => void;
}

const FeatureCard = ({
  variant = "main",
  kicker,
  title,
  sub,
  imageUrl,
  imageAlt = "",
  domain,
  to,
  onClick,
}: FeatureCardProps) => {
  const isMain = variant === "main";
  const withImage = !!imageUrl;
  const category = categoryOf(domain);
  const standing = withImage && thumbShapeMap[category] === "portrait";

  return (
    <Link
      to={to}
      onClick={onClick}
      className={`relative block bg-canvas ${cardLift} ${
        isMain
          ? "min-h-[300px] min-[1024px]:min-h-[400px]"
          : "min-h-[160px]"
      }`}
    >
      {withImage ? (
        standing ? (
          <>
            <img
              src={imageUrl}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 h-full w-full scale-110 object-cover opacity-80 blur-2xl"
            />
            <img
              src={imageUrl}
              alt={imageAlt}
              className={`absolute inset-0 h-full w-full object-contain object-right drop-shadow-xl ${
                isMain ? "p-4 min-[1024px]:p-6" : "p-3"
              }`}
            />
          </>
        ) : (
          <img
            src={imageUrl}
            alt={imageAlt}
            className="absolute inset-0 h-full w-full object-cover"
          />
        )
      ) : (
        <div className="absolute inset-0 grid place-items-center">
          <img
            src={thumbnailFallbackMap[category]}
            alt={imageAlt}
            loading="lazy"
            className="w-[clamp(40px,18%,72px)] opacity-80"
          />
        </div>
      )}
      <div
        className={`relative z-10 flex h-full flex-col justify-end gap-2 ${
          isMain ? "px-7 py-[26px]" : "px-5 py-[18px]"
        } ${withImage ? "bg-gradient-to-b from-ink/0 from-30% to-ink/80" : ""}`}
      >
        <div
          className={`text-[12.5px] font-bold tracking-[0.02em] ${
            withImage ? "text-surface/85" : "text-ink-2"
          }`}
        >
          {kicker}
        </div>
        <strong
          className={`block font-extrabold leading-[1.15] tracking-[-0.03em] ${
            isMain ? "text-[30px]" : "text-[19px]"
          } ${withImage ? "text-surface" : "text-ink"} ${
            standing ? (isMain ? "max-w-[62%]" : "max-w-[68%]") : ""
          }`}
        >
          {title}
        </strong>
        {sub && (
          <p
            className={`text-[14.5px] ${
              withImage ? "text-surface/80" : "text-ink-2"
            }`}
          >
            {sub}
          </p>
        )}
      </div>
    </Link>
  );
};

export default FeatureCard;

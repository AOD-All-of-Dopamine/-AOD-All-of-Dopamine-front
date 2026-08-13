import { Link } from "react-router-dom";
import { cardLift } from "./cardStyles";

/**
 * 목업 .feature / .feature-main / .feature-side .feature / .scrim / .kicker / .sub
 * (home-light-mockup.html) - 피처드 히어로 카드. 이미지 위 하단 스크림 + 흰 텍스트.
 * variant "main" = 큰 카드(min-h 400, 제목 30px), "side" = 우측 서브(min-h 160, 제목 19px).
 * 스크림 그라디언트는 목업 rgb(12 10 8 / .78)을 토큰(ink/80)으로 치환, 텍스트는
 * text-surface 계열 토큰 사용 (스펙 게이트 - 임의 hex 금지).
 * imageUrl이 없으면 토큰 배경(bg-canvas) + 도메인 아이콘 폴백으로 렌더하고
 * 스크림 없이 잉크 텍스트로 전환한다.
 * 제목은 heading이 아닌 strong(block)으로 렌더 - 페이지 헤딩 아웃라인 오염 방지
 * (홈은 sr-only h1 + 섹션 h2 구조).
 */
export interface FeatureCardProps {
  variant?: "main" | "side";
  /** 상단 소제목 (예: "오늘의 추천 · 게임") */
  kicker: string;
  title: string;
  /** 보조 한 줄 (main 전용 목업 .sub 슬롯) */
  sub?: string;
  imageUrl: string | null;
  /** 제목이 인접 텍스트로 함께 렌더되므로 기본은 장식 이미지("") 취급 */
  imageAlt?: string;
  /** imageUrl 부재 시 중앙에 표시할 도메인별 아이콘 */
  fallbackIconUrl?: string;
  to: string;
}

const FeatureCard = ({
  variant = "main",
  kicker,
  title,
  sub,
  imageUrl,
  imageAlt = "",
  fallbackIconUrl,
  to,
}: FeatureCardProps) => {
  const isMain = variant === "main";
  const withImage = !!imageUrl;

  return (
    <Link
      to={to}
      className={`relative block bg-canvas ${cardLift} ${
        isMain
          ? "min-h-[300px] min-[1024px]:min-h-[400px]"
          : "min-h-[160px]"
      }`}
    >
      {withImage ? (
        <img
          src={imageUrl}
          alt={imageAlt}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        fallbackIconUrl && (
          <div className="absolute inset-0 grid place-items-center">
            <img
              src={fallbackIconUrl}
              alt={imageAlt}
              loading="lazy"
              className="w-[clamp(40px,18%,72px)] opacity-80"
            />
          </div>
        )
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
          } ${withImage ? "text-surface" : "text-ink"}`}
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

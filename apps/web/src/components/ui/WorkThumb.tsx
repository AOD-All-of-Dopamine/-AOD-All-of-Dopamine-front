import { useState } from "react";
import {
  categoryOf,
  thumbFitMap,
  thumbnailFallbackMap,
} from "../../constants/thumbnail";

/**
 * 모든 그리드 카드가 공유하는 썸네일 틀 — 기본 2:3(portrait).
 * `shape="landscape"` 는 스팀 배너 비율(460:215) 틀이다 — 탐색 게임 탭의 가벼운 카드가 쓴다
 * (탐색은 탭마다 한 분야라 2:3 통일을 탐색에 한해 되돌렸다 — 설계 2026-09-26-explore-light-card). 원본과 비율이 같아 cover 로 잘림이 없다.
 * 카드 크기는 도메인과 무관하게 같고, 틀 안의 이미지만 도메인에 맞춘다(thumbFitMap):
 * - cover: 한 장으로 틀을 채운다 (영화·시리즈 - 원본이 2:3).
 * - contain: 원본 비율 그대로 가운데에 넣고, 같은 URL의 블러 배경이 남는 자리를 채운다
 *   (게임·웹툰·웹소설). 같은 URL이라 추가 네트워크 요청은 없다.
 * imageUrl이 없으면 도메인 폴백 아이콘을 중앙 표시한다.
 *
 * **세로 표지**(게임 세로 표지 설계 2026-10-01): 세로 틀에 `portraitUrl`(Steam 라이브러리 캡슐 2:3)이 오면 그 한 장을 cover 로 쓴다.
 * 깨지면 그 주소만 실패로 기억하고(같은 컴포넌트에 다른 작품이 들어와도 새 표지가 갇히지 않게) 위 규칙으로 돌아간다.
 */
export interface WorkThumbProps {
  /** null·빈 문자열이면 도메인 폴백 아이콘 (실데이터 썸네일 누락 대응) */
  imageUrl: string | null | undefined;
  /** 백엔드 도메인 문자열(대소문자 무관) - 맞춤 방식과 폴백 아이콘을 정한다 */
  domain?: string | null;
  /** 제목이 인접 텍스트로 함께 렌더되므로 기본은 장식 이미지("") 취급 */
  alt?: string;
  /** 틀에 덧붙일 클래스 (라운드 등) */
  className?: string;
  /** 틀 모양 — 기본 2:3. landscape 는 460:215 + cover. */
  shape?: "portrait" | "landscape";
  /** 세로 표지 — 세로 틀에서만 쓴다. 없거나 깨지면 imageUrl 규칙으로. */
  portraitUrl?: string | null;
}

const WorkThumb = ({
  imageUrl,
  domain,
  alt = "",
  className = "",
  shape = "portrait",
  portraitUrl,
}: WorkThumbProps) => {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const category = categoryOf(domain);
  const fit = shape === "landscape" ? "cover" : thumbFitMap[category];
  const portrait = shape === "portrait" && portraitUrl && portraitUrl !== failedSrc ? portraitUrl : null;

  return (
    <div
      className={`relative ${shape === "landscape" ? "aspect-[460/215]" : "aspect-[2/3]"} overflow-hidden bg-canvas ${className}`}
    >
      {portrait ? (
        <img
          src={portrait}
          alt={alt}
          loading="lazy"
          onError={() => setFailedSrc(portrait)}
          className="h-full w-full object-cover"
        />
      ) : !imageUrl ? (
        <div className="grid h-full w-full place-items-center">
          <img
            src={thumbnailFallbackMap[category]}
            alt={alt}
            loading="lazy"
            className="w-[clamp(32px,30%,64px)] opacity-80"
          />
        </div>
      ) : fit === "cover" ? (
        <img
          src={imageUrl}
          alt={alt}
          loading="lazy"
          className="h-full w-full object-cover"
        />
      ) : (
        <>
          <img
            src={imageUrl}
            alt=""
            aria-hidden="true"
            loading="lazy"
            className="absolute inset-0 h-full w-full scale-110 object-cover opacity-70 blur-xl"
          />
          <img
            src={imageUrl}
            alt={alt}
            loading="lazy"
            className="relative h-full w-full object-contain"
          />
        </>
      )}
    </div>
  );
};

export default WorkThumb;

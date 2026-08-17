import { collectionTintBg } from "@aod/shared/constants";
import { thumbnailFallbackMap, type Category } from "../../constants/thumbnail";

/**
 * 컬렉션 콜라주 커버 (목업 .collage / .det-collage / .m-det-collage 공용).
 * 담긴 작품 포스터 상위 3장을 큰 1 + 작은 2 그리드로 자동 배치하고,
 * 큐레이터가 고른 틴트를 opacity 18% veil로 살짝 덮는다 (콘텐츠 색 - 포스터와
 * 같은 지위). 포스터가 모자라면 빈 슬롯은 canvas 블록으로 두고 veil이 틴트를
 * 입힌다 - 메인 슬롯만 도메인 폴백 아이콘을 중앙 표시.
 */
export interface CollectionCollageProps {
  /** 상위 3개 포스터 URL (0~3장) */
  posters: string[];
  /** 서버 tint enum명 (PINE/OLIVE/...) - 미지 값은 PINE 폴백 */
  tint: string;
  /** 빈 메인 슬롯의 폴백 아이콘 선택용 도메인 (MOVIE/TV/GAME/...) */
  domain: string;
  /** 비율·라운드·그림자 등 컨테이너 형태는 쓰는 쪽이 결정 */
  className?: string;
  /** 우하단 "N작품" pill - 발견 카드 전용 (미전달 시 생략) */
  itemCount?: number;
}

const categoryOf = (domain: string): Category => {
  const key = domain?.toLowerCase() as Category;
  return key in thumbnailFallbackMap ? key : "movie";
};

const Slot = ({
  poster,
  fallbackIconUrl,
}: {
  poster?: string;
  fallbackIconUrl?: string;
}) => (
  <div className="overflow-hidden bg-canvas">
    {poster ? (
      <img
        src={poster}
        alt=""
        loading="lazy"
        className="h-full w-full object-cover"
      />
    ) : (
      fallbackIconUrl && (
        <div className="grid h-full w-full place-items-center">
          <img
            src={fallbackIconUrl}
            alt=""
            loading="lazy"
            className="w-[clamp(24px,26%,48px)] opacity-80"
          />
        </div>
      )
    )}
  </div>
);

const CollectionCollage = ({
  posters,
  tint,
  domain,
  className = "",
  itemCount,
}: CollectionCollageProps) => {
  return (
    <div
      className={`relative grid grid-cols-[1.6fr_1fr] gap-0.5 overflow-hidden ${className}`}
    >
      <Slot
        poster={posters[0]}
        fallbackIconUrl={thumbnailFallbackMap[categoryOf(domain)]}
      />
      <div className="grid grid-rows-2 gap-0.5">
        <Slot poster={posters[1]} />
        <Slot poster={posters[2]} />
      </div>
      {/* 틴트 veil - 콘텐츠 색 전용 (index.css @theme --color-tint-*) */}
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-0 opacity-[0.18] ${collectionTintBg(tint)}`}
      />
      {itemCount !== undefined && (
        <span className="absolute bottom-2.5 right-2.5 rounded-full bg-ink/60 px-2.5 py-[3px] text-xs font-bold text-surface backdrop-blur-sm">
          {itemCount}작품
        </span>
      )}
    </div>
  );
};

export default CollectionCollage;

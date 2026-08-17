import { ReactNode } from "react";
import { Link } from "react-router-dom";

/**
 * 목업 .row (new-releases-mockup.html) - 신작 타임라인 작품 행.
 * 썸네일 52px + 제목 + 메타 + 우측 slot(도메인 Tag, DdayPill 등).
 * 호버 시 오른쪽 3px 이동 (목업 .row:hover translateX).
 */
export interface ReleaseRowProps {
  title: string;
  meta?: string;
  imageUrl: string | null;
  /** 제목이 인접 텍스트로 함께 렌더되므로 기본은 장식 이미지("") 취급 */
  imageAlt?: string;
  /** imageUrl 부재 시 썸네일 영역 중앙에 표시할 도메인별 아이콘 */
  fallbackIconUrl?: string;
  /** 우측 고정 슬롯 - 도메인 Tag, DdayPill 등 */
  slot?: ReactNode;
  to: string;
}

const ReleaseRow = ({
  title,
  meta,
  imageUrl,
  imageAlt = "",
  fallbackIconUrl,
  slot,
  to,
}: ReleaseRowProps) => {
  return (
    <Link
      to={to}
      className="flex items-center gap-4 rounded-panel border border-line bg-surface px-4 py-3 shadow-card transition-transform hover:translate-x-[3px] motion-reduce:transition-none motion-reduce:hover:translate-x-0"
    >
      <div className="aspect-[2/3] w-[52px] flex-none overflow-hidden rounded-input bg-canvas">
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
                className="w-[clamp(18px,50%,32px)] opacity-80"
              />
            )}
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[15px] font-bold text-ink">{title}</div>
        {meta && (
          <div className="mt-0.5 truncate text-[13px] text-ink-2">{meta}</div>
        )}
      </div>
      {slot && <span className="flex-none">{slot}</span>}
    </Link>
  );
};

export default ReleaseRow;

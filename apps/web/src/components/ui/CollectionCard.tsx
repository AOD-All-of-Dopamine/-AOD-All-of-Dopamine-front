import { Link } from "react-router-dom";
import { Eye, Heart, LockSimple } from "@phosphor-icons/react";
import { CollectionSummary } from "@aod/shared/api";
import {
  collectionDomainLabel,
  collectionTintBg,
} from "@aod/shared/constants";
import { cardLift } from "./cardStyles";
import CollectionCollage from "./CollectionCollage";

/**
 * 컬렉션 발견 카드 (목업 .col-card).
 * 콜라주 커버(16:9, 포스터 3장 + 틴트 veil + N작품 pill) / 도메인 라벨 /
 * 제목 / 설명 1줄 / foot(큐레이터 아바타·닉네임 + 좋아요·조회수).
 * PRIVATE 컬렉션(내 컬렉션 탭)은 도메인 라벨 옆에 "나만 보기" 배지.
 */

/** 큐레이터 아바타 - 틴트 배경 + 닉네임 첫 글자 (상세 메타와 공용) */
export const CuratorAvatar = ({
  name,
  tint,
  className = "h-5 w-5 text-[10.5px]",
}: {
  name: string;
  tint: string;
  className?: string;
}) => (
  <span
    aria-hidden="true"
    className={`grid flex-none place-items-center rounded-full font-extrabold text-surface ${collectionTintBg(tint)} ${className}`}
  >
    {name.charAt(0)}
  </span>
);

const CollectionCard = ({ collection }: { collection: CollectionSummary }) => {
  const {
    id,
    title,
    description,
    domain,
    tint,
    visibility,
    likeCount,
    viewCount,
    itemCount,
    curatorNickname,
    coverPosters,
  } = collection;

  return (
    <Link to={`/collections/${id}`} className={`block bg-surface ${cardLift}`}>
      <CollectionCollage
        posters={coverPosters}
        tint={tint}
        domain={domain}
        itemCount={itemCount}
        className="aspect-video"
      />
      <div className="px-[15px] pb-3.5 pt-[13px]">
        <div className="flex items-center gap-1.5 text-xs font-bold text-accent-ink">
          {collectionDomainLabel(domain)}
          {visibility === "PRIVATE" && (
            <span className="inline-flex items-center gap-1 rounded-full border border-line bg-canvas px-2 py-[2px] text-[11px] font-semibold text-ink-2">
              <LockSimple size={11} aria-hidden="true" />
              나만 보기
            </span>
          )}
        </div>
        {/* 목업 .col-title은 클램프 없음 - 다중행 허용, 카드 높이 자연 증가 */}
        <h3 className="mt-[3px] text-base font-extrabold leading-[1.3] tracking-[-0.01em] text-ink">
          {title}
        </h3>
        {description && (
          <p className="mt-1 truncate text-[13px] text-ink-2">{description}</p>
        )}
        <div className="mt-[11px] flex items-center gap-1.5 border-t border-line pt-2.5 text-[12.5px] text-ink-2">
          <div className="flex min-w-0 items-center gap-1.5">
            <CuratorAvatar name={curatorNickname} tint={tint} />
            <span className="truncate">{curatorNickname}</span>
          </div>
          <div className="ml-auto flex flex-none items-center gap-2.5 tabular-nums text-ink-3">
            <span className="inline-flex items-center gap-1">
              <Heart size={13} weight="fill" aria-hidden="true" />
              <b className="font-semibold text-ink-2">
                {likeCount.toLocaleString()}
              </b>
              <span className="sr-only">좋아요</span>
            </span>
            <span className="inline-flex items-center gap-1">
              <Eye size={13} aria-hidden="true" />
              <b className="font-semibold text-ink-2">
                {viewCount.toLocaleString()}
              </b>
              <span className="sr-only">조회</span>
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
};

/** 카드 최종 모양을 따르는 스켈레톤 (발견 페이지 로딩 상태) */
export const CollectionCardSkeleton = () => (
  <div
    aria-hidden="true"
    className="animate-pulse overflow-hidden rounded-panel border border-line bg-surface shadow-card"
  >
    <div className="aspect-video bg-line" />
    <div className="px-[15px] pb-3.5 pt-[13px]">
      <div className="h-3 w-10 rounded-input bg-canvas" />
      <div className="mt-2 h-4 w-4/5 rounded-input bg-line" />
      <div className="mt-2 h-3 w-3/5 rounded-input bg-canvas" />
      <div className="mt-3 flex items-center gap-1.5 border-t border-line pt-2.5">
        <div className="h-5 w-5 flex-none rounded-full bg-line" />
        <div className="h-3 w-16 rounded-input bg-canvas" />
        <div className="ml-auto h-3 w-14 rounded-input bg-canvas" />
      </div>
    </div>
  </div>
);

export default CollectionCard;

import { Link } from "react-router-dom";
import {
  CaretRight,
  GlobeHemisphereEast,
  LockSimple,
  Plus,
  PlusCircle,
} from "@phosphor-icons/react";
import type { CollectionSummary } from "@aod/shared/api";
import { collectionDomainLabel, collectionTintBg } from "@aod/shared/constants";
import MiniSpine from "./MiniSpine";

export interface BookcaseProps {
  collections: CollectionSummary[];
  /** 맨 아래 빈 선반("새 책장 만들기")을 눌렀을 때 */
  onCreate: () => void;
}

/**
 * 내 책장 - 컬렉션 하나가 선반 한 단 (mockups/collection-shelf-mockup.html 섹션 2).
 * 뒷벽은 그 컬렉션의 tint, 선반 앞턱의 이름표에 제목·작품 수·공개 범위.
 * 단 끝의 빈 칸은 "여기 더 꽂을 수 있다"는 표시이고, 맨 아래는 늘 빈 선반 한 단이다.
 * 책등은 목록 응답의 spines(상위 20권)로 그린다 - 단마다 상세를 부르면 조회수가 부푼다.
 */
const Bookcase = ({ collections, onCreate }: BookcaseProps) => (
  <div className="shelf-bookcase max-w-[1080px]">
    {collections.map((collection) => {
      const spines = collection.spines ?? [];
      const more = collection.itemCount - spines.length;
      const isPrivate = collection.visibility === "PRIVATE";
      return (
        <Link
          key={collection.id}
          to={`/collections/${collection.id}`}
          aria-label={`${collection.title} 책장 열기 - ${collection.itemCount}작품`}
          className="block"
        >
          <div className={`shelf-tier ${collectionTintBg(collection.tint)}`}>
            {spines.map((spine) => (
              <MiniSpine
                key={spine.contentId}
                spine={spine}
                domain={collection.domain}
              />
            ))}
            {more > 0 && (
              <span className="mx-1.5 mb-2.5 flex-none self-end text-xs font-bold tabular-nums text-surface/85">
                +{more}
              </span>
            )}
            <span className="shelf-ghost" aria-hidden="true">
              <Plus size={12} weight="bold" />
            </span>
          </div>
          <div className="shelf-tier-plank">
            <span className="min-w-0 truncate rounded-input border border-plank-edge bg-surface px-2.5 py-0.5 text-[13.5px] font-bold text-ink">
              {collection.title}
            </span>
            <span className="inline-flex flex-none items-center gap-1 text-[12.5px] text-ink-2">
              {collectionDomainLabel(collection.domain)} · {collection.itemCount}작품 ·
              {isPrivate ? (
                <LockSimple size={13} aria-hidden="true" />
              ) : (
                <GlobeHemisphereEast size={13} aria-hidden="true" />
              )}
              {isPrivate ? "나만 보기" : "공개"}
            </span>
            <span className="ml-auto hidden flex-none items-center gap-0.5 text-[13px] font-semibold text-ink-2 sm:inline-flex">
              책장 열기
              <CaretRight size={13} aria-hidden="true" />
            </span>
          </div>
        </Link>
      );
    })}
    <button
      type="button"
      onClick={onCreate}
      className="flex h-[132px] w-full flex-col items-center justify-center gap-1 bg-canvas text-ink-2 outline-dashed outline-[1.5px] -outline-offset-[12px] outline-line-strong transition-colors hover:text-ink lg:h-[150px]"
    >
      <span className="inline-flex items-center gap-1.5 text-[15px] font-bold text-ink">
        <PlusCircle size={18} aria-hidden="true" />새 책장 만들기
      </span>
      <span className="text-[13px]">빈 선반 한 단을 더 답니다</span>
    </button>
  </div>
);

/** 단 3개 모양의 로딩 스켈레톤 */
export const BookcaseSkeleton = () => (
  <div aria-hidden="true" className="shelf-bookcase max-w-[1080px] animate-pulse">
    {Array.from({ length: 3 }, (_, i) => (
      <div key={i}>
        <div className="h-[140px] bg-line lg:h-[172px]" />
        <div className="shelf-tier-plank">
          <div className="h-5 w-32 rounded-input bg-surface" />
        </div>
      </div>
    ))}
  </div>
);

export default Bookcase;

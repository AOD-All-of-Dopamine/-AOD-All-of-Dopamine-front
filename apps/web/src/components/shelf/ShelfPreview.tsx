import { CSSProperties } from "react";
import { GlobeHemisphereEast, LockSimple } from "@phosphor-icons/react";
import type { CollectionVisibility } from "@aod/shared/api";
import { collectionDomainLabel, collectionTintBg } from "@aod/shared/constants";
import { spineFormat } from "./shelfFormat";

/** 미리보기에 세워 두는 빈 책등 수 - 규격 변주(contentId 해시)의 씨앗으로 1..N 을 쓴다 */
const GHOST_SPINES = 9;

export interface ShelfPreviewProps {
  title: string;
  domain: string;
  tint: string;
  visibility: CollectionVisibility;
}

/**
 * 새 컬렉션 미리보기 - "내 책장에 이렇게 한 단이 생긴다".
 * 내 책장(Bookcase)의 한 단과 같은 마크업·같은 클래스라 만든 뒤 보게 될 모습 그대로다.
 * 입력이 곧바로 물성으로 돌아온다: 이름 → 이름표, 분야 → 빈 책등의 규격(블루레이·게임 케이스·
 * 단행본·소설책), 색 → 뒷벽, 공개 범위 → 이름표 옆 표시.
 */
const ShelfPreview = ({ title, domain, tint, visibility }: ShelfPreviewProps) => {
  const name = title.trim();
  const isPrivate = visibility === "PRIVATE";
  const domainLabel = collectionDomainLabel(domain);

  return (
    <div aria-hidden="true" className="shelf-bookcase shelf-preview">
      <div className={`shelf-tier ${collectionTintBg(tint)}`}>
        {Array.from({ length: GHOST_SPINES }, (_, i) => {
          const { w, h } = spineFormat(domain, i + 1);
          return (
            <span
              key={i}
              className="shelf-ghost shelf-ghost-spine"
              style={{ "--w": `${w}px`, "--h": `${h}px` } as CSSProperties}
            />
          );
        })}
        <span className="ml-3 self-center text-[13px] font-semibold text-surface/80 max-sm:hidden">
          {domainLabel} 작품이 여기에 꽂혀요
        </span>
      </div>
      <div className="shelf-tier-plank">
        <span
          className={`min-w-0 truncate rounded-input border border-plank-edge bg-surface px-2.5 py-0.5 text-[13.5px] font-bold ${
            name ? "text-ink" : "text-ink-3"
          }`}
        >
          {name || "컬렉션 이름"}
        </span>
        <span className="inline-flex flex-none items-center gap-1 text-[12.5px] text-ink-2">
          {domainLabel} · 0작품 ·
          {isPrivate ? <LockSimple size={13} /> : <GlobeHemisphereEast size={13} />}
          {isPrivate ? "나만 보기" : "공개"}
        </span>
      </div>
    </div>
  );
};

export default ShelfPreview;

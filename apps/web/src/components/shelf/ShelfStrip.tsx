import { CSSProperties } from "react";
import type { CollectionSpine } from "@aod/shared/api";
import { collectionTintBg } from "@aod/shared/constants";
import { spineFormat, spineTextureUrl } from "./shelfFormat";

/** 띠 폭(96px) 안에 빈 칸까지 들어가는 책등 수 */
const STRIP_SPINES = 9;

export interface ShelfStripProps {
  spines: CollectionSpine[];
  domain: string;
  tint: string;
  /** 지금 담으려는 작품 - 이 작품의 책등은 맨 끝 자리에 따로 그린다 */
  contentId: number;
  /** 이미 담겨 있다 - 끝 자리가 빈 칸 대신 강조된 책등이 된다 */
  contains: boolean;
  /** 방금 담았다 - 그 책등이 떨어져 들어온다 */
  justAdded: boolean;
}

/**
 * 담기 목록 행의 미니 책장 - "이 작품이 어디에 꽂히는지"를 보여 준다.
 * 끝 자리는 빈 칸(점선)이고, 담으면 그 자리에 액센트 색 책등이 꽂힌다.
 * 제목을 읽을 크기가 아니라 책등은 질감만 있다(제목·아이콘 없음).
 */
const ShelfStrip = ({
  spines,
  domain,
  tint,
  contentId,
  contains,
  justAdded,
}: ShelfStripProps) => (
  <span
    aria-hidden="true"
    className={`shelf-strip ${collectionTintBg(tint)}`}
  >
    {spines
      .filter((spine) => spine.contentId !== contentId)
      .slice(0, STRIP_SPINES)
      .map((spine) => {
        const { w, h } = spineFormat(domain, spine.contentId);
        const texture = spineTextureUrl(spine.posterUrl);
        return (
          <span
            key={spine.contentId}
            className="shelf-spine"
            style={
              {
                "--w": `${w}px`,
                "--h": `${h}px`,
                ...(texture
                  ? { "--img": `url("${texture.replace(/"/g, "%22")}")` }
                  : {}),
              } as CSSProperties
            }
          />
        );
      })}
    {contains ? (
      <span
        className={`shelf-strip-mine${justAdded ? " shelf-dropping" : ""}`}
      />
    ) : (
      <span className="shelf-strip-gap" />
    )}
  </span>
);

export default ShelfStrip;

import { CSSProperties } from "react";
import type { CollectionSpine } from "@aod/shared/api";
import { spineFormat, spineTextureUrl } from "./shelfFormat";
import { useNearViewport } from "./useNearViewport";

/**
 * 누를 수 없는 작은 책등 - 목록의 선반(내 책장의 한 단)에 꽂힌다.
 * 규격·변주·질감은 상세의 ShelfSpine 과 같은 규칙(shelfFormat)이라 같은 작품은 어디서나 같은 책등이다.
 * 크기는 부모의 --k 가 줄인다. 도메인 아이콘은 뺀다 - 이 크기에서는 점으로 뭉갠다.
 */
const MiniSpine = ({ spine, domain }: { spine: CollectionSpine; domain: string }) => {
  const [ref, near] = useNearViewport<HTMLSpanElement>();
  const { w, h } = spineFormat(domain, spine.contentId);
  const texture = near ? spineTextureUrl(spine.posterUrl) : null;
  // --w/--h(px)는 --k 배율용, --wn/--hn(단위 없음)은 장면 높이에 비례시키는 ShelfScene 용
  const style = {
    "--w": `${w}px`,
    "--h": `${h}px`,
    "--wn": w,
    "--hn": h,
    ...(texture ? { "--img": `url("${texture.replace(/"/g, "%22")}")` } : {}),
  } as CSSProperties;

  return (
    <span ref={ref} className="shelf-spine" style={style}>
      <span className="shelf-spine-title">{spine.title}</span>
    </span>
  );
};

export default MiniSpine;

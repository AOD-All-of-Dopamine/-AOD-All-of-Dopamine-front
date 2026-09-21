import type { CollectionSpine } from "@aod/shared/api";
import { collectionTintBg } from "@aod/shared/constants";
import MiniSpine from "./MiniSpine";

export interface ShelfSceneProps {
  spines: CollectionSpine[];
  /** 컬렉션 도메인 - 책등 규격을 정한다 (컬렉션은 단일 도메인) */
  domain: string;
  tint: string;
  /** 비율·라운드는 쓰는 쪽이 정한다 (발견 카드는 aspect-video) */
  className?: string;
  /** 우상단 "N작품" pill (미전달 시 생략) */
  itemCount?: number;
}

/**
 * 선반 한 토막 - 발견 카드의 커버 (포스터 3장 콜라주의 자리).
 * 뒷벽은 tint, 책등이 선반 판 위에 서 있다. 폭을 넘는 책등은 잘린 채로 둔다 -
 * 선반이 프레임 밖으로 이어지는 것처럼 보인다.
 */
const ShelfScene = ({
  spines,
  domain,
  tint,
  className = "",
  itemCount,
}: ShelfSceneProps) => (
  <div
    className={`relative flex flex-col overflow-hidden ${collectionTintBg(tint)} ${className}`}
  >
    <div className="shelf-scene">
      {spines.map((spine) => (
        <MiniSpine key={spine.contentId} spine={spine} domain={domain} />
      ))}
    </div>
    <div className="shelf-scene-plank" />
    {itemCount !== undefined && (
      <span className="absolute right-2.5 top-2.5 rounded-full bg-ink/60 px-2.5 py-[3px] text-xs font-bold text-surface backdrop-blur-sm">
        {itemCount}작품
      </span>
    )}
  </div>
);

export default ShelfScene;

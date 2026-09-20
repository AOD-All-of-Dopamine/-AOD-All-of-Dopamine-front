import { CheckCircle } from "@phosphor-icons/react";
import type { WorkSummary } from "@aod/shared/types";
import { thumbnailFallbackMap, type Category } from "../../constants/thumbnail";
import Tag from "../ui/Tag";
import { cardBase } from "../ui/cardStyles";
import { workCardMeta, workCardTags } from "../ui/workCardInfo";

const categoryOf = (domain?: string): Category => {
  const key = domain?.toLowerCase() as Category;
  return key in thumbnailFallbackMap ? key : "movie";
};

export interface OnboardingWorkTileProps {
  work: WorkSummary;
  selected: boolean;
  onToggle: (work: WorkSummary) => void;
  /** 저장이 도는 동안 잠근다 — 날아가는 중인 좋아요를 화면에서 해제하면 서버와 어긋난다. */
  disabled?: boolean;
}

/**
 * 온보딩에서 고르는 작품 타일.
 * WorkCard 와 생김새는 같지만 루트가 <Link> 가 아니라 <button> 이다 — 이 화면에서 카드를 누르는 것은
 * "상세로 가기"가 아니라 "고르기"이고, 상세로 새면 고른 것을 잃는다.
 * 조각(cardBase·workCardMeta·workCardTags·Tag·thumbnailFallbackMap)과 썸네일 비율(게임만 가로)은
 * WorkCard·SkeletonCard 와 똑같이 맞춰 스켈레톤 → 실데이터 전환에서 레이아웃이 튀지 않게 한다.
 *
 * 선택 상태는 aria-pressed 로만 알린다(DomainChip 관례) — 이름에 "선택/해제"를 넣으면
 * 눌림 상태와 겹쳐 "선택 해제, 눌림"처럼 어긋나게 읽힌다. 눈으로도 색 하나에 기대지 않는다:
 * 테두리 굵기(ring)와 우상단 체크 배지가 함께 바뀐다.
 * 카드 하단 foot 행은 생략한다 — 고르는 화면이라 평점·요일보다 제목·연도·장르가 먼저다.
 */
const OnboardingWorkTile = ({
  work,
  selected,
  onToggle,
  disabled = false,
}: OnboardingWorkTileProps) => {
  const category = categoryOf(work.domain);
  const meta = workCardMeta(work);
  const tags = workCardTags(work);

  return (
    <button
      type="button"
      onClick={() => onToggle(work)}
      disabled={disabled}
      aria-pressed={selected}
      aria-label={work.title}
      className={`relative flex flex-col bg-surface text-left transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 ${cardBase} ${
        selected ? "border-accent-ink ring-2 ring-accent-ink" : "hover:border-line-strong"
      }`}
    >
      <div
        className={`overflow-hidden bg-canvas ${
          category === "game" ? "aspect-[460/215]" : "aspect-[2/3]"
        }`}
      >
        {work.thumbnail ? (
          <img src={work.thumbnail} alt="" loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full w-full place-items-center">
            <img
              src={thumbnailFallbackMap[category]}
              alt=""
              loading="lazy"
              className="w-[clamp(32px,30%,64px)] opacity-80"
            />
          </div>
        )}
      </div>

      {selected && (
        <span className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-surface text-accent-ink shadow-card">
          <CheckCircle size={22} weight="fill" aria-hidden="true" />
        </span>
      )}

      <div className="flex flex-1 flex-col gap-[7px] px-[15px] pb-[14px] pt-[13px]">
        <div className="truncate text-[15.5px] font-bold tracking-[-0.01em] text-ink">{work.title}</div>
        {meta && <div className="truncate text-[13px] text-ink-2">{meta}</div>}
        {tags && tags.length > 0 && (
          <div className="flex flex-wrap gap-[5px]">
            {tags.map((tag) => (
              <Tag key={tag}>{tag}</Tag>
            ))}
          </div>
        )}
      </div>
    </button>
  );
};

export default OnboardingWorkTile;

import { Link } from "react-router-dom";
import { WorkSummary } from "@aod/shared/types";
import { steamReviewDescKo } from "@aod/shared/constants";
import { cardLift } from "./cardStyles";
import { workCardMeta } from "./workCardInfo";

/**
 * 혼합 목록(탐색 전체 탭·검색)용 게임 컴팩트 가로 행 -
 * mixed-grid-mockup.html 1-C 확정안. 좌측 16:9 무크롭 썸네일(42% 폭, 인셋) +
 * 우측 제목·meta(도메인·연도·개발사)·Steam 평가(desc + 긍정 %).
 * 그리드 배치(2칸 스팬 x2 스택 / <lg 풀폭)는 소비처 셀 래퍼가 담당한다.
 */
export interface GameCompactCardProps {
  work: WorkSummary;
  to: string;
  /** 썸네일 부재 시 16:9 영역 중앙에 표시할 도메인 아이콘 */
  fallbackIconUrl?: string;
}

const GameCompactCard = ({ work, to, fallbackIconUrl }: GameCompactCardProps) => {
  const meta = workCardMeta(work, { withDomain: true });
  const desc = work.steamReviewDesc
    ? steamReviewDescKo(work.steamReviewDesc)
    : undefined;
  const pct =
    typeof work.steamPositivePct === "number"
      ? work.steamPositivePct
      : undefined;

  return (
    <Link to={to} className={`flex flex-row bg-surface ${cardLift}`}>
      <div className="my-3 ml-3 w-[42%] flex-none self-center overflow-hidden rounded-input bg-canvas">
        <div className="aspect-video">
          {work.thumbnail ? (
            <img
              src={work.thumbnail}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="grid h-full w-full place-items-center">
              {fallbackIconUrl && (
                <img
                  src={fallbackIconUrl}
                  alt=""
                  loading="lazy"
                  className="w-[clamp(28px,30%,48px)] opacity-80"
                />
              )}
            </div>
          )}
        </div>
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-center px-[13px] py-[11px]">
        <div className="truncate text-[14.5px] font-bold leading-[1.3] tracking-[-0.01em] text-ink">
          {work.title}
        </div>
        {meta && (
          <div className="mt-0.5 truncate text-[12.5px] text-ink-3">{meta}</div>
        )}
        {(desc || pct !== undefined) && (
          <div className="mt-1.5 truncate text-[12.5px] text-ink-3">
            {desc && <span className="font-bold text-ink">{desc}</span>}
            {desc && pct !== undefined && " · "}
            {pct !== undefined && <span className="tabular-nums">{pct}%</span>}
          </div>
        )}
      </div>
    </Link>
  );
};

export default GameCompactCard;

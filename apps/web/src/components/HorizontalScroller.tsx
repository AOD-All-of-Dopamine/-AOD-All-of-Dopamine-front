import { useNavigate } from "react-router-dom";
import { DOMAIN_LABEL_MAP } from "@aod/shared/constants";
import PurpleStar from "../assets/purple-star.svg";
import ViewIcon from "../assets/view-all-icon.svg";

export interface WorkItem {
  id: string;
  title: string;
  thumbnail: string;
  score?: number;
  domain?: string;
  year?: number;
  // [✨ 기능 개편] 순위 표시를 위해 rank 필드 추가
  rank?: number;
}

interface HorizontalScrollerProps {
  title?: string;
  items: WorkItem[];
  onTitleClick?: () => void;
  showViewAll?: boolean;
  onItemClick?: (id: string) => void;
}

function HorizontalScroller({
  title,
  items,
  onTitleClick,
  showViewAll = false,
  onItemClick,
}: HorizontalScrollerProps) {
  const navigate = useNavigate();

  const handleCardClick = (id: string) => {
    if (onItemClick) {
      onItemClick(id);
    } else {
      navigate(`/work/${id}`);
    }
  };

  return (
    <section className="mb-6">
      {/* 헤더 */}
      {title && (
        <div className="flex justify-between items-center mb-2">
          <h2
            className="text-lg font-[PretendardVariable] font-semibold cursor-pointer select-none"
            onClick={onTitleClick}
          >
            {title}
          </h2>

          {showViewAll && (
            <button
              onClick={onTitleClick}
              className="flex items-center gap-1 font-[PretendardVariable] text-[14px] text-[#B2B1B3]"
            >
              <span>전체보기</span>
              <img src={ViewIcon} alt="전체보기" className="w-3 h-3" />
            </button>
          )}
        </div>
      )}

      {/* 스크롤 컨테이너 */}
      <div className="flex overflow-x-auto gap-3 scrollbar-hide">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex-shrink-0 w-40 cursor-pointer relative"
            onClick={() => handleCardClick(item.id)}
          >
            {/* [✨ 기능 개편] 랭크 뱃지 추가 (좌측 상단 넷플릭스 스타일 순위 뱃지) */}
            {typeof item.rank === 'number' && (
              <div className="absolute -top-3 -left-2 z-10 w-9 h-9 bg-black rounded-lg border-2 border-[#855BFF] flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-lg font-[PretendardVariable] leading-none tracking-tighter">
                  {item.rank}
                </span>
              </div>
            )}
            <img
              src={item.thumbnail}
              alt={item.title}
              className="w-full h-56 object-cover rounded-md mb-2 shadow-md"
              onError={(e) => {
                e.currentTarget.src = "https://via.placeholder.com/160x220?text=No";
              }}
            />
            <div className="text-sm font-[PretendardVariable] font-medium truncate">
              {item.title}
            </div>
            {(item.domain || item.year) && (
              <div className="font-[PretendardVariable] text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                {item.domain && (
                  <span>{DOMAIN_LABEL_MAP[item.domain] ?? item.domain}</span>
                )}
                {item.year && ` • ${new Date(item.year).getFullYear()}`}
              </div>
            )}
            {typeof item.score === "number" && (
              <div className="flex items-center text-[#855BFF] text-sm font-medium gap-1 mt-0.5">
                <img src={PurpleStar} alt="평점" className="w-4 h-4" />{" "}
                {item.score.toFixed(1)}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

export default HorizontalScroller;

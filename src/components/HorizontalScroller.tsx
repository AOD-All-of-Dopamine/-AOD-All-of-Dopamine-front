import { useNavigate } from "react-router-dom";
import { DOMAIN_LABEL_MAP } from "../constants/domain";
import PurpleStar from "../assets/purple-star.svg";
import ViewIcon from "../assets/view-all-icon.svg";

export interface WorkItem {
  id: string;
  title: string;
  thumbnail: string;
  score?: number;
  domain?: string;
  year?: number;
}

interface HorizontalScrollerProps {
  title?: string;
  items: WorkItem[];
  onTitleClick?: () => void;
  showViewAll?: boolean;
}

function HorizontalScroller({
  title,
  items,
  onTitleClick,
  showViewAll = false,
}: HorizontalScrollerProps) {
  const navigate = useNavigate();

  const handleCardClick = (id: string) => {
    navigate(`/work/${id}`);
  };

  return (
    <section className="mb-6">
      {/* 헤더 */}
      {title && (
        <div className="flex justify-between items-center mb-2 px-4">
          <h2
            className="text-lg font-semibold cursor-pointer select-none"
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
            className="flex-shrink-0 w-40 cursor-pointer"
            onClick={() => handleCardClick(item.id)}
          >
            <img
              src={item.thumbnail}
              alt={item.title}
              className="w-full h-56 object-cover rounded-md mb-2"
            />
            <div className="text-sm font-medium truncate">{item.title}</div>
            {(item.domain || item.year) && (
              <div className="text-xs text-gray-400 flex items-center gap-1">
                {item.domain && (
                  <span>{DOMAIN_LABEL_MAP[item.domain] ?? item.domain}</span>
                )}
                {item.year && ` • ${new Date(item.year).getFullYear()}`}
              </div>
            )}
            {typeof item.score === "number" && (
              <div className="flex items-center gap-1 font-[PretendardVariable] text-[14px] text-[#855BFF]">
                <img src={PurpleStar} alt="평점" className="w-3 h-3" />{" "}
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

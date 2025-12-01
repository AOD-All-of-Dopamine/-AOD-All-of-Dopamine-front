import { useNavigate } from "react-router-dom";

export interface WorkItem {
  id: string;
  title: string;
  thumbnail: string;
  score: number;
}

interface HorizontalScrollerProps {
  title: string;
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
      <div className="flex justify-between items-center mb-3 px-4">
        <h2 className="text-base font-semibold text-white tracking-tight">
          {title}
        </h2>
        {showViewAll && (
          <button
            className="flex items-center gap-0.5 text-sm text-[var(--grey-300)]"
            onClick={onTitleClick}
          >
            전체보기
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M6 12L10 8L6 4"
                stroke="var(--grey-300)"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        )}
      </div>

      {/* 스크롤 컨테이너 */}
      <div className="flex overflow-x-auto gap-2 px-4 scrollbar-hide">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex-shrink-0 w-[105px] cursor-pointer"
            onClick={() => handleCardClick(item.id)}
          >
            {/* 썸네일 */}
            <div className="w-[105px] h-[147px] bg-[var(--bg-secondary)] rounded overflow-hidden mb-1">
              <img
                src={item.thumbnail}
                alt={item.title}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.src = "https://via.placeholder.com/105x147?text=No+Image";
                }}
              />
            </div>
            {/* 타이틀 */}
            <div className="text-sm text-white truncate">{item.title}</div>
            {/* 평점 */}
            <div className="flex items-center gap-0.5 mt-0.5">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path
                  d="M7 1L8.854 4.854L13 5.527L10 8.472L10.708 12.6L7 10.654L3.292 12.6L4 8.472L1 5.527L5.146 4.854L7 1Z"
                  fill="var(--purple)"
                />
              </svg>
              <span className="text-xs text-[var(--purple)]">
                {item.score.toFixed(1)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default HorizontalScroller;

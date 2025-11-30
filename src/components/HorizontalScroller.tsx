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
      <div className="flex justify-between items-center mb-2 px-4">
        <h2
          className="text-lg font-semibold cursor-pointer select-none"
          onClick={onTitleClick}
        >
          {title}
        </h2>
        {showViewAll && (
          <span
            className="text-sm text-blue-500 cursor-pointer select-none"
            onClick={onTitleClick}
          >
            전체보기 →
          </span>
        )}
      </div>

      {/* 스크롤 컨테이너 */}
      <div className="flex overflow-x-auto gap-3 px-4 scrollbar-hide">
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
            <div className="text-xs text-gray-400 mt-1">
              ⭐ {item.score.toFixed(1)}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default HorizontalScroller;

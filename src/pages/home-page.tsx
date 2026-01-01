import { useNavigate } from "react-router-dom";
import SearchBar from "../components/SearchBar";
import HorizontalScroller from "../components/HorizontalScroller";
import { useWorks } from "../hooks/useWorks";
import NewIcon from "../assets/home/new-icon.png";
import LikeIcon from "../assets/home/likes-icon.svg";
import BookmarkIcon from "../assets/home/bookmarks-icon.svg";

// 랭킹 아이템 타입
interface RankingItemProps {
  rank: number;
  title: string;
  thumbnail: string;
  change: number;
  changeType: "up" | "down" | "same";
  onClick: () => void;
}

// 랭킹 아이템 컴포넌트
function RankingItem({
  rank,
  title,
  thumbnail,
  change,
  changeType,
  onClick,
}: RankingItemProps) {
  return (
    <li
      className="flex items-center justify-between py-1.5 cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-center gap-2">
        <span className="w-5 text-lg font-semibold text-white text-center">
          {rank}
        </span>
        <div className="w-10 h-[54px] bg-[var(--bg-secondary)] rounded-sm overflow-hidden">
          <img
            src={thumbnail}
            alt={title}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.src = "https://via.placeholder.com/40x54?text=No";
            }}
          />
        </div>
        <span className="text-sm text-white">{title}</span>
      </div>
      <div className="flex items-center gap-0.5 w-5">
        {changeType !== "same" && (
          <>
            <span
              className={`text-xs ${changeType === "up" ? "text-[var(--red)]" : "text-[var(--blue)]"}`}
            >
              {change}
            </span>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              {changeType === "up" ? (
                <path d="M6 2L10 8H2L6 2Z" fill="var(--red)" />
              ) : (
                <path d="M6 10L2 4H10L6 10Z" fill="var(--blue)" />
              )}
            </svg>
          </>
        )}
        {changeType === "same" && (
          <span className="text-xs text-[var(--grey-400)]">-</span>
        )}
      </div>
    </li>
  );
}

// 랭킹 섹션 컴포넌트
interface RankingSectionProps {
  items: Array<{
    id: string;
    title: string;
    thumbnail: string;
  }>;
  onViewAll: () => void;
}

function RankingSection({ items, onViewAll }: RankingSectionProps) {
  const navigate = useNavigate();

  // 상위 3개만 표시
  const topItems = items.slice(0, 3);

  return (
    <article className="px-4 mb-6">
      <header className="flex items-center justify-between mb-1.5">
        <h2 className="text-base font-semibold text-white">랭킹</h2>
        <button
          className="flex items-center gap-0.5 text-sm text-[var(--grey-300)]"
          onClick={onViewAll}
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
      </header>
      <ul>
        {topItems.map((item, index) => (
          <RankingItem
            key={item.id}
            rank={index + 1}
            title={item.title}
            thumbnail={item.thumbnail}
            change={1}
            changeType={index % 2 === 0 ? "up" : "down"}
            onClick={() => navigate(`/work/${item.id}`)}
          />
        ))}
      </ul>
    </article>
  );
}

export default function HomePage() {
  const navigate = useNavigate();

  // AI 맞춤 추천 - 임시로 GAME 도메인 데이터 사용
  const { data: recommendations, isLoading: isLoadingRecommendations } =
    useWorks({
      domain: "GAME",
      size: 10,
    });

  // 랭킹 - 평점 높은 순
  const { data: rankings, isLoading: isLoadingRankings } = useWorks({
    domain: "GAME",
    size: 10,
    sortBy: "masterTitle",
    sortDirection: "asc",
  });

  // 최신 리뷰 작품 - 임시로 최근 작품 사용
  const { data: recentReviews, isLoading: isLoadingRecentReviews } = useWorks({
    size: 10,
  });

  const handleSearch = (query: string) => {
    navigate(`/explore?keyword=${encodeURIComponent(query)}`);
  };

  const handleRankingClick = () => {
    navigate("/ranking");
  };

  const mapToWorkItem = (item: any) => ({
    id: String(item.id),
    title: item.title,
    thumbnail: item.thumbnail || "https://via.placeholder.com/160x220",
    score: item.score || 0,
    domain: item.domain,
    year: item.releaseDate,
  });

  const mapToRankingItem = (item: any) => ({
    id: String(item.id),
    title: item.title,
    thumbnail: item.thumbnail || "https://via.placeholder.com/40x54",
  });

  return (
    <div className="flex flex-col min-h-screen w-full max-w-2xl mx-auto px-5">
      {/* 검색 바 */}
      <SearchBar onSearch={handleSearch} />

      <div className="pb-20">
        {/* 하단 동그라미 네비게이션 */}
        <div className="flex justify-center gap-11 mt-20 mb-10">
          {[
            { id: 1, path: "/new", icon: NewIcon, label: "공개예정" },
            { id: 2, path: "/profile/likes", icon: LikeIcon, label: "좋아요" },
            {
              id: 3,
              path: "/profile/bookmarks",
              icon: BookmarkIcon,
              label: "북마크",
            },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              className="flex flex-col items-center gap-2 active:scale-95 transition"
            >
              {/* 동그라미 */}
              <div className="w-13 h-13 rounded-full bg-[#363539] flex items-center justify-center shadow-md">
                <img
                  src={item.icon}
                  alt="nav-icon"
                  className="w-6 h-6 object-contain"
                />
              </div>
              {/* 라벨 */}
              <span className="text-sm text-gray-300">{item.label}</span>
            </button>
          ))}
        </div>

        {/* 랭킹 */}
        {!isLoadingRankings &&
          rankings?.content &&
          rankings.content.length > 0 && (
            <RankingSection
              items={rankings.content.map(mapToRankingItem)}
              onViewAll={handleRankingClick}
            />
          )}

        {/* AI 맞춤 추천 */}
        {!isLoadingRecommendations && recommendations?.content && (
          <HorizontalScroller
            title="모두의도파민님만을 위한 추천"
            items={recommendations.content.map(mapToWorkItem)}
            showViewAll
          />
        )}

        {/* 최신 리뷰 작품 */}
        {!isLoadingRecentReviews && recentReviews?.content && (
          <HorizontalScroller
            title="최신 리뷰 작품"
            items={recentReviews.content.map(mapToWorkItem)}
          />
        )}
      </div>
    </div>
  );
}

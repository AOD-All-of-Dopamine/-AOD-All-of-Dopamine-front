import { useNavigate } from "react-router-dom";
import SearchBar from "../components/SearchBar";
import HorizontalScroller from "../components/HorizontalScroller";
import { useWorks } from "../hooks/useWorks";

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

  const handleAIRecommendationClick = () => {
    console.log("Navigate to AI recommendations");
  };

  const handleRankingClick = () => {
    navigate("/ranking");
  };

  const mapToWorkItem = (item: any) => ({
    id: String(item.id),
    title: item.title,
    thumbnail: item.thumbnail || "https://via.placeholder.com/160x220",
    score: item.score || 0,
  });

  return (
    <>
      {/* 검색 바 */}
      <SearchBar onSearch={handleSearch} />
      <div className="max-w-[1200px] mx-auto pb-20 px-4">
        {/* AI 맞춤 추천 */}
        {!isLoadingRecommendations && recommendations?.content && (
          <HorizontalScroller
            title="AI 맞춤 추천"
            items={recommendations.content.map(mapToWorkItem)}
            onTitleClick={handleAIRecommendationClick}
            showViewAll
          />
        )}

        {/* 랭킹 */}
        {!isLoadingRankings && rankings?.content && (
          <HorizontalScroller
            title="랭킹"
            items={rankings.content.map(mapToWorkItem)}
            onTitleClick={handleRankingClick}
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
    </>
  );
}

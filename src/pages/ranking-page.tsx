import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { rankingApi, ExternalRanking } from "../api/rankingApi";
import Header from "../components/common/Header";

type Category = "movie" | "tv" | "game" | "webtoon" | "webnovel";
type Period = "daily" | "weekly" | "monthly";

interface RankingItem {
  id: string;
  rank: number;
  title: string;
  thumbnail: string;
  score: number;
  change?: "up" | "down" | "new" | number;
}

const categories: { id: Category; label: string }[] = [
  { id: "movie", label: "영화" },
  { id: "tv", label: "TV" },
  { id: "game", label: "게임" },
  { id: "webtoon", label: "웹툰" },
  { id: "webnovel", label: "웹소설" },
];

const periods: { id: Period; label: string }[] = [
  { id: "daily", label: "일간" },
  { id: "weekly", label: "주간" },
  { id: "monthly", label: "월간" },
];

const PLATFORM_MAPPING: Record<Category, string> = {
  movie: "TMDB_MOVIE",
  tv: "TMDB_TV",
  game: "STEAM_GAME",
  webtoon: "NAVER_WEBTOON",
  webnovel: "NAVER_SERIES",
};

const BACKEND_PLATFORM_MAPPING: Record<string, string> = {
  TMDB_MOVIE: "TMDB_MOVIE",
  TMDB_TV: "TMDB_TV",
  STEAM_GAME: "Steam",
  NAVER_WEBTOON: "NaverWebtoon",
  NAVER_SERIES: "NaverSeries",
};

export default function RankingPage() {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState<Category>("game");
  const [selectedPeriod, setSelectedPeriod] = useState<Period>("daily");
  const [rankings, setRankings] = useState<RankingItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchRankings = async () => {
      setLoading(true);
      try {
        const frontendPlatform = PLATFORM_MAPPING[selectedCategory];
        const backendPlatform = BACKEND_PLATFORM_MAPPING[frontendPlatform];
        const data = await rankingApi.getRankingsByPlatform(backendPlatform);
        const mappedData: RankingItem[] = data.map((item: ExternalRanking) => ({
          id: item.contentId ? String(item.contentId) : `no-content-${item.id}`,
          rank: item.ranking,
          title: item.title,
          thumbnail: item.thumbnailUrl || "https://via.placeholder.com/60x80",
          score: 0,
          change: "new",
        }));
        setRankings(mappedData);
      } catch (error) {
        console.error(error);
        setRankings([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRankings();
  }, [selectedCategory]);

  const handleCardClick = (id: string) => {
    if (id.startsWith("no-content-")) {
      alert("이 작품의 상세 정보가 아직 준비되지 않았습니다.");
      return;
    }
    navigate(`/work/${id}`);
  };

  const renderChange = (change?: "up" | "down" | "new" | number) => {
    if (!change) return null;
    if (change === "new")
      return <span className="text-[#646cff] font-semibold text-xs">NEW</span>;
    if (change === "up")
      return <span className="text-green-400 font-semibold text-xs">▲</span>;
    if (change === "down")
      return <span className="text-red-500 font-semibold text-xs">▼</span>;
    if (typeof change === "number") {
      return change > 0 ? (
        <span className="text-green-400 font-semibold text-xs">▲ {change}</span>
      ) : (
        <span className="text-red-500 font-semibold text-xs">
          ▼ {Math.abs(change)}
        </span>
      );
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#242424] text-white pt-[40px]">
      <Header
        title="랭킹"
        rightIcon="search"
        onRightClick={() => alert("검색 기능 준비 중")}
        bgColor="#242424"
      />
      {/* 필터 섹션 */}
      <div className="sticky top-0 z-50 bg-[#242424] border-b border-[#333] pb-2">
        {/* 기간 탭 */}
        <div className="flex justify-center px-5">
          {periods.map((p) => (
            <button
              key={p.id}
              onClick={() => setSelectedPeriod(p.id)}
              className={`flex-1 text-center py-4 cursor-pointer transition-all select-none ${
                selectedPeriod === p.id
                  ? "border-b-2 border-white text-white font-semibold"
                  : "text-gray-400"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* 카테고리 */}
        <div className="flex gap-2 px-5 overflow-x-auto scrollbar-hide py-3">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`flex-shrink-0 px-5 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                selectedCategory === cat.id
                  ? "bg-[#646cff] text-white"
                  : "bg-[#2a2a2a] text-gray-400"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* 콘텐츠 */}
      <div className="flex-1 overflow-y-auto p-5">
        {loading ? (
          <div className="text-center py-12 text-gray-400">Loading...</div>
        ) : rankings.length > 0 ? (
          <div className="flex flex-col gap-3">
            {rankings.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-4 p-3 bg-[#242424] rounded-md cursor-pointer transition-transform hover:bg-[#242424] hover:translate-x-1"
                onClick={() => handleCardClick(item.id)}
              >
                <div
                  className={`w-10 text-center font-bold text-xl ${
                    item.rank === 1
                      ? "text-yellow-400"
                      : item.rank === 2
                        ? "text-gray-300"
                        : item.rank === 3
                          ? "text-[#cd7f32]"
                          : "text-[#646cff]"
                  }`}
                >
                  {item.rank}
                </div>
                <img
                  src={item.thumbnail}
                  alt={item.title}
                  className="w-15 h-20 rounded-md object-cover bg-[#242424] flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm mb-1 truncate">
                    {item.title}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    <span className="text-yellow-400 font-semibold">
                      ⭐ {item.score.toFixed(1)}
                    </span>
                    {renderChange(item.change)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-gray-400 py-12">
            랭킹 데이터가 없습니다.
          </div>
        )}
      </div>
    </div>
  );
}

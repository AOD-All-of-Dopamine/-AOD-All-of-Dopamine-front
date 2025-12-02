import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { rankingApi, ExternalRanking } from "../api/rankingApi";
import Header from "../components/common/Header";
import PurpleStar from "../assets/purple-star.svg";

type Category = "movie" | "tv" | "game" | "webtoon" | "webnovel";
type Period = "daily" | "weekly" | "monthly";

interface RankingItem {
  id: string;
  rank: number;
  title: string;
  thumbnail: string;
  score: number;
  change?: "up" | "down" | "new" | number;
  watchProviders?: string[];
  platform?: string;
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

const OTT_PLATFORMS = [
  "전체",
  "넷플릭스",
  "웨이브",
  "디즈니+",
  "왓챠",
  "티빙",
  "쿠팡플레이",
  "애플TV",
];

const WEBNOVEL_PLATFORMS = [
  "전체",
  "네이버시리즈",
  "카카오페이지",
];

// 한글-영어 OTT 플랫폼 매핑 (백엔드 데이터 형식에 맞춤)
const OTT_NAME_MAPPING: Record<string, string> = {
  "넷플릭스": "Netflix",
  "웨이브": "wavve",
  "디즈니+": "Disney Plus",
  "왓챠": "Watcha",
  "티빙": "TVING",
  "쿠팡플레이": "Coupang Play",
  "애플TV": "Apple TV",
};

// 웹소설 플랫폼 매핑
const WEBNOVEL_PLATFORM_MAPPING: Record<string, string> = {
  "네이버시리즈": "NaverSeries",
  "카카오페이지": "KakaoPage",
};
export default function RankingPage() {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState<Category>("game");
  const [selectedPeriod, setSelectedPeriod] = useState<Period>("daily");
  const [selectedOTT, setSelectedOTT] = useState<string>("전체");
  const [selectedWebnovel, setSelectedWebnovel] = useState<string>("전체");
  const [rankings, setRankings] = useState<RankingItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchRankings = async () => {
      setLoading(true);
      try {
        const frontendPlatform = PLATFORM_MAPPING[selectedCategory];
        const backendPlatform = BACKEND_PLATFORM_MAPPING[frontendPlatform];
        const data = await rankingApi.getRankingsByPlatform(backendPlatform);
        let mappedData: RankingItem[] = data.map((item: ExternalRanking) => ({
          id: item.contentId ? String(item.contentId) : `no-content-${item.id}`,
          rank: item.ranking,
          title: item.title,
          thumbnail: item.thumbnailUrl || "https://via.placeholder.com/60x80",
          score: 0,
          change: "new",
          watchProviders: item.watchProviders,
          platform: item.platform,
        }));

        // OTT 필터링 (TMDB만 해당)
        if (selectedOTT !== "전체" && (selectedCategory === "movie" || selectedCategory === "tv")) {
          const englishOTTName = OTT_NAME_MAPPING[selectedOTT];
          if (englishOTTName) {
            mappedData = mappedData.filter(
              (item) => item.watchProviders && item.watchProviders.includes(englishOTTName)
            );
          }
        }

        // 웹소설 플랫폼 필터링
        if (selectedWebnovel !== "전체" && selectedCategory === "webnovel") {
          const platformName = WEBNOVEL_PLATFORM_MAPPING[selectedWebnovel];
          if (platformName) {
            mappedData = mappedData.filter(
              (item) => item.platform === platformName
            );
          }
        }

        setRankings(mappedData);
      } catch (error) {
        console.error(error);
        setRankings([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRankings();
  }, [selectedCategory, selectedOTT, selectedWebnovel]);

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
    <div className="flex flex-col h-screen">
      <Header
        title="랭킹"
        rightIcon="search"
        onRightClick={() => alert("검색 기능 준비 중")}
        bgColor="#242424"
      />
      <div className="w-full max-w-2xl mx-auto px-5">
        {/* 필터 섹션 */}
        <div className="sticky top-[40px] z-50 bg-[#242424] border-b border-[#333] pt-3">
          {/* 기간 탭 */}
          <div className="flex justify-center">
            {periods.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedPeriod(p.id)}
                className={`flex-1 text-center py-3 cursor-pointer transition-all select-none ${
                  selectedPeriod === p.id
                    ? "border-b-2 border-white text-white font-semibold"
                    : "text-gray-400"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* 카테고리 */}
        <div className="flex gap-4 overflow-x-auto scrollbar-hide py-3 mt-10">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`flex-shrink-0 px-5 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                selectedCategory === cat.id
                  ? "bg-[#855BFF] text-white"
                  : "text-[#D3D3D3] border border-[#333]"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* OTT 필터 (영화/TV만 표시) */}
        {(selectedCategory === "movie" || selectedCategory === "tv") && (
          <div className="flex gap-2 overflow-x-auto scrollbar-hide py-3">
            {OTT_PLATFORMS.map((ott) => (
              <button
                key={ott}
                onClick={() => setSelectedOTT(ott)}
                className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
                  selectedOTT === ott
                    ? "bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white"
                    : "text-gray-400 border border-[#444]"
                }`}
              >
                {ott}
              </button>
            ))}
          </div>
        )}

        {/* 웹소설 플랫폼 필터 */}
        {selectedCategory === "webnovel" && (
          <div className="flex gap-2 overflow-x-auto scrollbar-hide py-3">
            {WEBNOVEL_PLATFORMS.map((platform) => (
              <button
                key={platform}
                onClick={() => setSelectedWebnovel(platform)}
                className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
                  selectedWebnovel === platform
                    ? "bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white"
                    : "text-gray-400 border border-[#444]"
                }`}
              >
                {platform}
              </button>
            ))}
          </div>
        )}

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
                      <span className="font-[PretendardVariable] text-[#855BFF] font-semibold">
                        <img src={PurpleStar} alt="평점" className="w-4 h-4" />
                        {item.score.toFixed(1)}
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
    </div>
  );
}

import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { rankingApi, ExternalRanking } from "../api/rankingApi";
import Header from "../components/common/Header";
import PurpleStar from "../assets/purple-star.svg";

type Category = "movie" | "tv" | "game" | "webtoon" | "webnovel";

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
  { id: "tv", label: "시리즈" },
  { id: "game", label: "게임" },
  { id: "webtoon", label: "웹툰" },
  { id: "webnovel", label: "웹소설" },
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

const WEBNOVEL_PLATFORMS = ["전체", "네이버시리즈", "카카오페이지"];

// 한글-영어 OTT 플랫폼 매핑 (백엔드 데이터 형식에 맞춤)
const OTT_NAME_MAPPING: Record<string, string> = {
  넷플릭스: "Netflix",
  웨이브: "wavve",
  "디즈니+": "Disney Plus",
  왓챠: "Watcha",
  티빙: "TVING",
  쿠팡플레이: "Coupang Play",
  애플TV: "Apple TV",
};

// 웹소설 플랫폼 매핑
const WEBNOVEL_PLATFORM_MAPPING: Record<string, string> = {
  네이버시리즈: "NaverSeries",
  카카오페이지: "KakaoPage",
};
export default function RankingPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [selectedCategory, setSelectedCategory] = useState<Category>(() => {
    const cat = searchParams.get("category");
    return (categories.find((c) => c.id === cat)?.id as Category) || "game";
  });

  const [selectedOTTs, setSelectedOTTs] = useState<Set<string>>(() => {
    const otts = searchParams.get("otts");
    return otts ? new Set(otts.split(",")) : new Set();
  });

  const [selectedWebnovels, setSelectedWebnovels] = useState<Set<string>>(
    () => {
      const webnovels = searchParams.get("webnovels");
      return webnovels ? new Set(webnovels.split(",")) : new Set();
    }
  );

  const [rankings, setRankings] = useState<RankingItem[]>([]);
  const [loading, setLoading] = useState(false);

  // URL 동기화
  useEffect(() => {
    const params = new URLSearchParams();
    params.set("category", selectedCategory);

    if (selectedOTTs.size > 0) {
      params.set("otts", Array.from(selectedOTTs).join(","));
    }

    if (selectedWebnovels.size > 0) {
      params.set("webnovels", Array.from(selectedWebnovels).join(","));
    }

    setSearchParams(params, { replace: true });
  }, [selectedCategory, selectedOTTs, selectedWebnovels]);

  // 카테고리 변경 시 필터 초기화
  const handleCategoryChange = (category: Category) => {
    setSelectedCategory(category);
    setSelectedOTTs(new Set());
    setSelectedWebnovels(new Set());
  };

  // OTT 필터 토글
  const toggleOTT = (ott: string) => {
    setSelectedOTTs((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(ott)) {
        newSet.delete(ott);
      } else {
        newSet.add(ott);
      }
      return newSet;
    });
  };

  // 웹소설 플랫폼 필터 토글
  const toggleWebnovel = (platform: string) => {
    setSelectedWebnovels((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(platform)) {
        newSet.delete(platform);
      } else {
        newSet.add(platform);
      }
      return newSet;
    });
  };

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

        // OTT 필터링 (TMDB만 해당) - 다중 선택 지원
        if (
          selectedOTTs.size > 0 &&
          (selectedCategory === "movie" || selectedCategory === "tv")
        ) {
          const englishOTTNames = Array.from(selectedOTTs)
            .map((ott) => OTT_NAME_MAPPING[ott])
            .filter(Boolean);
          if (englishOTTNames.length > 0) {
            mappedData = mappedData.filter(
              (item) =>
                item.watchProviders &&
                englishOTTNames.some((name) =>
                  item.watchProviders!.includes(name)
                )
            );
          }
        }

        // 웹소설 플랫폼 필터링 - 다중 선택 지원
        if (selectedWebnovels.size > 0 && selectedCategory === "webnovel") {
          const platformNames = Array.from(selectedWebnovels)
            .map((p) => WEBNOVEL_PLATFORM_MAPPING[p])
            .filter(Boolean);
          if (platformNames.length > 0) {
            mappedData = mappedData.filter((item) =>
              platformNames.includes(item.platform || "")
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
  }, [selectedCategory, selectedOTTs, selectedWebnovels]);

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
        onRightClick={() => navigate("/search")}
        bgColor="#242424"
      />
      <div className="w-full max-w-2xl mx-auto px-5">
        <div className="sticky top-[40px] z-100 bg-[#242424] border-b border-[#333] pt-3">
          {/* 카테고리 탭 */}
          <div className="flex justify-around border-b border-white/0">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => handleCategoryChange(cat.id)}
                className={`flex-1 text-center py-3 transition-all select-none ${
                  selectedCategory === cat.id
                    ? "border-b-2 border-white text-white font-semibold"
                    : "text-gray-400"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* 필터 & 컨텐츠 영역 */}
        <div className="flex-1 overflow-y-auto py-5 mt-[40px]">
          {/* OTT 필터 (영화/TV만 표시) - 다중 선택 */}
          {(selectedCategory === "movie" || selectedCategory === "tv") && (
            <div className="flex gap-2 overflow-x-auto scrollbar-hide mb-4">
              {OTT_PLATFORMS.filter((ott) => ott !== "전체").map((ott) => (
                <button
                  key={ott}
                  onClick={() => toggleOTT(ott)}
                  className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
                    selectedOTTs.has(ott)
                      ? "bg-[#646cff] text-white"
                      : "text-gray-400 border border-[#444]"
                  }`}
                >
                  {ott}
                </button>
              ))}
              {selectedOTTs.size > 0 && (
                <button
                  onClick={() => setSelectedOTTs(new Set())}
                  className="flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap text-red-400 border border-red-400/50 hover:bg-red-400/10"
                >
                  초기화
                </button>
              )}
            </div>
          )}

          {/* 웹소설 플랫폼 필터 - 다중 선택 */}
          {selectedCategory === "webnovel" && (
            <div className="flex gap-2 overflow-x-auto scrollbar-hide mb-4">
              {WEBNOVEL_PLATFORMS.filter((p) => p !== "전체").map(
                (platform) => (
                  <button
                    key={platform}
                    onClick={() => toggleWebnovel(platform)}
                    className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
                      selectedWebnovels.has(platform)
                        ? "bg-[#646cff] text-white"
                        : "text-gray-400 border border-[#444]"
                    }`}
                  >
                    {platform}
                  </button>
                )
              )}
              {selectedWebnovels.size > 0 && (
                <button
                  onClick={() => setSelectedWebnovels(new Set())}
                  className="flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap text-red-400 border border-red-400/50 hover:bg-red-400/10"
                >
                  초기화
                </button>
              )}
            </div>
          )}

          {/* 콘텐츠 */}
          {loading ? (
            <div className="text-center py-12 text-gray-400">Loading...</div>
          ) : rankings.length > 0 ? (
            <div className="flex flex-col gap-3">
              {rankings.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-4 p-3 bg-[#2a2a2a] rounded-lg cursor-pointer transition hover:bg-[#333] hover:translate-x-1"
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
                    className="w-15 h-20 rounded-md object-cover bg-[#444] flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-white text-sm mb-1 truncate">
                      {item.title}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-400">
                      <span className="flex items-center gap-1 text-[#646cff] font-semibold">
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

import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { rankingApi, ExternalRanking } from "../api/rankingApi";
import Header from "../components/common/Header";
import PurpleStar from "../assets/purple-star.svg";
import InfoIcon from "../assets/info-icon.svg";
import { DOMAIN_PLATFORMS, PLATFORM_META } from "../constants/platforms";
import Modal from "../components/common/Modal";
import {
  Category,
  imageAspectMap,
  thumbnailFallbackMap,
} from "../constants/thumbnail";

interface RankingItem {
  id: string;
  rank: number;
  title: string;
  thumbnail: string | null;
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

export default function RankingPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [selectedCategory, setSelectedCategory] = useState<Category>(() => {
    const cat = searchParams.get("category");
    return (categories.find((c) => c.id === cat)?.id as Category) || "game";
  });

  const [selectedPlatforms, setSelectedPlatforms] = useState<Set<string>>(
    () => {
      const platforms = searchParams.get("platforms");
      return platforms ? new Set(platforms.split(",")) : new Set(["ALL"]);
    },
  );

  const todayLabel = (() => {
    const now = new Date();
    const month = now.getMonth() + 1;
    const day = now.getDate();
    return `${month}.${day}`;
  })();

  const [rankings, setRankings] = useState<RankingItem[]>([]);

  const [isNoContentModalOpen, setIsNoContentModalOpen] = useState(false);

  const [loading, setLoading] = useState(false);

  // URL 동기화
  useEffect(() => {
    const params = new URLSearchParams();
    params.set("category", selectedCategory);

    if (!selectedPlatforms.has("ALL") && selectedPlatforms.size > 0) {
      const value = Array.from(selectedPlatforms).join(",");

      if (selectedCategory === "movie" || selectedCategory === "tv") {
        params.set("otts", value);
      } else if (selectedCategory === "game") {
        params.set("games", value);
      } else if (selectedCategory === "webtoon") {
        params.set("webtoons", value);
      } else if (selectedCategory === "webnovel") {
        params.set("webnovels", value);
      } else {
        params.set("platforms", value);
      }
    }

    setSearchParams(params, { replace: true });
  }, [selectedCategory, selectedPlatforms]);

  // 카테고리 변경 시 필터 초기화
  const handleCategoryChange = (category: Category) => {
    setSelectedCategory(category);
    setSelectedPlatforms(new Set(["ALL"]));
  };

  // OTT 필터 토글
  const togglePlatform = (platformId: string) => {
    const newSelection = new Set(selectedPlatforms);

    if (platformId === "ALL") {
      newSelection.clear();
      newSelection.add("ALL");
    } else {
      if (newSelection.has(platformId)) {
        newSelection.delete(platformId);
      } else {
        newSelection.add(platformId);
      }
      newSelection.delete("ALL");

      if (newSelection.size === 0) {
        newSelection.add("ALL");
      }
    }

    setSelectedPlatforms(newSelection);
  };

  const domainKey = selectedCategory.toUpperCase();

  const availablePlatforms =
    DOMAIN_PLATFORMS[domainKey]?.map((key) => ({
      key,
      ...PLATFORM_META[key],
    })) || [];

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

        // 필터링 로직 - 카테고리별로 다르게 적용
        const selectedPlatformArray = selectedPlatforms.has("ALL")
          ? undefined
          : Array.from(selectedPlatforms);

        if (selectedPlatformArray && selectedPlatformArray.length > 0) {
          // 영화/시리즈: OTT 필터링 (watchProviders) + 플랫폼 필터링 (platform)
          if (selectedCategory === "movie" || selectedCategory === "tv") {
            // OTT 이름 목록 (watchProviders에서 사용) - platforms.ts와 동일하게
            const ottNames = [
              "Netflix",
              "Watcha",
              "Disney Plus",
              "wavve",
              "TVING",
            ];
            const selectedOtts = selectedPlatformArray.filter((p) =>
              ottNames.includes(p),
            );
            const selectedPlatformTypes = selectedPlatformArray.filter(
              (p) => !ottNames.includes(p),
            );

            mappedData = mappedData.filter((item) => {
              let matchOtt = true;
              let matchPlatform = true;

              // OTT 필터 적용 (선택된 경우)
              if (selectedOtts.length > 0) {
                if (!item.watchProviders || item.watchProviders.length === 0) {
                  matchOtt = false;
                } else {
                  // 선택된 모든 OTT가 포함되어야 표시 (AND 조건)
                  matchOtt = selectedOtts.every((selected) =>
                    item.watchProviders!.includes(selected),
                  );
                }
              }

              // 플랫폼 타입 필터 적용 (선택된 경우)
              if (selectedPlatformTypes.length > 0) {
                matchPlatform = item.platform
                  ? selectedPlatformTypes.includes(item.platform)
                  : false;
              }

              return matchOtt && matchPlatform;
            });
          }
          // 게임/웹툰/웹소설: 플랫폼 필터링 (platform 사용)
          else {
            mappedData = mappedData.filter(
              (item) =>
                item.platform && selectedPlatformArray.includes(item.platform),
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
  }, [selectedCategory, selectedPlatforms]);

  const handleCardClick = (id: string) => {
    if (id.startsWith("no-content-")) {
      setIsNoContentModalOpen(true);
      return;
    }
    navigate(`/work/${id}`);
  };

  const renderChange = (change?: "up" | "down" | "new" | number) => {
    if (!change) return null;
    if (change === "new")
      return <span className="text-[#855BFF] font-semibold text-xs">NEW</span>;
    if (change === "up")
      return <span className="text-[#FF5455] font-semibold text-xs">▲</span>;
    if (change === "down")
      return <span className="text-[#6883F5] font-semibold text-xs">▼</span>;
    if (typeof change === "number") {
      return change > 0 ? (
        <span className="text-[#FF5455] font-semibold text-xs">▲ {change}</span>
      ) : (
        <span className="text-[#6883F5] font-semibold text-xs">
          ▼ {Math.abs(change)}
        </span>
      );
    }
  };

  return (
    <>
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
          <div className="flex-1 overflow-y-auto py-2.5 mt-[40px] pb-40">
            {/* OTT 필터 (영화/TV만 표시) - 다중 선택 */}
            {/* 플랫폼 필터 */}
            <div className="mb-4">
              <div className="flex gap-3 overflow-x-auto scrollbar-hide">
                {availablePlatforms.map((platform) => {
                  const isSelected = selectedPlatforms.has(platform.key);

                  return (
                    <button
                      key={platform.key}
                      onClick={() => togglePlatform(platform.key)}
                      className={`flex items-center gap-2 py-1.5 rounded-full border font-[PretendardVariable] text-sm font-medium transition-all flex-shrink-0
            ${platform.key === "ALL" ? "px-4" : "px-2"}
            ${
              isSelected
                ? "border-transparent text-white bg-gradient-to-r from-[#855BFF] to-[#445FD1]"
                : "border-[#403F43] bg-[#2a2a2a] text-[#D3D3D3] hover:border-[#855BFF]"
            }`}
                    >
                      {platform.logo && (
                        <img
                          src={platform.logo}
                          alt={platform.label}
                          className="w-5 h-5 rounded-full object-contain"
                        />
                      )}
                      <span>{platform.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center gap-1.5 mt-2 text-[#D3D3D3] text-sm font-[PretendardVariable] mb-4">
              <img src={InfoIcon} className="w-4 h-4" />
              <span className="text-semibold">{todayLabel} 기준</span>
            </div>

            {/* 콘텐츠 */}
            {loading ? (
              <div className="text-center py-12 text-gray-400">Loading...</div>
            ) : rankings.length > 0 ? (
              <div className="flex flex-col gap-1">
                {rankings.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-4 p-1 rounded-lg cursor-pointer transition hover:bg-[#2a2a2a] hover:translate-x-1"
                    onClick={() => handleCardClick(item.id)}
                  >
                    <div
                      className={`w-4 text-center font-[PretendardVariable] font-bold text-xl ${
                        item.rank === 1
                          ? "text-yellow-400"
                          : item.rank === 2
                            ? "text-gray-300"
                            : item.rank === 3
                              ? "text-[#cd7f32]"
                              : "text-white"
                      }`}
                    >
                      {item.rank}
                    </div>
                    <div
                      className={`relative ${selectedCategory === "game" ? "w-30" : "w-18"} flex-shrink-0 rounded-md bg-[#2a2a2a] overflow-hidden
    ${imageAspectMap[selectedCategory]}`}
                    >
                      {item.thumbnail ? (
                        <img
                          src={item.thumbnail}
                          alt={item.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <img
                          src={thumbnailFallbackMap[selectedCategory]}
                          alt="기본 썸네일"
                          className="absolute inset-0 m-auto object-contain
        w-[clamp(20px,50%,36px)]
        h-[clamp(20px,50%,36px)]
        opacity-80"
                        />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="font-[PretendardVariable] font-medium text-white text-sm mb-1 truncate">
                        {item.title}
                      </div>
                      <div className="flex items-center gap-3 font-[PretendardVariable] text-xs text-gray-400">
                        <span className="flex items-center text-[#855BFF] text-sm font-medium gap-1">
                          <img
                            src={PurpleStar}
                            alt="평점"
                            className="w-4 h-4"
                          />
                          {item.score.toFixed(1)}
                        </span>

                        {renderChange(item.change)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-gray-400 py-30">
                랭킹 데이터가 없습니다.
              </div>
            )}
          </div>
        </div>
      </div>
      {isNoContentModalOpen && (
        <Modal
          title={
            <>
              이 작품의 상세 정보가 아직
              <br />
              준비되지 않았습니다.
            </>
          }
          buttons={[
            {
              text: "확인",
              variant: "purple",
              onClick: () => setIsNoContentModalOpen(false),
            },
          ]}
        />
      )}
    </>
  );
}

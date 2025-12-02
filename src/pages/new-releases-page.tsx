import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  useRecentReleases,
  useUpcomingReleases,
  usePlatforms,
} from "../hooks/useWorks";
import Header from "../components/common/Header";

type Category = "movie" | "tv" | "game" | "webtoon" | "webnovel";
type ReleaseType = "released" | "upcoming";

const categories: { id: Category; label: string }[] = [
  { id: "movie", label: "영화" },
  { id: "tv", label: "TV" },
  { id: "game", label: "게임" },
  { id: "webtoon", label: "웹툰" },
  { id: "webnovel", label: "웹소설" },
];

// 플랫폼 아이콘 매핑
const platformIcons: Record<string, string> = {
  tmdb: "🎬",
  netflix: "🎥",
  steam: "🎮",
  naver: "📱",
  kakao: "📚",
  naverseries: "📖",
};

export default function NewReleasesPage() {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState<Category>("game");
  const [selectedPlatforms, setSelectedPlatforms] = useState<Set<string>>(
    new Set(["steam"])
  );
  const [releaseType, setReleaseType] = useState<ReleaseType>("released");
  const [page, setPage] = useState(0);

  // 도메인 매핑
  const domainMap: Record<Category, string> = {
    movie: "MOVIE",
    tv: "TV",
    game: "GAME",
    webtoon: "WEBTOON",
    webnovel: "WEBNOVEL",
  };

  // API에서 플랫폼 목록 가져오기
  const { data: platformsData } = usePlatforms(domainMap[selectedCategory]);
  const availablePlatforms = (platformsData || []).map((platformName) => ({
    id: platformName.toLowerCase(),
    name: platformName,
    icon: platformIcons[platformName.toLowerCase()] || "📦",
  }));

  // 선택된 플랫폼을 배열로 변환
  const selectedPlatformsArray =
    selectedPlatforms.size > 0 ? Array.from(selectedPlatforms) : undefined;

  // API 호출
  const {
    data: recentData,
    isLoading: isLoadingRecent,
    error: recentError,
  } = useRecentReleases(
    {
      domain: domainMap[selectedCategory],
      platforms: selectedPlatformsArray,
      page,
      size: 20,
    },
    { enabled: releaseType === "released" }
  );

  const {
    data: upcomingData,
    isLoading: isLoadingUpcoming,
    error: upcomingError,
  } = useUpcomingReleases(
    {
      domain: domainMap[selectedCategory],
      platforms: selectedPlatformsArray,
      page,
      size: 20,
    },
    { enabled: releaseType === "upcoming" }
  );

  // API 데이터 사용
  const isLoading =
    releaseType === "released" ? isLoadingRecent : isLoadingUpcoming;
  const error = releaseType === "released" ? recentError : upcomingError;
  const works =
    releaseType === "released"
      ? recentData?.content || []
      : upcomingData?.content || [];

  const handleCategoryChange = (category: Category) => {
    setSelectedCategory(category);
    setSelectedPlatforms(new Set());
    setPage(0); // 카테고리 변경 시 페이지 초기화
  };

  const togglePlatform = (platformId: string) => {
    const newSelection = new Set(selectedPlatforms);
    if (newSelection.has(platformId)) {
      newSelection.delete(platformId);
    } else {
      newSelection.add(platformId);
    }
    setSelectedPlatforms(newSelection);
    setPage(0); // 필터 변경 시 페이지 초기화
  };

  const handleItemClick = (id: number) => {
    navigate(`/work/${id}`);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${month}.${day}`;
  };

  return (
    <div className="flex flex-col h-screen">
      <Header
        title="신작"
        rightIcon="search"
        onRightClick={() => navigate("/search")}
        bgColor="#242424"
      />
      <div className="w-full max-w-2xl mx-auto px-5">
        <div className="sticky top-[40px] z-[100] bg-[#242424] border-b border-[#333] pt-3">
          {/* 카테고리 선택 */}
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
        {/* 플랫폼 */}
        <div className="pb-4 mt-15">
          <span className="block text-white text-sm font-semibold mb-3">
            플랫폼
          </span>
          <div className="flex gap-4 overflow-x-auto no-scrollbar">
            {availablePlatforms.map((platform) => (
              <div
                key={platform.id}
                className={`flex flex-col items-center gap-1 cursor-pointer shrink-0
              ${selectedPlatforms.has(platform.id) ? "text-[#646cff] font-semibold" : ""}`}
                onClick={() => togglePlatform(platform.id)}
              >
                <div
                  className={`w-15 h-15 flex items-center justify-center rounded-full border-2 text-2xl transition
              ${
                selectedPlatforms.has(platform.id)
                  ? "border-[#646cff] bg-[#646cff22]"
                  : "border-[#444] bg-[#2a2a2a]"
              }`}
                >
                  {platform.icon}
                </div>
                <span
                  className={`text-xs transition
                ${selectedPlatforms.has(platform.id) ? "text-[#646cff]" : "text-[#888]"}`}
                >
                  {platform.name}
                </span>
              </div>
            ))}
          </div>

          {/* 신작 / 예정 탭 */}
          <div className="flex gap-2">
            <button
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition
          ${
            releaseType === "released"
              ? "bg-[#646cff] text-white"
              : "bg-[#2a2a2a] text-[#888]"
          }`}
              onClick={() => setReleaseType("released")}
            >
              신작
            </button>
            <button
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition
          ${
            releaseType === "upcoming"
              ? "bg-[#646cff] text-white"
              : "bg-[#2a2a2a] text-[#888]"
          }`}
              onClick={() => setReleaseType("upcoming")}
            >
              공개 예정
            </button>
          </div>
        </div>

        {/* 콘텐츠 영역 */}
        <div className="flex-1 overflow-y-auto p-5">
          {isLoading ? (
            <div className="text-center text-[#888] py-20 text-sm">
              로딩 중...
            </div>
          ) : error ? (
            <div className="text-center text-[#888] py-20 text-sm">
              데이터를 불러올 수 없습니다.
            </div>
          ) : works.length > 0 ? (
            <div className="flex flex-col gap-3">
              {works.map((work) => (
                <div
                  key={work.id}
                  className="flex items-center gap-4 p-3 bg-[#2a2a2a] rounded-lg cursor-pointer transition hover:bg-[#333] hover:translate-x-1"
                  onClick={() => handleItemClick(work.id)}
                >
                  <div
                    className={`min-w-[80px] text-center text-sm font-semibold
                ${releaseType === "upcoming" ? "text-[#fbbf24]" : "text-[#646cff]"}`}
                  >
                    {work.releaseDate ? formatDate(work.releaseDate) : "-"}
                  </div>

                  <img
                    src={work.thumbnail || "https://via.placeholder.com/60x80"}
                    className="w-[60px] h-[80px] rounded-md object-cover bg-[#444] shrink-0"
                    alt={work.title}
                  />

                  <div className="flex-1 text-white text-base font-medium overflow-hidden text-ellipsis whitespace-nowrap">
                    {work.title}
                  </div>

                  {releaseType === "upcoming" && (
                    <span className="px-3 py-1 rounded-xl text-xs font-semibold bg-[#646cff22] text-[#646cff]">
                      예정
                    </span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-[#888] py-20 text-sm">
              데이터가 없습니다.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

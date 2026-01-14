import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useRecentReleases, useUpcomingReleases } from "../hooks/useWorks";
import Header from "../components/common/Header";
import { DOMAIN_LABEL_MAP } from "../constants/domain";
import { DOMAIN_PLATFORMS, PLATFORM_META } from "../constants/platforms";

type Category = "movie" | "tv" | "game" | "webtoon" | "webnovel";
type ReleaseType = "released" | "upcoming";

const categories: { id: Category; label: string }[] = [
  { id: "movie", label: "영화" },
  { id: "tv", label: "시리즈" },
  { id: "game", label: "게임" },
  { id: "webtoon", label: "웹툰" },
  { id: "webnovel", label: "웹소설" },
];

export default function NewReleasesPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [selectedCategory, setSelectedCategory] = useState<Category>(() => {
    const cat = searchParams.get("category");
    return (categories.find((c) => c.id === cat)?.id as Category) || "game";
  });

  const [selectedPlatforms, setSelectedPlatforms] = useState<Set<string>>(
    () => {
      const platforms = searchParams.get("platforms");
      return platforms ? new Set(platforms.split(",")) : new Set(["all"]);
    }
  );

  const [releaseType, setReleaseType] = useState<ReleaseType>(() => {
    const type = searchParams.get("type");
    return type === "upcoming" ? "upcoming" : "released";
  });

  const [page, setPage] = useState(() => {
    const p = searchParams.get("page");
    return p ? parseInt(p, 10) : 0;
  });

  // URL 동기화
  useEffect(() => {
    const params = new URLSearchParams();
    params.set("category", selectedCategory);
    params.set("type", releaseType);
    params.set("page", page.toString());

    if (!selectedPlatforms.has("all") && selectedPlatforms.size > 0) {
      params.set("platforms", Array.from(selectedPlatforms).join(","));
    }

    setSearchParams(params, { replace: true });
  }, [selectedCategory, selectedPlatforms, releaseType, page]);

  // 도메인 매핑
  const domainMap: Record<Category, string> = {
    movie: "MOVIE",
    tv: "TV",
    game: "GAME",
    webtoon: "WEBTOON",
    webnovel: "WEBNOVEL",
  };

  const domainKey = domainMap[selectedCategory];
  const platformKeys = DOMAIN_PLATFORMS[domainKey] || [];

  const availablePlatforms = platformKeys.map((key) => {
    const meta = PLATFORM_META[key];
    return {
      id: key.toLowerCase(),
      key,
      label: meta?.label ?? key,
      logo: meta?.logo,
    };
  });

  // 선택된 플랫폼을 배열로 변환
  const selectedPlatformsArray = selectedPlatforms.has("all")
    ? undefined
    : Array.from(selectedPlatforms);

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

    if (platformId === "all") {
      newSelection.clear();
      newSelection.add("all");
    } else {
      if (newSelection.has(platformId)) {
        newSelection.delete(platformId);
      } else {
        newSelection.add(platformId);
      }
      newSelection.delete("all");

      if (newSelection.size === 0) {
        newSelection.add("all");
      }
    }
    setSelectedPlatforms(newSelection);
    setPage(0); // 필터 변경 시 페이지 초기화
  };

  const formatGroupDate = (dateString: string) => {
    const d = new Date(dateString);
    const year = String(d.getFullYear()).slice(2); // 2025 → 25
    const month = d.getMonth() + 1;
    const day = d.getDate();

    return `${year} / ${month} / ${day}`;
  };

  const groupedWorks = works.reduce<Record<string, any[]>>((acc, work) => {
    if (!work.releaseDate) return acc;

    const key = formatGroupDate(work.releaseDate);

    if (!acc[key]) acc[key] = [];
    acc[key].push(work);

    return acc;
  }, {});

  const sortedDates = Object.keys(groupedWorks).sort((a, b) => {
    const [ay, am, ad] = a.split(" / ").map(Number);
    const [by, bm, bd] = b.split(" / ").map(Number);

    const aDate = new Date(2000 + ay, am - 1, ad);
    const bDate = new Date(2000 + by, bm - 1, bd);

    return bDate.getTime() - aDate.getTime();
  });

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
        <div className="pb-4 py-5 mt-[30px]">
          <div className="flex gap-3 overflow-x-auto scrollbar-hide">
            {availablePlatforms.map((platform) => {
              const isSelected = selectedPlatforms.has(platform.id);

              return (
                <button
                  key={platform.id}
                  onClick={() => togglePlatform(platform.id)}
                  className={`flex items-center gap-2 py-1.5 rounded-full border text-sm font-medium transition-all flex-shrink-0
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

          {/* 신작 / 예정 탭 */}
          <div className="flex gap-2 pt-3">
            <button
              className={`flex-1 py-2 rounded-lg text-sm font-[PretendardVariable] font-medium transition
          ${
            releaseType === "released"
              ? "bg-[#855BFF] text-white"
              : "bg-[#2a2a2a] text-[#888]"
          }`}
              onClick={() => setReleaseType("released")}
            >
              신작
            </button>
            <button
              className={`flex-1 py-2 rounded-lg text-sm font-[PretendardVariable] font-medium transition
          ${
            releaseType === "upcoming"
              ? "bg-[#855BFF] text-white"
              : "bg-[#2a2a2a] text-[#888]"
          }`}
              onClick={() => setReleaseType("upcoming")}
            >
              공개 예정
            </button>
          </div>
        </div>

        {/* 콘텐츠 영역 */}
        <div className="flex-1 overflow-y-auto pb-40">
          {isLoading ? (
            <div className="text-center text-gray-500 py-20">로딩 중...</div>
          ) : error ? (
            <div className="text-center text-gray-500 py-20">
              데이터를 불러올 수 없습니다.
            </div>
          ) : works.length > 0 ? (
            <div className="flex flex-col gap-10">
              {sortedDates.map((date) => (
                <section key={date}>
                  <div className="flex items-center gap-3 mb-4">
                    {/* 날짜 왼쪽 세로줄 */}
                    <div className="w-1 h-6 bg-[#8D8C8E]" />

                    {/* 날짜 텍스트 */}
                    <h3 className="text-white text-lg font-medium">{date}</h3>
                  </div>

                  {/* 카드 그리드 */}
                  <div className="grid grid-cols-2 sm:grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-5">
                    {groupedWorks[date].map((work) => (
                      <div
                        key={work.id}
                        onClick={() => navigate(`/work/${work.id}`)}
                        className="cursor-pointer transition-transform hover:-translate-y-1"
                      >
                        <img
                          src={
                            work.thumbnail ||
                            "https://via.placeholder.com/160x220"
                          }
                          alt={work.title}
                          className="w-full h-[220px] rounded-lg object-cover mb-2 bg-gray-700"
                        />

                        <div className="text-white text-sm font-[PretendardVariable] font-semibold truncate">
                          {work.title}
                        </div>

                        <div className="font-[PretendardVariable] text-gray-400 text-xs mt-0.5">
                          {DOMAIN_LABEL_MAP[work.domain] ?? work.domain}
                          {work.releaseDate &&
                            ` • ${new Date(work.releaseDate).getFullYear()}`}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <div className="text-center text-gray-500 py-20">
              데이터가 없습니다.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

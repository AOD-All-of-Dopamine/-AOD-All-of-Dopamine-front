import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useWorks, useGenresWithCount } from "../hooks/useWorks";
import Header from "../components/common/Header";
import { DOMAIN_PLATFORMS, PLATFORM_META } from "../constants/platforms";
import PurpleStar from "../assets/purple-star.svg";
import FilterIcon from "../assets/filter-icon.svg";

type Category = "movie" | "tv" | "game" | "webtoon" | "webnovel";

const categories: { id: Category; label: string }[] = [
  { id: "movie", label: "영화" },
  { id: "tv", label: "시리즈" },
  { id: "game", label: "게임" },
  { id: "webtoon", label: "웹툰" },
  { id: "webnovel", label: "웹소설" },
];

const domainLabelMap: Record<string, string> = {
  MOVIE: "영화",
  TV: "시리즈",
  GAME: "게임",
  WEBTOON: "웹툰",
  WEBNOVEL: "웹소설",
};

export default function ExplorePage() {
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
    }
  );

  const [selectedGenres, setSelectedGenres] = useState<Set<string>>(() => {
    const genres = searchParams.get("genres");
    return genres ? new Set(genres.split(",")) : new Set();
  });

  const [page, setPage] = useState(() => {
    const p = searchParams.get("page");
    return p ? parseInt(p, 10) : 0;
  });

  const [showGenreFilter, setShowGenreFilter] = useState(false);

  // URL 동기화
  useEffect(() => {
    const params = new URLSearchParams();
    params.set("category", selectedCategory);
    params.set("page", page.toString());

    if (!selectedPlatforms.has("ALL") && selectedPlatforms.size > 0) {
      params.set("platforms", Array.from(selectedPlatforms).join(","));
    }

    if (selectedGenres.size > 0) {
      params.set("genres", Array.from(selectedGenres).join(","));
    }

    setSearchParams(params, { replace: true });
  }, [selectedCategory, selectedPlatforms, selectedGenres, page]);

  const { data: genresWithCountData } = useGenresWithCount(
    selectedCategory.toUpperCase()
  );

  // 장르를 작품 수 기준 내림차순으로 정렬
  const sortedGenres = genresWithCountData
    ? Object.entries(genresWithCountData).sort(
        ([, countA], [, countB]) => countB - countA
      )
    : [];

  const domainKey = selectedCategory.toUpperCase();

  const availablePlatforms =
    DOMAIN_PLATFORMS[domainKey]?.map((key) => ({
      key,
      ...PLATFORM_META[key],
    })) || [];

  const selectedPlatformsArray = selectedPlatforms.has("ALL")
    ? undefined
    : Array.from(selectedPlatforms);
  const selectedGenresArray =
    selectedGenres.size > 0 ? Array.from(selectedGenres) : undefined;

  // 정렬 옵션 - 최신순만 지원
  const { data, isLoading } = useWorks({
    domain: selectedCategory.toUpperCase(),
    platforms: selectedPlatformsArray,
    genres: selectedGenresArray,
    page,
    size: 20,
    sortBy: "releaseDate",
    sortDirection: "desc",
  });

  const handleCategoryChange = (category: Category) => {
    setSelectedCategory(category);
    setSelectedPlatforms(new Set(["ALL"]));
    setSelectedGenres(new Set());
    setPage(0);
  };

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
    setPage(0);
  };

  const toggleGenre = (genre: string) => {
    const newSelection = new Set(selectedGenres);
    if (newSelection.has(genre)) newSelection.delete(genre);
    else newSelection.add(genre);
    setSelectedGenres(newSelection);
    setPage(0);
  };

  const handleCardClick = (id: string) => {
    navigate(`/work/${id}`);
  };

  return (
    <div className="flex flex-col h-screen">
      {/* 헤더 */}
      <Header
        title="탐색"
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
        <div className="flex-1 py-5 mt-[30px] pb-40">
          {/* 플랫폼 필터 */}
          <div className="mb-4">
            <div className="flex gap-3 overflow-x-auto scrollbar-hide">
              {availablePlatforms.map((platform) => {
                const isSelected = selectedPlatforms.has(platform.key);

                return (
                  <button
                    key={platform.key}
                    onClick={() => togglePlatform(platform.key)}
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
                    <span className="font-[PretendardVariable]">
                      {platform.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mb-4">
            <div className="flex items-start gap-2 flex-wrap">
              <button
                onClick={() => setShowGenreFilter((prev) => !prev)}
                className="relative flex items-center gap-1 px-2 py-2 rounded-md border text-sm
        text-[#8D8C8E] border-[#403F43] hover:border-[#855BFF]"
              >
                <img src={FilterIcon} alt="필터 아이콘" className="w-5 h-5" />
                <span className="font-[PretendardVariable]">필터</span>

                {selectedGenres.size > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-[#855BFF] text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
                    {selectedGenres.size}
                  </span>
                )}
              </button>

              {Array.from(selectedGenres).map((genre) => (
                <div
                  key={genre}
                  className="flex items-center gap-1 px-2 py-2 rounded-md font-[PretendardVariable] text-sm rounded-full bg-[#855BFF] text-white"
                >
                  <span>{genre}</span>
                  <button
                    onClick={() => toggleGenre(genre)}
                    className="font-[PretendardVariable] text-white hover:text-white"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            {showGenreFilter && (
              <div className="mt-3 flex flex-wrap gap-2">
                {sortedGenres.map(([genre, count]) => {
                  const isSelected = selectedGenres.has(genre);
                  return (
                    <button
                      key={genre}
                      onClick={() => toggleGenre(genre)}
                      className={`px-3 py-1 rounded-full text-xs border transition-all ${
                        isSelected
                          ? "border-[#646cff] bg-[#646cff22] text-white"
                          : "border-gray-700 text-gray-400 hover:border-gray-500"
                      }`}
                    >
                      {genre}{" "}
                      <span className="font-[PretendardVariable] text-[10px] opacity-60">
                        ({count})
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* 총 개수 및 정렬 */}
          {data && data.content.length > 0 && (
            <div className="flex items-center justify-between mb-4">
              <span className="text-gray-400 text-sm">
                총{" "}
                <span className="text-white font-semibold">
                  {data.totalElements?.toLocaleString() || 0}
                </span>
                개
              </span>
              <div className="text-gray-400 text-sm">최신순</div>
            </div>
          )}

          {/* 작품 목록 */}
          {isLoading ? (
            <div className="text-center text-gray-500 py-20">로딩 중...</div>
          ) : data && data.content.length > 0 ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-5">
                {data.content.map((work) => (
                  <div
                    key={work.id}
                    onClick={() => handleCardClick(String(work.id))}
                    className="cursor-pointer transition-transform hover:-translate-y-1"
                  >
                    <img
                      src={
                        work.thumbnail || "https://via.placeholder.com/160x220"
                      }
                      alt={work.title}
                      className="w-full h-[220px] rounded-lg object-cover mb-2 bg-gray-700"
                    />
                    <div className="font-[PretendardVariable] text-white text-sm font-semibold truncate">
                      {work.title}
                    </div>

                    <div className="font-[PretendardVariable] text-gray-400 text-xs mt-0.5">
                      {domainLabelMap[work.domain] || work.domain}
                      {work.releaseDate &&
                        ` • ${new Date(work.releaseDate).getFullYear()}`}
                    </div>

                    <div className="flex items-center text-[#855BFF] text-sm font-medium mt-1 gap-1">
                      <img src={PurpleStar} alt="평점" className="w-4 h-4" />{" "}
                      {(work.score || 0).toFixed(1)}
                    </div>
                  </div>
                ))}
              </div>

              {/* 페이지네이션 */}
              {data && data.totalPages > 1 && (
                <div className="flex flex-col items-center gap-3 mt-8">
                  {/* 페이지 번호 버튼들 */}
                  <div className="flex items-center gap-1 flex-wrap justify-center">
                    {(() => {
                      const totalPages = data.totalPages;
                      const currentPage = page;
                      const pageNumbers = [];

                      // 항상 첫 페이지
                      pageNumbers.push(0);

                      // 현재 페이지 주변 (앞뒤 2개씩)
                      const start = Math.max(1, currentPage - 2);
                      const end = Math.min(totalPages - 2, currentPage + 2);

                      // ... 표시 여부
                      if (start > 1) pageNumbers.push(-1); // -1은 ... 표시용

                      for (let i = start; i <= end; i++) {
                        if (i > 0 && i < totalPages - 1) {
                          pageNumbers.push(i);
                        }
                      }

                      // ... 표시 여부
                      if (end < totalPages - 2) pageNumbers.push(-2); // -2도 ... 표시용

                      // 항상 마지막 페이지
                      if (totalPages > 1) pageNumbers.push(totalPages - 1);

                      return pageNumbers.map((pageNum, idx) => {
                        if (pageNum < 0) {
                          return (
                            <span
                              key={`ellipsis-${idx}`}
                              className="text-gray-500 px-2"
                            >
                              ...
                            </span>
                          );
                        }

                        return (
                          <button
                            key={pageNum}
                            onClick={() => setPage(pageNum)}
                            className={`min-w-[36px] h-9 px-2 rounded-lg font-medium transition ${
                              pageNum === currentPage
                                ? "bg-[#855BFF] text-white"
                                : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                            }`}
                          >
                            {pageNum + 1}
                          </button>
                        );
                      });
                    })()}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center text-gray-500 py-20">
              선택한 필터에 맞는 작품이 없습니다.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useWorks, useGenresWithCount, usePlatforms } from "../hooks/useWorks";
import Header from "../components/common/Header";

type Category = "movie" | "tv" | "game" | "webtoon" | "webnovel";

const categories: { id: Category; label: string }[] = [
  { id: "movie", label: "영화" },
  { id: "tv", label: "TV" },
  { id: "game", label: "게임" },
  { id: "webtoon", label: "웹툰" },
  { id: "webnovel", label: "웹소설" },
];

const platformIcons: Record<string, string> = {
  tmdb: "🎬",
  netflix: "🎥",
  steam: "🎮",
  naver: "📱",
  kakao: "📚",
  naverseries: "📖",
};

export default function ExplorePage() {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState<Category>("game");
  const [selectedPlatforms, setSelectedPlatforms] = useState<Set<string>>(
    new Set(["steam"])
  );
  const [selectedGenres, setSelectedGenres] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(0);
  const [showAllGenres, setShowAllGenres] = useState(false); // 장르 더보기 상태
  // const [sortBy, setSortBy] = useState<"latest" | "reviews" | "rating">("latest"); // 정렬 기준 - 일단 최신순만 지원

  const GENRE_DISPLAY_LIMIT = 10; // 기본 표시 개수

  const { data: genresWithCountData } = useGenresWithCount(selectedCategory.toUpperCase());
  
  // 장르를 작품 수 기준 내림차순으로 정렬
  const sortedGenres = genresWithCountData
    ? Object.entries(genresWithCountData)
        .sort(([, countA], [, countB]) => countB - countA)
    : [];

  // 표시할 장르 목록 (더보기 상태에 따라)
  const displayedGenres = showAllGenres
    ? sortedGenres
    : sortedGenres.slice(0, GENRE_DISPLAY_LIMIT);

  const { data: platformsData } = usePlatforms(selectedCategory.toUpperCase());
  const availablePlatforms = (platformsData || []).map((platformName) => ({
    id: platformName.toLowerCase(),
    name: platformName,
    icon: platformIcons[platformName.toLowerCase()] || "📦",
  }));

  const selectedPlatformsArray =
    selectedPlatforms.size > 0 ? Array.from(selectedPlatforms) : undefined;
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
    setSelectedPlatforms(new Set());
    setSelectedGenres(new Set());
    setPage(0);
  };

  const togglePlatform = (platformId: string) => {
    const newSelection = new Set(selectedPlatforms);
    if (newSelection.has(platformId)) newSelection.delete(platformId);
    else newSelection.add(platformId);
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
        <div className="sticky top-[40px] z-50 bg-[#242424] border-b border-[#333] pt-3">
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
          {/* 플랫폼 필터 */}
          <div className="mb-4">
            <span className="text-sm font-semibold text-white mb-2 block">
              플랫폼
            </span>
            <div className="flex gap-4 overflow-x-auto scrollbar-hide">
              {availablePlatforms.map((platform) => (
                <div
                  key={platform.id}
                  onClick={() => togglePlatform(platform.id)}
                  className="flex flex-col items-center gap-1 cursor-pointer flex-shrink-0"
                >
                  <div
                    className={`w-14 h-14 rounded-full border-2 flex items-center justify-center text-xl transition-all ${
                      selectedPlatforms.has(platform.id)
                        ? "border-[#646cff] bg-[#646cff22]"
                        : "border-gray-700 bg-[#2a2a2a]"
                    }`}
                  >
                    {platform.icon}
                  </div>
                  <span
                    className={`text-xs transition-colors ${
                      selectedPlatforms.has(platform.id)
                        ? "text-[#646cff] font-semibold"
                        : "text-gray-500"
                    }`}
                  >
                    {platform.name}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 장르 필터 */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-white">장르</span>
              {sortedGenres.length > GENRE_DISPLAY_LIMIT && (
                <button
                  onClick={() => setShowAllGenres(!showAllGenres)}
                  className="text-xs text-[#646cff] hover:text-[#7d84ff] transition-colors"
                >
                  {showAllGenres ? "접기 ▲" : `더보기 (${sortedGenres.length - GENRE_DISPLAY_LIMIT}개) ▼`}
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {displayedGenres.map(([genre, count]) => (
                <button
                  key={genre}
                  onClick={() => toggleGenre(genre)}
                  className={`px-4 py-1 rounded-full text-xs font-medium border transition-all ${
                    selectedGenres.has(genre)
                      ? "border-[#646cff] bg-[#646cff22] text-[#646cff]"
                      : "border-gray-700 bg-[#2a2a2a] text-gray-500 hover:border-gray-500"
                  }`}
                >
                  {genre} <span className="text-[10px] opacity-60">({count})</span>
                </button>
              ))}
            </div>
          </div>

          {/* 총 개수 및 정렬 */}
          {data && data.content.length > 0 && (
            <div className="flex items-center justify-between mb-4">
              <span className="text-gray-400 text-sm">
                총 <span className="text-white font-semibold">{data.totalElements?.toLocaleString() || 0}</span>개
              </span>
              <div className="text-gray-400 text-sm">
                최신순
              </div>
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
                    <div className="text-white text-sm font-medium line-clamp-2">
                      {work.title}
                    </div>
                    <div className="text-yellow-400 text-xs font-semibold">
                      ⭐ {(work.score || 0).toFixed(1)}
                    </div>
                  </div>
                ))}
              </div>

              {/* 페이지네이션 */}
              {data && data.totalPages > 1 && (
                <div className="flex flex-col items-center gap-3 mt-8 mb-4">
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
                            <span key={`ellipsis-${idx}`} className="text-gray-500 px-2">
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
                                ? "bg-[#646cff] text-white"
                                : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                            }`}
                          >
                            {pageNum + 1}
                          </button>
                        );
                      });
                    })()}
                  </div>
                  
                  {/* 이전/다음 버튼 */}
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => setPage(page - 1)}
                      disabled={page === 0}
                      className={`px-4 py-2 rounded-lg font-medium transition ${
                        page === 0
                          ? "bg-gray-800 text-gray-600 cursor-not-allowed"
                          : "bg-[#646cff] text-white hover:bg-[#7d84ff]"
                      }`}
                    >
                      이전
                    </button>
                    <span className="text-white text-sm">
                      {page + 1} / {data.totalPages}
                    </span>
                    <button
                      onClick={() => setPage(page + 1)}
                      disabled={page >= data.totalPages - 1}
                      className={`px-4 py-2 rounded-lg font-medium transition ${
                        page >= data.totalPages - 1
                          ? "bg-gray-800 text-gray-600 cursor-not-allowed"
                          : "bg-[#646cff] text-white hover:bg-[#7d84ff]"
                      }`}
                    >
                      다음
                    </button>
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

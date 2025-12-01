import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useWorks, useGenres } from "../hooks/useWorks";

type Category = "av" | "game" | "webtoon" | "webnovel";

const categories: { id: Category; label: string; domain: string }[] = [
  { id: "av", label: "AV", domain: "AV" },
  { id: "game", label: "게임", domain: "GAME" },
  { id: "webtoon", label: "웹툰", domain: "WEBTOON" },
  { id: "webnovel", label: "웹소설", domain: "WEBNOVEL" },
];

const sortOptions = [
  { value: "popular", label: "인기순" },
  { value: "newest", label: "최신순" },
  { value: "review", label: "리뷰 많은순" },
  { value: "rating", label: "평점 높은순" },
];

export default function ExplorePage() {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState<Category>("game");
  const [selectedGenres, setSelectedGenres] = useState<Set<string>>(new Set());
  const [selectedSort, setSelectedSort] = useState(sortOptions[0]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [page, setPage] = useState(0);

  const currentDomain = categories.find(c => c.id === selectedCategory)?.domain || "GAME";

  const { data: genresData } = useGenres(currentDomain);
  const availableGenres = genresData || [];

  const selectedGenresArray =
    selectedGenres.size > 0 ? Array.from(selectedGenres) : undefined;

  const { data, isLoading } = useWorks({
    domain: currentDomain,
    genres: selectedGenresArray,
    page,
    size: 20,
    sortBy: selectedSort.value === "rating" ? "score" : "masterTitle",
    sortDirection: selectedSort.value === "rating" ? "desc" : "asc",
  });

  const handleCategoryChange = (category: Category) => {
    setSelectedCategory(category);
    setSelectedGenres(new Set());
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

  const handleSortSelect = (option: typeof sortOptions[0]) => {
    setSelectedSort(option);
    setIsDropdownOpen(false);
    setPage(0);
  };

  const totalCount = data?.totalElements || 0;

  return (
    <div className="flex flex-col min-h-screen bg-[var(--bg-primary)]">
      {/* 헤더 */}
      <header className="sticky top-0 z-50 bg-[var(--bg-primary)] h-[60px] flex items-center justify-center">
        <h1 className="text-lg font-semibold text-white">탐색</h1>
        <button
          className="absolute right-4 w-5 h-5"
          onClick={() => navigate("/explore?search=true")}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path
              d="M9.16667 15.8333C12.8486 15.8333 15.8333 12.8486 15.8333 9.16667C15.8333 5.48477 12.8486 2.5 9.16667 2.5C5.48477 2.5 2.5 5.48477 2.5 9.16667C2.5 12.8486 5.48477 15.8333 9.16667 15.8333Z"
              stroke="white"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M17.5 17.5L13.875 13.875"
              stroke="white"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </header>

      {/* 카테고리 탭 */}
      <nav className="flex w-full border-b border-[var(--grey-700)]">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => handleCategoryChange(cat.id)}
            className={`flex-1 py-2 text-center transition-all ${
              selectedCategory === cat.id
                ? "border-b-2 border-white text-white font-semibold"
                : "text-[var(--grey-300)]"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </nav>

      {/* 장르 필터 */}
      {availableGenres.length > 0 && (
        <div className="flex gap-2 px-4 py-3 overflow-x-auto scrollbar-hide">
          {availableGenres.slice(0, 10).map((genre) => (
            <button
              key={genre}
              onClick={() => toggleGenre(genre)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm transition-colors whitespace-nowrap ${
                selectedGenres.has(genre)
                  ? "bg-[var(--purple)] text-white"
                  : "bg-transparent border border-[var(--grey-700)] text-[var(--grey-200)]"
              }`}
            >
              {genre}
            </button>
          ))}
        </div>
      )}

      {/* 정렬 헤더 */}
      <div className="flex items-center justify-between px-4 py-2">
        <span className="text-sm text-[var(--grey-200)]">
          총 {totalCount.toLocaleString()}개
        </span>
        <div className="relative">
          <button
            className="flex items-center gap-1 text-sm text-[var(--grey-200)]"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          >
            {selectedSort.label}
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path
                d="M2 4L5 7L8 4"
                stroke="var(--grey-200)"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          {isDropdownOpen && (
            <div className="absolute right-0 top-full mt-1 bg-[var(--bg-secondary)] rounded shadow-lg z-10 min-w-[120px]">
              {sortOptions.map((option) => (
                <button
                  key={option.value}
                  className="w-full px-4 py-2 text-left text-sm text-[var(--grey-200)] hover:bg-[var(--bg-hover)] flex items-center justify-between"
                  onClick={() => handleSortSelect(option)}
                >
                  {option.label}
                  {selectedSort.value === option.value && (
                    <span className="text-[var(--purple)]">✓</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 작품 그리드 */}
      <div className="flex-1 px-4 pb-24">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-[var(--purple)] border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : data && data.content.length > 0 ? (
          <div className="grid grid-cols-4 gap-2">
            {data.content.map((work) => (
              <article
                key={work.id}
                onClick={() => handleCardClick(String(work.id))}
                className="flex flex-col gap-1 cursor-pointer"
              >
                <div className="relative w-full bg-[var(--bg-secondary)] rounded overflow-hidden aspect-[0.71]">
                  <img
                    src={work.thumbnail || "https://via.placeholder.com/80x112"}
                    alt={work.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.src = "https://via.placeholder.com/80x112?text=No+Image";
                    }}
                  />
                </div>
                <div className="flex flex-col">
                  <h3 className="text-[12px] text-white line-clamp-1">{work.title}</h3>
                  <div className="flex items-center gap-0.5">
                    <svg width="10" height="10" viewBox="0 0 14 14" fill="none">
                      <path
                        d="M7 1L8.545 4.635L12.5 5.027L9.5 7.772L10.09 11.7L7 9.985L3.91 11.7L4.5 7.772L1.5 5.027L5.455 4.635L7 1Z"
                        fill="var(--purple)"
                      />
                    </svg>
                    <span className="text-[10px] text-[var(--purple)]">
                      {(work.score || 0).toFixed(1)}
                    </span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="text-center text-[var(--grey-300)] py-12">
            작품이 없습니다.
          </div>
        )}
      </div>
    </div>
  );
}

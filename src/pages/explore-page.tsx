import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useGenresWithCount, useInfiniteWorks } from "../hooks/useWorks";
import Header from "../components/common/Header";
import { DOMAIN_PLATFORMS, PLATFORM_META } from "../constants/platforms";
import PurpleStar from "../assets/purple-star.svg";
import FilterIcon from "../assets/filter-icon.svg";

import {
  type Category,
  imageAspectMap,
  thumbnailFallbackMap,
} from "../constants/thumbnail";

import { useVirtualizer } from "@tanstack/react-virtual";

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
    },
  );

  const [selectedGenres, setSelectedGenres] = useState<Set<string>>(() => {
    const genres = searchParams.get("genres");
    return genres ? new Set(genres.split(",")) : new Set();
  });

  const [showGenreFilter, setShowGenreFilter] = useState(false);

  // URL 동기화
  useEffect(() => {
    const params = new URLSearchParams();
    params.set("category", selectedCategory);

    if (!selectedPlatforms.has("ALL") && selectedPlatforms.size > 0) {
      params.set("platforms", Array.from(selectedPlatforms).join(","));
    }

    if (selectedGenres.size > 0) {
      params.set("genres", Array.from(selectedGenres).join(","));
    }

    setSearchParams(params, { replace: true });
  }, [selectedCategory, selectedPlatforms, selectedGenres]);

  const { data: genresWithCountData } = useGenresWithCount(
    selectedCategory.toUpperCase(),
  );

  // 장르를 작품 수 기준 내림차순으로 정렬
  const sortedGenres = genresWithCountData
    ? Object.entries(genresWithCountData).sort(
      ([, countA], [, countB]) => countB - countA,
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
  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isError,
  } = useInfiniteWorks({
    domain: selectedCategory.toUpperCase(),
    platforms: selectedPlatformsArray,
    genres: selectedGenresArray,
    size: 60,
    sortBy: "releaseDate",
    sortDirection: "desc",
  });

  const items = useMemo(
    () => data?.pages.flatMap((p) => p.content) ?? [],
    [data],
  );
  const totalElements = data?.pages?.[0]?.totalElements ?? 0;

  const handleCategoryChange = (category: Category) => {
    setSelectedCategory(category);
    setSelectedPlatforms(new Set(["ALL"]));
    setSelectedGenres(new Set());
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
  };

  const toggleGenre = (genre: string) => {
    const newSelection = new Set(selectedGenres);
    if (newSelection.has(genre)) newSelection.delete(genre);
    else newSelection.add(genre);
    setSelectedGenres(newSelection);
  };

  const handleCardClick = (id: string) => {
    navigate(`/work/${id}`);
  };

  const parentRef = useRef<HTMLDivElement>(null);
  const COLS = 3;
  const rowCount = Math.ceil(items.length / COLS);

  const rowVirtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 340,
    overscan: 6,
  });

  useEffect(() => {
    if (!hasNextPage || isFetchingNextPage) return;
    const virtualRows = rowVirtualizer.getVirtualItems();
    const lastRow = virtualRows[virtualRows.length - 1];
    if (!lastRow) return;

    if (lastRow.index >= rowCount - 3) {
      fetchNextPage();
    }
  }, [
    rowVirtualizer.getVirtualItems(),
    rowCount,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  ]);

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
                className={`flex-1 text-center py-3 transition-all select-none ${selectedCategory === cat.id
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
    ${isSelected
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
                      className={`px-3 py-1 rounded-full text-xs border transition-all ${isSelected
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
          {items.length > 0 && (
            <div className="flex items-center justify-between mb-4">
              <span className="text-gray-400 text-sm">
                총{" "}
                <span className="text-white font-semibold">
                  {totalElements?.toLocaleString() || 0}
                </span>
                개
              </span>
              <div className="text-gray-400 text-sm">최신순</div>
            </div>
          )}

          {isError && (
            <div className="text-center text-gray-500 py-20">
              불러오기에 실패했습니다.
            </div>
          )}

          {/* 작품 목록 */}
          {isLoading ? (
            <div className="text-center text-gray-500 py-20">로딩 중...</div>
          ) : items.length > 0 ? (
            <div
              ref={parentRef}
              className="overflow-y-auto scrollbar-hide"
              style={{ height: "calc(100vh - 260px)" }}
            >
              <div
                style={{
                  height: rowVirtualizer.getTotalSize(),
                  position: "relative",
                }}
              >
                {rowVirtualizer.getVirtualItems().map((vRow) => {
                  const startIndex = vRow.index * COLS;
                  const rowItems = items.slice(startIndex, startIndex + COLS);

                  return (
                    <div
                      key={vRow.key}
                      ref={rowVirtualizer.measureElement}
                      data-index={vRow.index}
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "100%",
                        transform: `translateY(${vRow.start}px)`,
                      }}
                    >
                      <div className="grid grid-cols-3 gap-5">
                        {rowItems.map((work) => (
                          <div
                            key={work.id}
                            onClick={() => handleCardClick(String(work.id))}
                            className="cursor-pointer transition-transform hover:-translate-y-1"
                          >
                            <div
                              className={`relative w-full ${imageAspectMap[selectedCategory]} rounded-lg mb-2 bg-[#302F31] overflow-hidden`}
                            >
                              {work.thumbnail ? (
                                <img
                                  src={work.thumbnail}
                                  alt={work.title}
                                  className="w-full h-full object-cover rounded-lg"
                                />
                              ) : (
                                <img
                                  src={thumbnailFallbackMap[selectedCategory]}
                                  alt="기본 썸네일"
                                  className="absolute inset-0 m-auto object-contain
        w-[clamp(32px,30%,64px)]
        h-[clamp(32px,30%,64px)]
        opacity-80"
                                />
                              )}
                            </div>

                            <div className="font-[PretendardVariable] text-white text-sm font-semibold truncate">
                              {work.title}
                            </div>

                            <div className="font-[PretendardVariable] text-gray-400 text-xs mt-0.5">
                              {domainLabelMap[work.domain] || work.domain}
                              {work.releaseDate &&
                                ` • ${new Date(work.releaseDate).getFullYear()}`}
                            </div>

                            <div className="flex items-center text-[#855BFF] text-sm font-medium mt-1 gap-1 mb-3">
                              <img
                                src={PurpleStar}
                                alt="평점"
                                className="w-4 h-4"
                              />{" "}
                              {(work.score || 0).toFixed(1)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              {isFetchingNextPage && (
                <div className="text-center text-grey-500 py-10">
                  불러오는 중...
                </div>
              )}
              {!hasNextPage && items.length > 0 && (
                <div className="text-center text-grey-600 py-10">
                  더 불러올 작품이 없습니다.
                </div>
              )}
            </div>
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

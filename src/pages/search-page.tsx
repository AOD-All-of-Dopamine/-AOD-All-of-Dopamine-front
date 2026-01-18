import { useNavigate, useSearchParams } from "react-router-dom";
import SearchBar from "../components/SearchBar";
import BackIcon from "../assets/left-arrow.svg";
import { useState } from "react";
import { useSearchWorks } from "../hooks/useWorks";
import PurpleStar from "../assets/purple-star.svg";
import { DOMAIN_LABEL_MAP, DOMAIN_FILTERS } from "../constants/domain";

type Domain = keyof typeof DOMAIN_LABEL_MAP;

export default function SearchPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialKeyword = searchParams.get("keyword") ?? "";
  const [keyword, setKeyword] = useState(initialKeyword);
  const [page, setPage] = useState(0);
  const [selectedDomain, setSelectedDomain] = useState<Domain | "ALL">("ALL");

  const handleDomainClick = (id: Domain | "ALL") => {
    setSelectedDomain(id);
    setPage(0);
  };

  const { data, isLoading } = useSearchWorks(keyword, {
    page,
    size: 20,
    domain: selectedDomain === "ALL" ? undefined : selectedDomain,
  });

  const handleSearch = (query: string) => {
    setKeyword(query);
    setPage(0);
    navigate(`/search?keyword=${encodeURIComponent(query)}`, {
      replace: true,
    });
  };

  const handleCardClick = (id: string) => {
    navigate(`/work/${id}`);
  };

  return (
    <div className="min-h-screen bg-[#242424]">
      {/* 🔒 상단 고정 영역 */}
      <div
        className="
    fixed top-0 left-1/2 -translate-x-1/2
    w-full max-w-2xl
    bg-[#242424]
    z-50
  "
      >
        {/* 뒤로가기 + 검색바 */}
        <div className="flex items-center px-3 h-[56px]">
          <button onClick={() => navigate(-1)} className="p-2 shrink-0">
            <img src={BackIcon} alt="뒤로가기" className="w-5 h-5" />
          </button>

          <div className="flex-1">
            <SearchBar
              fixed={false}
              onSearch={handleSearch}
              defaultValue={initialKeyword}
            />
          </div>
        </div>

        {/* 도메인 필터 */}
        <div className="border-b border-white/10">
          <div className="px-4">
            <div className="flex gap-1">
              {DOMAIN_FILTERS.map((filter) => {
                const isActive = selectedDomain === filter.id;

                return (
                  <button
                    key={filter.id}
                    onClick={() => handleDomainClick(filter.id)}
                    className={`flex-1 py-3 text-sm transition-all
                ${
                  isActive
                    ? "border-b-2 border-white text-white font-semibold"
                    : "text-gray-400 hover:text-gray-300"
                }
              `}
                  >
                    {filter.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="pt-30 px-5 max-w-2xl mx-auto">
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

                  <div className="text-white text-sm font-semibold truncate">
                    {work.title}
                  </div>

                  <div className="text-gray-400 text-xs mt-0.5">
                    {DOMAIN_LABEL_MAP[work.domain] ?? work.domain}
                    {work.releaseDate &&
                      ` • ${new Date(work.releaseDate).getFullYear()}`}
                  </div>

                  <div className="flex items-center text-[#855BFF] text-sm font-medium mt-1 gap-1">
                    <img src={PurpleStar} className="w-4 h-4" />
                    {(work.score || 0).toFixed(1)}
                  </div>
                </div>
              ))}
            </div>

            {/* 페이지네이션 */}
            {data && data.totalPages > 1 && (
              <div className="flex flex-col items-center gap-3 mt-8">
                <div className="flex items-center gap-1 flex-wrap justify-center">
                  {(() => {
                    const totalPages = data.totalPages;
                    const currentPage = page;
                    const pageNumbers: number[] = [];

                    pageNumbers.push(0);

                    const start = Math.max(1, currentPage - 2);
                    const end = Math.min(totalPages - 2, currentPage + 2);

                    if (start > 1) pageNumbers.push(-1);

                    for (let i = start; i <= end; i++) {
                      pageNumbers.push(i);
                    }

                    if (end < totalPages - 2) pageNumbers.push(-2);

                    if (totalPages > 1) pageNumbers.push(totalPages - 1);

                    return pageNumbers.map((pageNum, idx) => {
                      if (pageNum < 0) {
                        return (
                          <span key={idx} className="text-gray-500 px-2">
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
        ) : keyword ? (
          <div className="text-center text-gray-500 py-20">
            검색 결과가 없습니다.
          </div>
        ) : (
          <div className="text-center text-gray-600 py-20">
            검색어를 입력해주세요.
          </div>
        )}
      </div>
    </div>
  );
}

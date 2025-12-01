import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useRecentReleases } from "../hooks/useWorks";

type Category = "av" | "game" | "webtoon" | "webnovel";

const categories: { id: Category; label: string; domain: string }[] = [
  { id: "av", label: "AV", domain: "AV" },
  { id: "game", label: "게임", domain: "GAME" },
  { id: "webtoon", label: "웹툰", domain: "WEBTOON" },
  { id: "webnovel", label: "웹소설", domain: "WEBNOVEL" },
];

// 스트리밍 서비스 (공개예정 Anima 디자인 참고)
const streamingServices = [
  { id: "all", name: "All", icon: null },
  { id: "netflix", name: "Netflix", icon: "�" },
  { id: "tving", name: "Tving", icon: "📺" },
  { id: "wavve", name: "Wavve", icon: "🌊" },
  { id: "watcha", name: "Watcha", icon: "�" },
  { id: "disney", name: "Disney+", icon: "🏰" },
];

export default function NewReleasesPage() {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState<Category>("game");
  const [selectedService, setSelectedService] = useState("all");
  const [page, setPage] = useState(0);

  const currentDomain = categories.find(c => c.id === selectedCategory)?.domain || "GAME";

  // API 호출 (신작만 표시)
  const { data, isLoading, error } = useRecentReleases({
    domain: currentDomain,
    page,
    size: 20,
  });

  const works = data?.content || [];

  const handleCategoryChange = (category: Category) => {
    setSelectedCategory(category);
    setPage(0);
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

  // 날짜별로 그룹화
  const groupedByDate = works.reduce((acc: Record<string, typeof works>, work) => {
    const dateKey = work.releaseDate ? formatDate(work.releaseDate) : "미정";
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(work);
    return acc;
  }, {});

  return (
    <div className="flex flex-col min-h-screen bg-[var(--bg-primary)]">
      {/* 헤더 */}
      <header className="sticky top-0 z-50 bg-[var(--bg-primary)] h-[60px] flex items-center justify-center">
        <button
          className="absolute left-4 w-6 h-6"
          onClick={() => navigate(-1)}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path
              d="M15 18L9 12L15 6"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <h1 className="text-lg font-semibold text-white">공개예정</h1>
        <button
          className="absolute right-4 w-5 h-5"
          onClick={() => navigate("/explore")}
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

      {/* 스트리밍 서비스 필터 */}
      <div className="flex gap-3 px-4 py-3 overflow-x-auto scrollbar-hide">
        {streamingServices.map((service) => (
          <button
            key={service.id}
            onClick={() => setSelectedService(service.id)}
            className={`flex-shrink-0 w-[42px] h-[42px] rounded-full flex items-center justify-center text-xs transition-all ${
              selectedService === service.id
                ? "bg-[var(--purple)] text-white border-2 border-[var(--purple)]"
                : "bg-[var(--bg-secondary)] border border-[var(--grey-700)] text-[var(--grey-100)]"
            }`}
          >
            {service.icon || service.name}
          </button>
        ))}
      </div>

      {/* 콘텐츠 */}
      <div className="flex-1 px-4 pb-24">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-[var(--purple)] border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : error ? (
          <div className="text-center text-[var(--grey-300)] py-12">
            데이터를 불러올 수 없습니다.
          </div>
        ) : works.length > 0 ? (
          <div className="flex flex-col gap-6">
            {Object.entries(groupedByDate).map(([date, dateWorks]) => (
              <div key={date}>
                {/* 날짜 헤더 */}
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg font-semibold text-white">{date}</span>
                  <span className="text-sm text-[var(--grey-300)]">
                    {dateWorks.length}개
                  </span>
                </div>
                
                {/* 작품 리스트 */}
                <div className="flex flex-col gap-2">
                  {dateWorks.map((work) => (
                    <div
                      key={work.id}
                      className="flex items-center gap-3 py-2 cursor-pointer"
                      onClick={() => handleItemClick(work.id)}
                    >
                      {/* 썸네일 */}
                      <div className="w-[60px] h-[84px] bg-[var(--bg-secondary)] rounded overflow-hidden flex-shrink-0">
                        <img
                          src={work.thumbnail || "https://via.placeholder.com/60x84"}
                          alt={work.title}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.src = "https://via.placeholder.com/60x84?text=No";
                          }}
                        />
                      </div>
                      
                      {/* 정보 */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base text-white truncate">{work.title}</h3>
                        <p className="text-sm text-[var(--grey-300)]">
                          {work.domain || selectedCategory}
                        </p>
                        <div className="flex items-center gap-0.5 mt-1">
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                            <path
                              d="M7 1L8.545 4.635L12.5 5.027L9.5 7.772L10.09 11.7L7 9.985L3.91 11.7L4.5 7.772L1.5 5.027L5.455 4.635L7 1Z"
                              fill="var(--purple)"
                            />
                          </svg>
                          <span className="text-sm text-[var(--purple)]">
                            {(work.score || 0).toFixed(1)}
                          </span>
                        </div>
                      </div>
                      
                      {/* 알림 버튼 */}
                      <button className="w-8 h-8 flex items-center justify-center">
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                          <path
                            d="M15 6.667C15 5.34 14.473 4.067 13.535 3.13C12.598 2.192 11.326 1.667 10 1.667C8.674 1.667 7.402 2.192 6.464 3.13C5.527 4.067 5 5.34 5 6.667C5 12.5 2.5 14.167 2.5 14.167H17.5C17.5 14.167 15 12.5 15 6.667Z"
                            stroke="var(--grey-400)"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M11.442 17.5C11.288 17.766 11.065 17.986 10.797 18.138C10.529 18.29 10.227 18.369 9.92 18.369C9.612 18.369 9.31 18.29 9.042 18.138C8.774 17.986 8.552 17.766 8.398 17.5"
                            stroke="var(--grey-400)"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-[var(--grey-300)] py-12">
            공개 예정 작품이 없습니다.
          </div>
        )}
      </div>
    </div>
  );
}

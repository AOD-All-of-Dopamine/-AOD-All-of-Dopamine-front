import { useNavigate } from "react-router-dom";
import SearchBar from "../components/SearchBar";
import HorizontalScroller from "../components/HorizontalScroller";
import { useRecentReviewedWorks } from "../hooks/useWorks";
import { useQuery } from "@tanstack/react-query";
import { rankingApi } from "../api/rankingApi";
import NewIcon from "../assets/home/new-icon.png";
import LikeIcon from "../assets/home/likes-icon.svg";
import BookmarkIcon from "../assets/home/bookmarks-icon.svg";
import { useAuth } from "../contexts/AuthContext";
import Modal from "../components/common/Modal";
import { useState, useRef, useEffect } from "react";
import { Category } from "../constants/thumbnail";

// 랭킹 아이템 타입
interface RankingItemProps {
  rank: number;
  title: string;
  thumbnail: string;
  change: number;
  changeType: "up" | "down" | "same";
  onClick: () => void;
}

// 랭킹 아이템 컴포넌트
function RankingItem({
  rank,
  title,
  thumbnail,
  change,
  changeType,
  onClick,
}: RankingItemProps) {
  return (
    <li
      className="flex items-center justify-between py-1.5 cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-center gap-2">
        <span className="w-5 text-lg font-semibold text-white text-center">
          {rank}
        </span>
        <div className="w-10 h-[54px] bg-[var(--bg-secondary)] rounded-sm overflow-hidden">
          <img
            src={thumbnail}
            alt={title}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.src = "https://via.placeholder.com/40x54?text=No";
            }}
          />
        </div>
        <span className="text-sm text-white">{title}</span>
      </div>
      <div className="flex items-center gap-0.5 w-5">
        {changeType !== "same" && (
          <>
            <span
              className={`text-xs ${changeType === "up" ? "text-[var(--red)]" : "text-[var(--blue)]"}`}
            >
              {change}
            </span>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              {changeType === "up" ? (
                <path d="M6 2L10 8H2L6 2Z" fill="var(--red)" />
              ) : (
                <path d="M6 10L2 4H10L6 10Z" fill="var(--blue)" />
              )}
            </svg>
          </>
        )}
        {changeType === "same" && (
          <span className="text-xs text-[var(--grey-400)]">-</span>
        )}
      </div>
    </li>
  );
}

// 랭킹 섹션 컴포넌트
interface RankingSectionProps {
  items: Array<{
    id: string;
    title: string;
    thumbnail: string;
    rank: number;
  }>;
  domainLabel: string;
  onViewAll: () => void;
  onItemClick: (id: string) => void;
}

function RankingSection({ items, domainLabel, onViewAll, onItemClick }: RankingSectionProps) {
  // 상위 3개만 표시
  const topItems = items.slice(0, 3);

  return (
    <article className="mb-6 w-full flex-shrink-0 snap-center">
      <header className="flex items-center justify-between mb-1.5">
        <h2 className="text-base font-semibold text-white">랭킹 <span className="text-xs text-[#855BFF] ml-1">{domainLabel}</span></h2>
        <button
          className="flex items-center gap-1 font-[PretendardVariable] text-[14px] text-[#B2B1B3]"
          onClick={onViewAll}
        >
          전체보기
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="w-3 h-3 text-[#B2B1B3]">
            <path d="M4.5 9L7.5 6L4.5 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </header>
      <ul>
        {topItems.map((item, index) => (
          <RankingItem
            key={item.id}
            rank={index + 1}
            title={item.title}
            thumbnail={item.thumbnail}
            change={1}
            changeType={index % 2 === 0 ? "up" : "down"}
            onClick={() => onItemClick(item.id)}
          />
        ))}
      </ul>
    </article>
  );
}

export default function HomePage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const domains: Category[] = ["movie", "tv", "game", "webtoon", "webnovel"];
  const domainLabels: Record<Category, string> = {
    movie: "영화", tv: "시리즈", game: "게임", webtoon: "웹툰", webnovel: "웹소설"
  };
  const BACKEND_PLATFORM_MAPPING: Record<Category, string> = {
    movie: "TMDB_MOVIE",
    tv: "TMDB_TV",
    game: "Steam",
    webtoon: "NaverWebtoon",
    webnovel: "NaverSeries",
  };

  // [✨ 기능 개편] 5초마다 자동으로 가로 스크롤 넘기기
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % domains.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [domains.length]);

  useEffect(() => {
    if (scrollRef.current) {
      const container = scrollRef.current;
      // 전체 스크롤 너비를 아이템 갯수로 나누어 1칸의 너비를 계산
      const itemWidth = container.scrollWidth / domains.length;
      container.scrollTo({
        left: itemWidth * activeIndex,
        behavior: "smooth"
      });
    }
  }, [activeIndex, domains.length]);

  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isNoContentModalOpen, setIsNoContentModalOpen] = useState(false);

  const handleProtectedNavigation = (path: string) => {
    if (!isAuthenticated) {
      setIsLoginModalOpen(true);
      return;
    }
    navigate(path);
  };

  // [✨ 기능 개편] AI 추천 연동 준비중 안내로 대체 (기존 GAME 더미 데이터 호출 삭제)

  // [✨ API 개편] 랭킹 전체 데이터 1회 호출
  // 매번 5초마다 도메인별 API를 부르면 깜빡임 현상이 있으므로, 최초에 전체 플랫폼의 랭킹을 한 번에 가져옴
  const { data: allRankings, isLoading: isLoadingRankings } = useQuery({
    queryKey: ["home-all-rankings"],
    queryFn: () => rankingApi.getAllRankings(),
  });

  // [✨ API 개편] 최신 리뷰 작품 연동
  // 이전에는 useWorks(단순 전체조회)를 사용 중이었으나, 새로 생긴 getRecentReviewedWorks 전용 훅으로 교체
  const { data: recentReviews, isLoading: isLoadingRecentReviews } = useRecentReviewedWorks({
    size: 10,
  });

  const handleSearch = (query: string) => {
    navigate(`/search?keyword=${encodeURIComponent(query)}`);
  };

  const handleRankingClick = (category: Category) => {
    navigate(`/ranking?category=${category}`);
  };

  const handleRankingItemClick = (id: string) => {
    if (id.startsWith("no-content-")) {
      setIsNoContentModalOpen(true);
    } else {
      navigate(`/work/${id}`);
    }
  };

  const mapToWorkItem = (item: any) => ({
    id: String(item.id),
    title: item.title,
    thumbnail: item.thumbnail || "https://via.placeholder.com/160x220",
    score: item.score || 0,
    domain: item.domain,
    year: item.releaseDate,
  });

  // [✨ 기능 개편] 랭킹 클릭 처리 및 예외 핸들링
  // ranking.id(외부랭킹 PK) 대신 ranking.contentId(우리 DB의 Content PK)로 연결되도록 수정함
  const mapToRankingItem = (item: any) => ({
    id: item.contentId ? String(item.contentId) : `no-content-${item.id}`,
    title: item.title,
    thumbnail: item.thumbnailUrl || item.thumbnail || "https://via.placeholder.com/160x220",
    rank: item.ranking,
  });

  return (
    <>
      <div className="flex flex-col min-h-screen w-full max-w-2xl mx-auto px-5">
        {/* 검색 바 */}
        <SearchBar onSearch={handleSearch} />

        <div className="pb-20">
          {/* 하단 동그라미 네비게이션 */}
          <div className="flex justify-center gap-11 mt-20 mb-10">
            {[
              { id: 1, path: "/new", icon: NewIcon, label: "공개예정" },
              {
                id: 2,
                path: "/profile/likes",
                icon: LikeIcon,
                label: "좋아요",
              },
              {
                id: 3,
                path: "/profile/bookmarks",
                icon: BookmarkIcon,
                label: "북마크",
              },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  if (item.path.startsWith("/profile")) {
                    handleProtectedNavigation(item.path);
                  } else {
                    navigate(item.path);
                  }
                }}
                className="flex flex-col items-center gap-2 active:scale-95 transition"
              >
                {/* 동그라미 */}
                <div className="w-13 h-13 rounded-full bg-[#363539] flex items-center justify-center shadow-md">
                  <img
                    src={item.icon}
                    alt="nav-icon"
                    className="w-6 h-6 object-contain"
                  />
                </div>
                {/* 라벨 */}
                <span className="text-sm text-gray-300">{item.label}</span>
              </button>
            ))}
          </div>

          {/* 랭킹 (가로 슬라이드 컨테이너) */}
          {!isLoadingRankings && allRankings && (
            <div
              ref={scrollRef}
              className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide w-full gap-5"
            >
              {domains.map((domain) => {
                const platform = BACKEND_PLATFORM_MAPPING[domain];
                const domainItems = allRankings
                  .filter((item) => item.platform === platform)
                  .sort((a, b) => a.ranking - b.ranking)
                  .slice(0, 3); // 상위 3개 표시

                if (domainItems.length === 0) return null;

                return (
                  <RankingSection
                    key={domain}
                    items={domainItems.map(mapToRankingItem)}
                    domainLabel={domainLabels[domain]}
                    onViewAll={() => handleRankingClick(domain)}
                    onItemClick={handleRankingItemClick}
                  />
                );
              })}
            </div>
          )}

          {/* AI 맞춤 추천 (준비중) */}
          <section className="mb-10 w-full flex-shrink-0 snap-center">
            <header className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold text-white">모두의도파민님만을 위한 추천 <span className="text-xs text-[#855BFF] ml-1">AI</span></h2>
            </header>
            <div className="w-full h-36 rounded-xl bg-[#2A292D] flex flex-col items-center justify-center border border-[#3A393D] border-dashed gap-2">
              <span className="text-2xl opacity-70">🤖</span>
              <span className="text-sm text-gray-400 font-[PretendardVariable]">AI 맞춤 추천 엔진 연동 준비중입니다</span>
            </div>
          </section>

          {/* 최신 리뷰 작품 */}
          {!isLoadingRecentReviews && recentReviews?.content && (
            <HorizontalScroller
              title="최신 리뷰 작품"
              items={recentReviews.content.map(mapToWorkItem)}
            />
          )}
        </div>
      </div>

      {isLoginModalOpen && (
        <Modal
          title={
            <>
              로그인이 필요한 기능입니다.
              <br />
              로그인 후 이용해 주세요.
            </>
          }
          buttons={[
            {
              text: "취소",
              onClick: () => setIsLoginModalOpen(false),
            },
            {
              text: "로그인",
              variant: "purple",
              onClick: () => navigate("/login"),
            },
          ]}
        />
      )}

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

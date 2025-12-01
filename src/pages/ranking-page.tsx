import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { rankingApi, ExternalRanking } from "../api/rankingApi";

type Category = "all" | "movie" | "tv" | "game" | "webtoon" | "webnovel";
type Period = "daily" | "weekly" | "monthly";

interface RankingItem {
  id: string;
  rank: number;
  title: string;
  thumbnail: string;
  score: number;
  badges?: string[];
  change: number;
  changeType: "up" | "down" | "none" | "new";
}

const categories: { id: Category; label: string }[] = [
  { id: "all", label: "전체" },
  { id: "movie", label: "영화" },
  { id: "tv", label: "TV" },
  { id: "game", label: "게임" },
  { id: "webtoon", label: "웹툰" },
  { id: "webnovel", label: "웹소설" },
];

const periods: { id: Period; label: string }[] = [
  { id: "daily", label: "일간" },
  { id: "weekly", label: "주간" },
  { id: "monthly", label: "월간" },
];

const PLATFORM_MAPPING: Record<Category, string> = {
  all: "ALL",
  movie: "TMDB_MOVIE",
  tv: "TMDB_TV",
  game: "STEAM_GAME",
  webtoon: "NAVER_WEBTOON",
  webnovel: "NAVER_SERIES",
};

const BACKEND_PLATFORM_MAPPING: Record<string, string> = {
  ALL: "ALL",
  TMDB_MOVIE: "TMDB_MOVIE",
  TMDB_TV: "TMDB_TV",
  STEAM_GAME: "Steam",
  NAVER_WEBTOON: "NaverWebtoon",
  NAVER_SERIES: "NaverSeries",
};

export default function RankingPage() {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState<Category>("all");
  const [selectedPeriod, setSelectedPeriod] = useState<Period>("daily");
  const [rankings, setRankings] = useState<RankingItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchRankings = async () => {
      setLoading(true);
      try {
        const frontendPlatform = PLATFORM_MAPPING[selectedCategory];
        const backendPlatform = BACKEND_PLATFORM_MAPPING[frontendPlatform];
        
        let data: ExternalRanking[] = [];
        if (backendPlatform === "ALL") {
          // 전체 카테고리의 경우 게임 데이터로 대체 (임시)
          data = await rankingApi.getRankingsByPlatform("Steam");
        } else {
          data = await rankingApi.getRankingsByPlatform(backendPlatform);
        }
        
        const mappedData: RankingItem[] = data.map((item: ExternalRanking, index: number) => ({
          id: item.contentId ? String(item.contentId) : `no-content-${item.id}`,
          rank: item.ranking,
          title: item.title,
          thumbnail: item.thumbnailUrl || "https://via.placeholder.com/40x54",
          score: 3.9,
          badges: index < 2 ? ["New"] : [],
          change: Math.floor(Math.random() * 3) + 1,
          changeType: index % 3 === 0 ? "up" : index % 3 === 1 ? "down" : "none",
        }));
        setRankings(mappedData);
      } catch (error) {
        console.error(error);
        setRankings([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRankings();
  }, [selectedCategory]);

  const handleCardClick = (id: string) => {
    if (id.startsWith("no-content-")) {
      alert("이 작품의 상세 정보가 아직 준비되지 않았습니다.");
      return;
    }
    navigate(`/work/${id}`);
  };

  // 현재 날짜 포맷
  const today = new Date();
  const dateString = `${today.getMonth() + 1}.${today.getDate()} 기준`;

  return (
    <div className="flex flex-col min-h-screen bg-[var(--bg-primary)] text-white">
      {/* 헤더 */}
      <header className="sticky top-0 z-50 bg-[var(--bg-primary)] h-[60px] flex items-center justify-center">
        <h1 className="text-lg font-semibold">랭킹</h1>
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

      {/* 기간 탭 */}
      <nav className="flex w-full border-b border-[var(--grey-700)]">
        {periods.map((p) => (
          <button
            key={p.id}
            onClick={() => setSelectedPeriod(p.id)}
            className={`flex-1 py-2 text-center transition-all ${
              selectedPeriod === p.id
                ? "border-b-2 border-white text-white font-semibold"
                : "text-[var(--grey-300)]"
            }`}
          >
            {p.label}
          </button>
        ))}
      </nav>

      {/* 카테고리 필터 */}
      <div className="flex gap-2 px-4 py-3 overflow-x-auto scrollbar-hide">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm transition-colors whitespace-nowrap ${
              selectedCategory === cat.id
                ? "bg-[var(--purple)] text-white"
                : "bg-transparent border border-[var(--grey-700)] text-[var(--grey-200)]"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* 업데이트 날짜 */}
      <div className="flex items-center gap-1 px-4 py-2">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path
            d="M8 14C11.3137 14 14 11.3137 14 8C14 4.68629 11.3137 2 8 2C4.68629 2 2 4.68629 2 8C2 11.3137 4.68629 14 8 14Z"
            stroke="var(--grey-200)"
            strokeWidth="1.2"
          />
          <path d="M8 4.5V8L10.5 9.5" stroke="var(--grey-200)" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
        <span className="text-sm text-[var(--grey-200)]">{dateString}</span>
      </div>

      {/* 랭킹 리스트 */}
      <div className="flex-1 px-4 pb-24">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-[var(--purple)] border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : rankings.length > 0 ? (
          <ol className="flex flex-col">
            {rankings.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between py-1.5 cursor-pointer"
                onClick={() => handleCardClick(item.id)}
              >
                <div className="flex items-center gap-2">
                  {/* 순위 */}
                  <span className="w-5 text-lg font-semibold text-white text-center">
                    {item.rank}
                  </span>
                  
                  {/* 썸네일 */}
                  <div className="w-10 h-[54px] bg-[var(--bg-secondary)] rounded-sm overflow-hidden">
                    <img
                      src={item.thumbnail}
                      alt={item.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = "https://via.placeholder.com/40x54?text=No";
                      }}
                    />
                  </div>
                  
                  {/* 정보 */}
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-base text-white">{item.title}</span>
                      {item.badges?.map((badge, idx) => (
                        <span
                          key={idx}
                          className="px-1 py-0.5 text-xs text-[var(--purple)] bg-[var(--purple-light)] rounded"
                        >
                          {badge}
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center gap-0.5">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path
                          d="M8 1L9.854 5.854L15 6.527L11 9.472L11.708 14.6L8 12.654L4.292 14.6L5 9.472L1 6.527L6.146 5.854L8 1Z"
                          fill="var(--purple)"
                        />
                      </svg>
                      <span className="text-sm text-[var(--purple)]">{item.score}</span>
                    </div>
                  </div>
                </div>
                
                {/* 순위 변동 */}
                <div className="flex items-center gap-0.5 w-5">
                  {item.changeType === "up" && (
                    <>
                      <span className="text-xs text-[var(--red)]">{item.change}</span>
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d="M6 2L10 8H2L6 2Z" fill="var(--red)" />
                      </svg>
                    </>
                  )}
                  {item.changeType === "down" && (
                    <>
                      <span className="text-xs text-[var(--blue)]">{item.change}</span>
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d="M6 10L2 4H10L6 10Z" fill="var(--blue)" />
                      </svg>
                    </>
                  )}
                  {item.changeType === "none" && (
                    <span className="text-xs text-[var(--grey-400)]">-</span>
                  )}
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <div className="text-center text-[var(--grey-300)] py-12">
            랭킹 데이터가 없습니다.
          </div>
        )}
      </div>
    </div>
  );
}

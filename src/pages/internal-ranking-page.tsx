import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/common/Header";

type Domain = "movie" | "tv" | "game" | "webtoon" | "webnovel";

interface InternalRankingItem {
  id: number;
  rank: number;
  title: string;
  thumbnail: string;
  domain: Domain;
  score: number;
}

const domains: { id: Domain; label: string }[] = [
  { id: "movie", label: "영화" },
  { id: "tv", label: "TV" },
  { id: "game", label: "게임" },
  { id: "webtoon", label: "웹툰" },
  { id: "webnovel", label: "웹소설" },
];

// 더미 데이터
const dummyRankings: InternalRankingItem[] = [
  { id: 1, rank: 1, title: "인기 작품 1", thumbnail: "https://via.placeholder.com/60x80", domain: "movie", score: 9.5 },
  { id: 2, rank: 2, title: "인기 작품 2", thumbnail: "https://via.placeholder.com/60x80", domain: "tv", score: 9.3 },
  { id: 3, rank: 3, title: "인기 작품 3", thumbnail: "https://via.placeholder.com/60x80", domain: "game", score: 9.1 },
  { id: 4, rank: 4, title: "인기 작품 4", thumbnail: "https://via.placeholder.com/60x80", domain: "webtoon", score: 8.9 },
  { id: 5, rank: 5, title: "인기 작품 5", thumbnail: "https://via.placeholder.com/60x80", domain: "webnovel", score: 8.7 },
  { id: 6, rank: 6, title: "인기 작품 6", thumbnail: "https://via.placeholder.com/60x80", domain: "movie", score: 8.5 },
  { id: 7, rank: 7, title: "인기 작품 7", thumbnail: "https://via.placeholder.com/60x80", domain: "tv", score: 8.3 },
  { id: 8, rank: 8, title: "인기 작품 8", thumbnail: "https://via.placeholder.com/60x80", domain: "game", score: 8.1 },
  { id: 9, rank: 9, title: "인기 작품 9", thumbnail: "https://via.placeholder.com/60x80", domain: "webtoon", score: 7.9 },
  { id: 10, rank: 10, title: "인기 작품 10", thumbnail: "https://via.placeholder.com/60x80", domain: "webnovel", score: 7.7 },
];

const getDomainBadgeColor = (domain: Domain): string => {
  const colors: Record<Domain, string> = {
    movie: "bg-red-500",
    tv: "bg-blue-500",
    game: "bg-green-500",
    webtoon: "bg-yellow-500",
    webnovel: "bg-purple-500",
  };
  return colors[domain];
};

const getDomainLabel = (domain: Domain): string => {
  const label = domains.find((d) => d.id === domain);
  return label ? label.label : domain;
};

export default function InternalRankingPage() {
  const navigate = useNavigate();
  const [selectedDomain, setSelectedDomain] = useState<Domain | "all">("all");

  const filteredRankings = selectedDomain === "all" 
    ? dummyRankings 
    : dummyRankings.filter((item) => item.domain === selectedDomain);

  return (
    <div className="flex flex-col h-screen">
      <Header
        title="내부 랭킹"
        rightIcon="search"
        onRightClick={() => alert("검색 기능 준비 중")}
        bgColor="#242424"
      />
      <div className="w-full max-w-2xl mx-auto px-5">
        {/* 도메인 필터 */}
        <div className="flex gap-4 overflow-x-auto scrollbar-hide py-3 mt-10">
          <button
            onClick={() => setSelectedDomain("all")}
            className={`flex-shrink-0 px-5 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
              selectedDomain === "all"
                ? "bg-[#855BFF] text-white"
                : "text-[#D3D3D3] border border-[#333]"
            }`}
          >
            전체
          </button>
          {domains.map((domain) => (
            <button
              key={domain.id}
              onClick={() => setSelectedDomain(domain.id)}
              className={`flex-shrink-0 px-5 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                selectedDomain === domain.id
                  ? "bg-[#855BFF] text-white"
                  : "text-[#D3D3D3] border border-[#333]"
              }`}
            >
              {domain.label}
            </button>
          ))}
        </div>

        {/* 랭킹 콘텐츠 */}
        <div className="flex-1 overflow-y-auto p-5">
          {filteredRankings.length > 0 ? (
            <div className="flex flex-col gap-3">
              {filteredRankings.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-4 p-3 bg-[#242424] rounded-md cursor-pointer transition-transform hover:bg-[#242424] hover:translate-x-1"
                  onClick={() => navigate(`/work/${item.id}`)}
                >
                  <div
                    className={`w-10 text-center font-bold text-xl ${
                      item.rank === 1
                        ? "text-yellow-400"
                        : item.rank === 2
                          ? "text-gray-300"
                          : item.rank === 3
                            ? "text-[#cd7f32]"
                            : "text-[#646cff]"
                    }`}
                  >
                    {item.rank}
                  </div>
                  <img
                    src={item.thumbnail}
                    alt={item.title}
                    className="w-15 h-20 rounded-md object-cover bg-[#242424] flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm mb-1 truncate">
                      {item.title}
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span
                        className={`${getDomainBadgeColor(item.domain)} text-white px-2 py-0.5 rounded-full font-medium`}
                      >
                        {getDomainLabel(item.domain)}
                      </span>
                      <span className="text-[#855BFF] font-semibold">
                        ★ {item.score.toFixed(1)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-gray-400 py-12">
              랭킹 데이터가 없습니다.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

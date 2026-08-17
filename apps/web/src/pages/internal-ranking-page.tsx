import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Star } from "@phosphor-icons/react";
import DomainChip from "../components/ui/DomainChip";
import Tag from "../components/ui/Tag";

/**
 * /internal/ranking - 스펙상 후속 스코프(유저 데이터 축적 후 재설계 예정, §1 스코프 제외).
 * 더미 데이터·리스트 레이아웃은 그대로 두고 토큰 재스킨만 최소 적용.
 * - 구 Header 제거 -> 상단 뒤로가기(work-detail 관례) + 페이지 제목.
 *   (구 우측 검색 아이콘은 "준비 중" alert 데모라 함께 제거)
 * - 도메인 필터 버튼 -> DomainChip, 도메인 뱃지 -> Tag, 별점 -> Phosphor Star.
 * - 순위 강조색은 팔레트 유틸 대신 1~3위 accent-ink / 그 외 ink-3.
 */

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

const getDomainLabel = (domain: Domain): string => {
  const label = domains.find((d) => d.id === domain);
  return label ? label.label : domain;
};

export default function InternalRankingPage() {
  const navigate = useNavigate();
  const [selectedDomain, setSelectedDomain] = useState<Domain | "all">("all");

  const filteredRankings =
    selectedDomain === "all"
      ? dummyRankings
      : dummyRankings.filter((item) => item.domain === selectedDomain);

  return (
    <div className="mx-auto w-full max-w-2xl px-5 pb-20 pt-6">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="-ml-2.5 inline-flex items-center gap-1.5 rounded-input px-2.5 py-1.5 text-sm font-medium text-ink-2 transition-colors hover:bg-ink/5 hover:text-ink"
      >
        <ArrowLeft size={16} />
        뒤로 가기
      </button>

      <h1 className="mt-4 text-[26px] font-extrabold tracking-[-0.03em] text-ink">
        내부 랭킹
      </h1>

      {/* 도메인 필터 */}
      <div className="mt-4 flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
        <DomainChip
          active={selectedDomain === "all"}
          onClick={() => setSelectedDomain("all")}
        >
          전체
        </DomainChip>
        {domains.map((domain) => (
          <DomainChip
            key={domain.id}
            active={selectedDomain === domain.id}
            onClick={() => setSelectedDomain(domain.id)}
          >
            {domain.label}
          </DomainChip>
        ))}
      </div>

      {/* 랭킹 콘텐츠 */}
      <div className="mt-5">
        {filteredRankings.length > 0 ? (
          <div className="flex flex-col gap-3">
            {filteredRankings.map((item) => (
              <div
                key={item.id}
                className="flex cursor-pointer items-center gap-4 rounded-panel border border-line bg-surface p-3 shadow-card transition-colors hover:border-line-strong"
                onClick={() => navigate(`/work/${item.id}`)}
              >
                <div
                  className={`w-10 text-center text-xl font-extrabold tabular-nums ${
                    item.rank <= 3 ? "text-accent-ink" : "text-ink-3"
                  }`}
                >
                  {item.rank}
                </div>
                <img
                  src={item.thumbnail}
                  alt={item.title}
                  className="aspect-[3/4] w-[60px] flex-shrink-0 rounded-input border border-line bg-canvas object-cover"
                />
                <div className="min-w-0 flex-1">
                  <div className="mb-1.5 truncate text-[15px] font-bold text-ink">
                    {item.title}
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <Tag variant="accent">{getDomainLabel(item.domain)}</Tag>
                    <span className="inline-flex items-center gap-1 font-bold tabular-nums text-ink">
                      <Star weight="fill" size={13} className="text-star" />
                      {item.score.toFixed(1)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-12 text-center text-ink-3">
            랭킹 데이터가 없습니다.
          </div>
        )}
      </div>
    </div>
  );
}

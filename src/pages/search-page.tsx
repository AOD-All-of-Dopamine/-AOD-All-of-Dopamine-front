import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  MagnifyingGlass,
  WarningCircle,
} from "@phosphor-icons/react";
import { useSearchWorks } from "../hooks/useWorks";
import { DOMAIN_LABEL_MAP, DOMAIN_FILTERS } from "../constants/domain";
import { thumbnailFallbackMap, type Category } from "../constants/thumbnail";
import WorkCard from "../components/ui/WorkCard";
import {
  workCardFooter,
  workCardMeta,
  workCardTags,
} from "../components/ui/workCardInfo";
import DomainChip from "../components/ui/DomainChip";
import Pagination from "../components/ui/Pagination";
import EmptyState from "../components/ui/EmptyState";
import SkeletonCard from "../components/ui/SkeletonCard";

/**
 * /search - 목업 없음. 기존 구조(뒤로가기 + 검색 입력 + 도메인 필터 + 결과 그리드 +
 * 페이지네이션) 유지 + 토큰·공용 컴포넌트 재스킨.
 * - 구 sticky 다크 스트립 + 모바일 전용 SearchBar 제거 -> 페이지 인라인 검색 필
 *   (전 폭 노출 - 데스크톱 SiteHeader의 검색 링크가 이 페이지로 오므로 lg에서도 필요).
 * - 도메인 언더라인 탭 -> DomainChip(1차 칩 위계), 결과 카드 -> WorkCard(portrait),
 *   인라인 페이지네이션 -> ui/Pagination.
 */

type Domain = keyof typeof DOMAIN_LABEL_MAP;

const PAGE_SIZE = 20;

const categoryOf = (domain?: string): Category => {
  const key = domain?.toLowerCase() as Category;
  return key in thumbnailFallbackMap ? key : "movie";
};

const gridClass =
  "mt-6 grid grid-cols-2 gap-x-3 gap-y-3.5 min-[480px]:grid-cols-3 min-[768px]:gap-x-[18px] min-[768px]:gap-y-5";

export default function SearchPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialKeyword = searchParams.get("keyword") ?? "";
  const [keyword, setKeyword] = useState(initialKeyword);
  const [inputValue, setInputValue] = useState(initialKeyword);
  const [page, setPage] = useState(0);
  const [selectedDomain, setSelectedDomain] = useState<Domain | "ALL">("ALL");

  const handleDomainClick = (id: Domain | "ALL") => {
    setSelectedDomain(id);
    setPage(0);
  };

  const { data, isLoading, isError, refetch } = useSearchWorks(keyword, {
    page,
    size: PAGE_SIZE,
    domain: selectedDomain === "ALL" ? undefined : selectedDomain,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = inputValue.trim();
    if (!query) return;
    setKeyword(query);
    setPage(0);
    navigate(`/search?keyword=${encodeURIComponent(query)}`, {
      replace: true,
    });
  };

  return (
    <div className="mx-auto w-full max-w-2xl px-5 pb-20 pt-6">
      {/* 뒤로가기 + 검색 입력 */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="뒤로 가기"
          className="-ml-2.5 grid h-9 w-9 flex-none place-items-center rounded-input text-ink-2 transition-colors hover:bg-ink/5 hover:text-ink"
        >
          <ArrowLeft size={18} />
        </button>
        <form
          onSubmit={handleSubmit}
          className="flex h-10 flex-1 items-center gap-2 rounded-full border border-line bg-surface px-4 text-ink-3 transition-colors focus-within:border-line-strong"
        >
          <MagnifyingGlass size={16} className="flex-none" />
          <input
            type="search"
            aria-label="작품 검색"
            placeholder="작품, 개발사, 작가 검색"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            autoFocus
            className="w-full bg-transparent text-[15px] text-ink outline-none placeholder:text-ink-3"
          />
        </form>
      </div>

      {/* 도메인 필터 */}
      <div className="mt-4 flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
        {DOMAIN_FILTERS.map((filter) => (
          <DomainChip
            key={filter.id}
            active={selectedDomain === filter.id}
            onClick={() => handleDomainClick(filter.id)}
          >
            {filter.label}
          </DomainChip>
        ))}
      </div>

      {/* 결과 영역: 로딩 / 에러 / 결과 / 결과 없음 / 검색 전 */}
      {isLoading ? (
        <div className={gridClass} aria-hidden="true">
          {Array.from({ length: 6 }, (_, i) => (
            <SkeletonCard key={i} variant="portrait" />
          ))}
        </div>
      ) : isError ? (
        <div className="mt-6">
          <EmptyState
            icon={<WarningCircle size={44} />}
            title="검색 결과를 불러오지 못했어요"
            description="네트워크 상태를 확인한 뒤 다시 시도해 주세요."
            action={
              <button
                type="button"
                onClick={() => refetch()}
                className="rounded-full bg-ink px-[22px] py-2.5 text-sm font-semibold text-surface transition-opacity hover:opacity-85 active:scale-[0.98]"
              >
                다시 시도
              </button>
            }
          />
        </div>
      ) : data && data.content.length > 0 ? (
        <>
          <div className={gridClass}>
            {data.content.map((work) => (
              // 혼합 도메인 결과라 meta 앞에 도메인 라벨, foot은 도메인별 구성
              <WorkCard
                key={work.id}
                variant="portrait"
                title={work.title}
                meta={workCardMeta(work, { withDomain: true })}
                tags={workCardTags(work)}
                imageUrl={work.thumbnail || null}
                fallbackIconUrl={thumbnailFallbackMap[categoryOf(work.domain)]}
                to={`/work/${work.id}`}
                footer={workCardFooter(work)}
              />
            ))}
          </div>

          {data.totalPages > 1 && (
            <div className="mt-10">
              <Pagination
                page={page + 1}
                totalPages={data.totalPages}
                onChange={(next) => {
                  setPage(next - 1);
                  window.scrollTo({ top: 0 });
                }}
              />
            </div>
          )}
        </>
      ) : keyword ? (
        <div className="mt-6">
          <EmptyState
            title="검색 결과가 없어요"
            description="다른 검색어로 다시 시도해 보세요."
          />
        </div>
      ) : (
        <div className="mt-6">
          <EmptyState
            icon={<MagnifyingGlass size={44} />}
            title="검색어를 입력해 주세요"
            description="작품 제목이나 제작자 이름으로 찾을 수 있어요."
          />
        </div>
      )}
    </div>
  );
}

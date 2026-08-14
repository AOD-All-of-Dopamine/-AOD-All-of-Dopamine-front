import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, BookmarkSimple, MagnifyingGlass } from "@phosphor-icons/react";
import { useMyBookmarks } from "../hooks/useInteractions";
import { thumbnailFallbackMap, type Category } from "../constants/thumbnail";
import WorkCard from "../components/ui/WorkCard";
import {
  workCardFooter,
  workCardMeta,
  workCardTags,
} from "../components/ui/workCardInfo";
import EmptyState from "../components/ui/EmptyState";
import SkeletonCard from "../components/ui/SkeletonCard";

/**
 * /profile/bookmarks - 목업 없음. 기존 구조(제목 검색 + 3열 포스터 그리드) 유지 +
 * 토큰·공용 컴포넌트 재스킨.
 * - 구 Header·모바일 전용 SearchBar(fixed/offsetTop) 제거 -> 상단 뒤로가기
 *   (work-detail 관례) + 전 폭 공용 검색 필(로컬 제목 필터, 입력 즉시 반영).
 * - 카드 마크업은 WorkCard(portrait)로 대체, 빈 상태는 EmptyState.
 */

const categoryOf = (domain?: string): Category => {
  const key = domain?.toLowerCase() as Category;
  return key in thumbnailFallbackMap ? key : "movie";
};

const gridClass =
  "mt-5 grid grid-cols-2 gap-x-3 gap-y-3.5 min-[480px]:grid-cols-3 min-[768px]:gap-x-[18px] min-[768px]:gap-y-5";

export default function MyBookmarksPage() {
  const navigate = useNavigate();
  const [page] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const { data, isLoading } = useMyBookmarks(page, 1000);
  const filteredWorks = (data?.content ?? []).filter((work: any) =>
    work.title.toLowerCase().includes(searchQuery.toLowerCase()),
  );

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
        내가 북마크한 작품
      </h1>

      <div className="mt-4 flex h-[38px] w-full max-w-[340px] items-center gap-2 rounded-full border border-line bg-surface px-3.5 text-ink-3 transition-colors focus-within:border-line-strong">
        <MagnifyingGlass size={16} className="flex-none" />
        <input
          type="search"
          aria-label="북마크한 작품 검색"
          placeholder="작품 제목 검색"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink-3"
        />
      </div>

      {isLoading ? (
        <div className={gridClass} aria-hidden="true">
          {Array.from({ length: 6 }, (_, i) => (
            <SkeletonCard key={i} variant="portrait" />
          ))}
        </div>
      ) : data && data.content.length > 0 ? (
        filteredWorks.length > 0 ? (
          <div className={gridClass}>
            {filteredWorks.map((work: any) => (
              // 혼합 도메인 목록 - 도메인 라벨 포함 meta + 도메인별 태그·foot
              // (상호작용 API가 신규 필드를 아직 안 주면 기존 "도메인 · 연도"와 동일)
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
        ) : (
          <div className="mt-5">
            <EmptyState
              variant="note"
              title="검색어와 일치하는 작품이 없어요"
              description="다른 제목으로 검색해 보세요."
            />
          </div>
        )
      ) : (
        <div className="mt-5">
          <EmptyState
            icon={<BookmarkSimple size={44} />}
            title="아직 북마크한 작품이 없어요"
            description="나중에 볼 작품을 북마크로 모아보세요."
            action={
              <button
                type="button"
                onClick={() => navigate("/explore")}
                className="rounded-full bg-ink px-[22px] py-2.5 text-sm font-semibold text-surface transition-opacity hover:opacity-85 active:scale-[0.98]"
              >
                작품 둘러보기
              </button>
            }
          />
        </div>
      )}
    </div>
  );
}

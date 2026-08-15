import { useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Plus, SignIn, Stack, WarningCircle } from "@phosphor-icons/react";
import { useAuth } from "../contexts/AuthContext";
import { useCollections, useMyCollections } from "../hooks/useCollections";
import { CollectionSummary } from "../api/collectionApi";
import CollectionCard, {
  CollectionCardSkeleton,
} from "../components/ui/CollectionCard";
import DomainChip from "../components/ui/DomainChip";
import EmptyState from "../components/ui/EmptyState";
import Pagination from "../components/ui/Pagination";

/**
 * /collections - mockups/collections-mockup.html 섹션 1(발견)·5a(모바일) 이식.
 * 레이아웃: 페이지 헤드(h1 + 새 컬렉션) / 서브 카피 / 탭 행(인기·최신·도메인4·
 * 내 컬렉션) / 콜라주 카드 그리드(데스크톱 4열, 모바일 1열) / 페이지네이션.
 * URL 쿼리(?tab=&page=)가 상태의 단일 출처 (탐색 페이지 관례) -
 * 탭 전환은 push + 페이지 리셋, 직접 진입·뒤로가기 모두 여기서 복원된다.
 *
 * 목업·계약 대비 편차:
 * - "영화·시리즈" 탭: 백엔드 목록 API가 domain 단수만 받아 MOVIE·TV 2요청을
 *   같은 페이지 번호로 병합한다. 페이지 내 정렬은 클라이언트에서 재정렬하지만
 *   페이지 경계를 넘는 전역 정렬은 근사치 (컬렉션 수가 적은 초기에 수용).
 * - 도메인 탭의 정렬은 인기순 고정 (탭이 단일 선택이라 정렬 축과 조합 불가).
 * - "새 컬렉션" 버튼은 /collections/new로 push - 페이지는 C-FE2 몫이라
 *   404 방지용 자리 라우트(collection-wip-page)가 임시로 받는다.
 */

const PAGE_SIZE = 20;

type TabId =
  | "popular"
  | "latest"
  | "game"
  | "webtoon"
  | "movies"
  | "webnovel"
  | "mine";

const TABS: { id: TabId; label: string }[] = [
  { id: "popular", label: "인기" },
  { id: "latest", label: "최신" },
  { id: "game", label: "게임" },
  { id: "webtoon", label: "웹툰" },
  { id: "movies", label: "영화·시리즈" },
  { id: "webnovel", label: "웹소설" },
  { id: "mine", label: "내 컬렉션" },
];

const TAB_IDS = TABS.map((t) => t.id);

/** 단일 도메인 탭 -> API domain 파라미터 (movies는 MOVIE·TV 병합이라 별도 처리) */
const TAB_DOMAIN: Partial<Record<TabId, string>> = {
  game: "GAME",
  webtoon: "WEBTOON",
  webnovel: "WEBNOVEL",
};

/** URL 쿼리를 유효한 화면 상태로 정규화 (잘못된 값은 안전 폴백) */
const parseParams = (p: URLSearchParams) => {
  const rawTab = p.get("tab") ?? "popular";
  const tab: TabId = (TAB_IDS as string[]).includes(rawTab)
    ? (rawTab as TabId)
    : "popular";
  const rawPage = Number.parseInt(p.get("page") ?? "1", 10);
  const page = Number.isFinite(rawPage) && rawPage >= 1 ? rawPage : 1;
  return { tab, page };
};

/** 병합 탭(영화·시리즈)용 정렬 - 서버 정렬 스펙(CollectionService)과 동일 기준 */
const compareBySort = (sort: "popular" | "latest") => {
  return (a: CollectionSummary, b: CollectionSummary) => {
    if (sort === "popular" && a.likeCount !== b.likeCount) {
      return b.likeCount - a.likeCount;
    }
    if (a.createdAt !== b.createdAt) {
      return a.createdAt < b.createdAt ? 1 : -1;
    }
    return b.id - a.id;
  };
};

const makeBtnClass =
  "inline-flex flex-none items-center gap-1.5 rounded-full bg-accent-ink px-3.5 py-2 text-[13px] font-bold text-surface transition-opacity hover:opacity-90 active:scale-[0.98] lg:px-[18px] lg:py-2.5 lg:text-sm";

export default function CollectionsPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const { tab, page } = useMemo(() => parseParams(searchParams), [searchParams]);

  const isMine = tab === "mine";
  const isMovies = tab === "movies";
  const sort: "popular" | "latest" = tab === "latest" ? "latest" : "popular";

  const handleTabChange = (next: TabId) => {
    if (next === tab) return;
    const params = new URLSearchParams(searchParams);
    if (next === "popular") params.delete("tab");
    else params.set("tab", next);
    params.delete("page");
    setSearchParams(params);
    window.scrollTo({ top: 0 });
  };

  const handlePageChange = (next: number) => {
    if (next === page) return;
    const params = new URLSearchParams(searchParams);
    if (next > 1) params.set("page", String(next));
    else params.delete("page");
    setSearchParams(params);
    window.scrollTo({ top: 0 });
  };

  // 탭별 쿼리 - 훅 호출은 고정하고 enabled로 발사를 가른다
  const publicQuery = useCollections(
    { sort, domain: TAB_DOMAIN[tab], page: page - 1, size: PAGE_SIZE },
    { enabled: !isMine && !isMovies },
  );
  const movieQuery = useCollections(
    { sort, domain: "MOVIE", page: page - 1, size: PAGE_SIZE },
    { enabled: isMovies },
  );
  const tvQuery = useCollections(
    { sort, domain: "TV", page: page - 1, size: PAGE_SIZE },
    { enabled: isMovies },
  );
  const mineQuery = useMyCollections(
    page - 1,
    PAGE_SIZE,
    isMine && isAuthenticated,
  );

  // 활성 탭의 목록·상태로 수렴 (movies는 MOVIE·TV 페이지 병합 + 재정렬)
  const view = useMemo(() => {
    if (isMine) {
      return {
        items: mineQuery.data?.content ?? [],
        totalPages: mineQuery.data?.totalPages ?? 0,
        isLoading: mineQuery.isLoading,
        isError: mineQuery.isError,
        refetch: () => mineQuery.refetch(),
      };
    }
    if (isMovies) {
      const merged = [
        ...(movieQuery.data?.content ?? []),
        ...(tvQuery.data?.content ?? []),
      ].sort(compareBySort(sort));
      return {
        items: merged,
        totalPages: Math.max(
          movieQuery.data?.totalPages ?? 0,
          tvQuery.data?.totalPages ?? 0,
        ),
        isLoading: movieQuery.isLoading || tvQuery.isLoading,
        isError: movieQuery.isError || tvQuery.isError,
        refetch: () => {
          movieQuery.refetch();
          tvQuery.refetch();
        },
      };
    }
    return {
      items: publicQuery.data?.content ?? [],
      totalPages: publicQuery.data?.totalPages ?? 0,
      isLoading: publicQuery.isLoading,
      isError: publicQuery.isError,
      refetch: () => publicQuery.refetch(),
    };
  }, [isMine, isMovies, sort, mineQuery, movieQuery, tvQuery, publicQuery]);

  const { items, totalPages, isLoading, isError } = view;

  // 데이터 로드 후 URL의 page가 실제 범위를 넘으면 1페이지로 정정 (replace)
  useEffect(() => {
    if (!isLoading && !isError && page > 1 && page > totalPages) {
      const params = new URLSearchParams(searchParams);
      params.delete("page");
      setSearchParams(params, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, isError, page, totalPages]);

  const gridClass =
    "grid grid-cols-1 gap-3.5 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 lg:gap-5 min-[1200px]:grid-cols-4";

  const needLogin = isMine && !isAuthenticated;

  return (
    <div className="mx-auto max-w-[1440px] px-4 pb-16 pt-4 lg:px-6 lg:pb-[64px] lg:pt-6">
      {/* 페이지 헤드 (목업 .page-head / 모바일 .m-head-row) */}
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-[22px] font-extrabold tracking-[-0.02em] text-ink lg:text-[26px]">
          컬렉션
        </h1>
        <button
          type="button"
          onClick={() => navigate("/collections/new")}
          className={makeBtnClass}
        >
          <Plus size={15} weight="bold" aria-hidden="true" />새 컬렉션
        </button>
      </div>
      <p className="mt-1 text-[13.5px] text-ink-2 lg:text-[14.5px]">
        취향이 담긴 목록을 구경하고, 나만의 컬렉션을 꾸려보세요.
      </p>

      {/* 탭 행 - 데스크톱 래핑 없음, 모바일 가로 스크롤 (목업 .disc-tabs / .m-chips) */}
      <div className="-mx-4 mt-4 flex gap-1.5 overflow-x-auto px-4 scrollbar-hide lg:mx-0 lg:mt-[18px] lg:px-0">
        {TABS.map(({ id, label }) => (
          <DomainChip
            key={id}
            size="lg"
            active={tab === id}
            onClick={() => handleTabChange(id)}
          >
            {label}
          </DomainChip>
        ))}
      </div>

      {/* 상태 3종 + 카드 그리드 */}
      <div className="mt-4 lg:mt-[22px]">
        {needLogin ? (
          <EmptyState
            icon={<SignIn size={44} />}
            title="로그인하면 내 컬렉션을 볼 수 있어요"
            description="나만 보기 컬렉션까지 한 곳에서 관리할 수 있어요."
            action={
              <button
                type="button"
                onClick={() => navigate("/login")}
                className="rounded-full bg-ink px-[22px] py-2.5 text-sm font-semibold text-surface transition-opacity hover:opacity-85 active:scale-[0.98]"
              >
                로그인
              </button>
            }
          />
        ) : isLoading ? (
          <div className={gridClass} aria-hidden="true">
            {Array.from({ length: 8 }, (_, i) => (
              <CollectionCardSkeleton key={i} />
            ))}
          </div>
        ) : isError ? (
          <EmptyState
            icon={<WarningCircle size={44} />}
            title="컬렉션을 불러오지 못했어요"
            description="네트워크 상태를 확인한 뒤 다시 시도해 주세요."
            action={
              <button
                type="button"
                onClick={() => view.refetch()}
                className="rounded-full bg-ink px-[22px] py-2.5 text-sm font-semibold text-surface transition-opacity hover:opacity-85 active:scale-[0.98]"
              >
                다시 시도
              </button>
            }
          />
        ) : items.length === 0 ? (
          <EmptyState
            icon={<Stack size={44} />}
            title="아직 컬렉션이 없어요"
            description={
              isMine
                ? "마음에 드는 작품을 모아 첫 컬렉션을 꾸려보세요."
                : "첫 번째 컬렉션의 주인공이 되어보세요."
            }
            action={
              <button
                type="button"
                onClick={() => navigate("/collections/new")}
                className={makeBtnClass}
              >
                <Plus size={15} weight="bold" aria-hidden="true" />새 컬렉션
              </button>
            }
          />
        ) : (
          <>
            <div className={gridClass}>
              {items.map((collection) => (
                <CollectionCard key={collection.id} collection={collection} />
              ))}
            </div>
            {totalPages > 1 && (
              <div className="mt-10">
                <Pagination
                  page={page}
                  totalPages={totalPages}
                  onChange={handlePageChange}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

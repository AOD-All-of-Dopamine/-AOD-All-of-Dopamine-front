import { Link } from "react-router-dom";
import { CaretRight, WarningCircle } from "@phosphor-icons/react";
import { usePlatformRankings, useWorks } from "@aod/shared/hooks";
import { workLiteSignal } from "@aod/shared/constants";
import { EXPLORE_THEME_SIZE, type ExploreTheme } from "../../constants/exploreThemes";
import { useTracker } from "../../tracking/trackerContext";
import WorkThumb from "../ui/WorkThumb";

/**
 * 탐색 "전체"의 테마 선반 — 한 줄 = 제목 · 규칙 한 줄(회색) · "전체 ›" · 세로 포스터 가로 줄 12편.
 * 선반마다 상태가 따로다: 로딩 = 골격, 실패 = 한 줄 다시 시도, 0편 = 선반을 숨긴다.
 */

interface ShelfItem {
  id: number;
  title: string;
  thumbnail: string | null;
  portrait?: string | null;
  sub?: string;
}

const Shelf = ({
  theme,
  items,
  isLoading,
  isError,
  onRetry,
}: {
  theme: ExploreTheme;
  items: ShelfItem[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}) => {
  const tracker = useTracker();
  if (!isLoading && !isError && items.length === 0) return null;
  const titleId = `theme-${theme.id}`;
  return (
    <section aria-labelledby={titleId} className="mt-10 first:mt-6">
      <div className="flex items-end gap-3">
        <div className="min-w-0">
          <h2 id={titleId} className="text-[19px] font-extrabold tracking-[-0.02em] text-ink">
            {theme.title}
          </h2>
          <p className="mt-0.5 truncate text-[13px] text-ink-3">{theme.rule}</p>
        </div>
        <Link
          to={theme.moreTo}
          aria-label={`${theme.title} 전체 보기`}
          className="ml-auto inline-flex flex-none items-center gap-[3px] text-sm font-semibold text-ink-2 transition-colors hover:text-accent-ink"
        >
          전체
          <CaretRight size={14} />
        </Link>
      </div>
      {isLoading ? (
        <div aria-hidden="true" className="mt-3.5 flex gap-3.5 overflow-hidden">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="aspect-[2/3] w-[140px] flex-none animate-pulse rounded-panel bg-line" />
          ))}
        </div>
      ) : isError ? (
        <p role="alert" className="mt-3.5 flex items-center gap-2 text-sm text-ink-2">
          <WarningCircle size={16} className="text-ink-3" />
          불러오지 못했어요.
          <button type="button" onClick={onRetry} className="font-semibold text-accent-ink hover:underline">
            다시 시도
          </button>
        </p>
      ) : (
        <ul className="-mx-6 mt-3.5 flex gap-3.5 overflow-x-auto px-6 pb-1.5 scrollbar-hide">
          {items.map((item, index) => (
            <li key={item.id} className="w-[140px] flex-none">
              <Link
                to={`/work/${item.id}`}
                onClick={() =>
                  tracker.track("card_clicked", {
                    contentId: item.id,
                    surface: "explore_theme",
                    payload: { theme: theme.id, position: index },
                  })
                }
                className="group block"
              >
                <WorkThumb
                  imageUrl={item.thumbnail}
                  portraitUrl={item.portrait}
                  domain={theme.domain}
                  className="rounded-panel"
                />
                <span className="mt-2 line-clamp-2 block text-[13.5px] font-bold leading-snug text-ink transition-colors group-hover:text-accent-ink">
                  {item.title}
                </span>
                {item.sub && <span className="mt-0.5 block truncate text-[12px] text-ink-3">{item.sub}</span>}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

const WorksShelf = ({ theme }: { theme: Extract<ExploreTheme, { kind: "works" }> }) => {
  const { data, isLoading, isError, refetch } = useWorks({ ...theme.query, page: 0, size: EXPLORE_THEME_SIZE });
  const items: ShelfItem[] = (data?.content ?? []).map((work) => ({
    id: work.id,
    title: work.title,
    thumbnail: work.thumbnail,
    portrait: work.portraitThumbnail,
    sub: workLiteSignal(work).left.map((p) => p.text).join(" · "),
  }));
  return <Shelf theme={theme} items={items} isLoading={isLoading} isError={isError} onRetry={() => refetch()} />;
};

const RankingShelf = ({ theme }: { theme: Extract<ExploreTheme, { kind: "ranking" }> }) => {
  const { data, isLoading, isError, refetch } = usePlatformRankings(theme.platform);
  const items: ShelfItem[] = (data ?? [])
    .filter((row) => row.contentId)
    .sort((a, b) => a.ranking - b.ranking)
    .slice(0, EXPLORE_THEME_SIZE)
    .map((row) => ({
      id: row.contentId as number,
      title: row.title,
      thumbnail: row.thumbnailUrl,
      portrait: row.portraitImageUrl,
      sub: `오늘 ${row.ranking}위`,
    }));
  return <Shelf theme={theme} items={items} isLoading={isLoading} isError={isError} onRetry={() => refetch()} />;
};

export default function ExploreThemeShelves({ themes }: { themes: ExploreTheme[] }) {
  return (
    <div>
      {themes.map((theme) =>
        theme.kind === "works" ? <WorksShelf key={theme.id} theme={theme} /> : <RankingShelf key={theme.id} theme={theme} />,
      )}
    </div>
  );
}

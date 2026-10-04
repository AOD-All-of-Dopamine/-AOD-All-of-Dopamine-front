import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { CaretDown, CaretRight, WarningCircle } from "@phosphor-icons/react";
import type { ExternalRanking } from "@aod/shared/api";
import {
  useAllRankings,
  useFeaturedToday,
  useNotableReleases,
  useReleasesByDomain,
} from "@aod/shared/hooks";
import type { NotableGroup, WorkSummary } from "@aod/shared/types";
import {
  DOMAIN_LABEL_MAP,
  TREND_PLATFORMS,
  notableReasonText,
  rankChange,
  rankingSignal,
  workLiteSignal,
} from "@aod/shared/constants";
import { useTracker } from "../tracking/trackerContext";
import { daysUntil, dDayOf, parseYmd } from "../utils/releaseDate";
import DomainChip from "../components/ui/DomainChip";
import WorkThumb from "../components/ui/WorkThumb";

/**
 * /trend — 트렌드(랭킹 + 신작 통합, 설계 docs/superpowers/specs/2026-10-04-trend-explore-design.md T3′).
 * 위에서 아래로: ① 분야별 1위 다섯 장 ② 지금 뜨는 Top 10(#hot, 100위까지 펼침) ③ 새로 나온 주목작(#new)
 * ④ 곧 나올(#upcoming, 데이터가 있는 분야만). 데이터: /api/rankings/all 한 번(①②) · 주목작 API(③) · 출시 예정(④).
 * - 순위는 콘텐츠가 연결된 행만(성인 판별이 안 된 행이 섞이지 않게 — 홈과 같다).
 * - 변동은 서버가 기준일(rankBaseDate)을 줄 때만 보인다 — 없으면 칸을 비운다(첫날 · 옛 응답).
 * - ?hot= 분야 칩(replace), 해시(#hot · #new · #upcoming)는 데이터가 온 뒤 한 번 스크롤.
 */

const HOT_DOMAINS = TREND_PLATFORMS.map((p) => p.domain.toLowerCase());
const HOT_SIZE = 10;
const UPCOMING_DOMAINS = ["GAME", "MOVIE", "TV", "WEBTOON", "WEBNOVEL"] as const;
const UPCOMING_SIZE = 12;

const domainLabel = (domain?: string) => DOMAIN_LABEL_MAP[domain ?? ""] ?? domain ?? "";

const SectionHead = ({ id, title, sub, more }: { id: string; title: string; sub?: string; more?: { to: string; label: string } }) => (
  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
    <h2 id={`${id}-title`} className="text-[21px] font-extrabold tracking-[-0.02em] text-ink">
      {title}
    </h2>
    {sub && <span className="text-[13px] text-ink-3">{sub}</span>}
    {more && (
      <Link
        to={more.to}
        className="ml-auto inline-flex items-center gap-[3px] text-sm font-semibold text-ink-2 transition-colors hover:text-accent-ink"
      >
        {more.label}
        <CaretRight size={14} />
      </Link>
    )}
  </div>
);

const SectionError = ({ message, onRetry }: { message: string; onRetry: () => void }) => (
  <div role="alert" className="mt-4 flex items-center gap-2.5 rounded-panel border border-line bg-surface px-4 py-3.5 text-sm text-ink-2">
    <WarningCircle size={18} className="flex-none text-ink-3" />
    <span>{message}</span>
    <button type="button" onClick={onRetry} className="ml-auto font-semibold text-accent-ink hover:underline">
      다시 시도
    </button>
  </div>
);

/** 순위 변동 — 화면엔 ▲3 · ▼1 · – · NEW, 화면 읽기엔 "3계단 상승" */
const ChangeMark = ({ row }: { row: ExternalRanking }) => {
  const change = rankChange(row);
  if (!change) return <span className="w-9 flex-none" aria-hidden="true" />;
  const tone =
    change.kind === "new"
      ? "rounded-full bg-accent-tint px-1.5 py-px text-[10.5px] text-accent-ink"
      : change.kind === "up"
        ? "text-[12px] text-accent-ink"
        : "text-[12px] text-ink-3";
  return (
    <span className="flex w-9 flex-none justify-center">
      <span className={`whitespace-nowrap font-bold tabular-nums ${tone}`} aria-hidden="true">
        {change.text}
      </span>
      <span className="sr-only">{change.label}</span>
    </span>
  );
};

export default function TrendPage() {
  const tracker = useTracker();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const rankings = useAllRankings({ staleTime: 10 * 60 * 1000 });
  const notable = useNotableReleases();
  const featured = useFeaturedToday();
  const upcomingByDomain = useReleasesByDomain("upcoming", UPCOMING_DOMAINS, UPCOMING_SIZE);
  const [expanded, setExpanded] = useState(false);

  // 플랫폼별 연결된 행 — 순위 오름차순
  const byPlatform = useMemo(() => {
    const map = new Map<string, ExternalRanking[]>();
    for (const row of rankings.data ?? []) {
      if (!row.contentId) continue;
      const list = map.get(row.platform) ?? [];
      list.push(row);
      map.set(row.platform, list);
    }
    map.forEach((list) => list.sort((a, b) => a.ranking - b.ranking));
    return map;
  }, [rankings.data]);

  // 분야 칩 — ?hot= 이 우선, 없으면 오늘의 작품 분야, 그것도 없으면 게임
  const rawHot = searchParams.get("hot")?.toLowerCase();
  const featuredDomain = featured.data?.work.domain?.toLowerCase();
  const hotDomain =
    rawHot && HOT_DOMAINS.includes(rawHot)
      ? rawHot
      : featuredDomain && HOT_DOMAINS.includes(featuredDomain)
        ? featuredDomain
        : "game";
  const hotSource = TREND_PLATFORMS.find((p) => p.domain.toLowerCase() === hotDomain)!;
  // 기본 분야를 오늘의 작품에서 정하므로 그게 오기 전엔 목록을 그리지 않는다(칩이 튀지 않게)
  const hotPending = !rawHot && featured.isLoading;
  const hotRows = byPlatform.get(hotSource.platform) ?? [];
  const shownRows = expanded ? hotRows : hotRows.slice(0, HOT_SIZE);

  const selectHot = (domain: string) => {
    if (domain === hotDomain) return;
    setExpanded(false);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set("hot", domain);
        return next;
      },
      { replace: true, preventScrollReset: true },
    );
  };

  // ① 분야별 1위 — 연결된 행 중 가장 높은 순위
  const leads = TREND_PLATFORMS.flatMap((p) => {
    const top = byPlatform.get(p.platform)?.[0];
    return top ? [{ source: p, row: top }] : [];
  });

  // ③ 주목작 — 빈 분야는 칸을 만들지 않는다
  const notableGroups: NotableGroup[] = (notable.data ?? []).filter((g) => g.items.length > 0);

  // ④ 곧 나올 — 지난 날짜 · 빈 분야 제외
  const upcoming = upcomingByDomain
    .map((r) => ({ domain: r.domain, items: r.items.filter((w) => (daysUntil(w.releaseDate) ?? 0) >= 0) }))
    .filter((r) => r.items.length > 0);
  const [upcomingPick, setUpcomingPick] = useState<string | null>(null);
  const upcomingDomain = upcoming.find((r) => r.domain === upcomingPick)?.domain ?? upcoming[0]?.domain;
  const upcomingItems = upcoming.find((r) => r.domain === upcomingDomain)?.items ?? [];
  const upcomingLoading = upcoming.length === 0 && upcomingByDomain.some((r) => r.isLoading);
  const upcomingTitle = upcoming.length === 1 ? `곧 나올 ${domainLabel(upcoming[0].domain)}` : "곧 나올 작품";

  // 해시 섹션 — 데이터가 온 뒤 한 번만 스크롤(늦게 그려지는 위 섹션이 위치를 밀지 않게).
  // 처리한 기록 항목(location.key)을 탭 세션에 남긴다 — 뒤로 가기로 돌아오면 브라우저가 둔 자리를 지킨다.
  // 목표 위의 섹션만 기다린다 — 아래 섹션은 위치를 바꾸지 않는다(실패 · 재시도 중인 아래 섹션이 스크롤을 붙잡지 않게).
  const hash = location.hash.slice(1);
  const hotReady = !rankings.isLoading && !hotPending;
  const ready =
    hash === "hot" ? !rankings.isLoading : hash === "new" ? hotReady : hash === "upcoming" ? hotReady && !notable.isLoading : false;
  useEffect(() => {
    if (!ready || !hash) return;
    const mark = `trend-hash:${location.key}:${hash}`;
    try {
      if (sessionStorage.getItem(mark)) return;
      sessionStorage.setItem(mark, "1");
    } catch {
      // 저장소를 못 쓰면 매번 스크롤한다
    }
    requestAnimationFrame(() => {
      document.getElementById(hash)?.scrollIntoView({ block: "start" });
      // 주소의 해시를 지운다(라우터 상태는 그대로) — 뒤로 가기 때 브라우저가 해시 위치로 다시 끌어가지 않게
      try {
        window.history.replaceState(window.history.state, "", window.location.pathname + window.location.search);
      } catch {
        // 못 지우면 그대로 둔다
      }
    });
  }, [ready, hash, location.key]);

  const trackClick = (surface: string, contentId: number | null | undefined, payload: Record<string, unknown>) => {
    if (contentId) tracker.track("card_clicked", { contentId, surface, payload });
  };

  return (
    <div className="mx-auto max-w-[1280px] px-6 pb-[72px] pt-7">
      <div className="flex items-baseline gap-3">
        <h1 className="text-[26px] font-extrabold tracking-[-0.03em] text-ink">트렌드</h1>
        <span className="text-[13px] text-ink-3">매일 아침 갱신</span>
      </div>

      {/* ① 분야별 1위 */}
      {rankings.isLoading ? (
        <div aria-hidden="true" className="mt-5 flex gap-3 overflow-hidden">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="aspect-[2/3] w-[180px] flex-none animate-pulse rounded-panel bg-line min-[1024px]:w-auto min-[1024px]:flex-1" />
          ))}
        </div>
      ) : (
        leads.length > 0 && (
          <ul aria-label="분야별 1위" className="-mx-6 mt-5 flex snap-x gap-3 overflow-x-auto px-6 pb-1 scrollbar-hide min-[1024px]:mx-0 min-[1024px]:grid min-[1024px]:grid-cols-5 min-[1024px]:overflow-visible min-[1024px]:px-0">
            {leads.map(({ source, row }) => {
              const signal = rankingSignal(row);
              return (
                <li key={source.platform} className="w-[180px] flex-none snap-start min-[1024px]:w-auto">
                  <Link
                    to={`/work/${row.contentId}`}
                    onClick={() => trackClick("trend_lead", row.contentId, { platform: row.platform, ranking: row.ranking })}
                    className="group relative block overflow-hidden rounded-panel border border-line"
                  >
                    <WorkThumb
                      imageUrl={row.thumbnailUrl}
                      portraitUrl={row.portraitImageUrl}
                      domain={source.domain}
                      className="transition-transform duration-300 group-hover:scale-[1.03]"
                    />
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/55 to-transparent px-3 pb-3 pt-14">
                      <span className="text-[12px] font-bold text-white/80">{source.label} 1위</span>
                      <strong className="mt-0.5 line-clamp-2 block text-[15px] font-extrabold leading-snug text-white">{row.title}</strong>
                      {signal && <span className="mt-0.5 block truncate text-[12px] text-white/75">{signal}</span>}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )
      )}

      {/* ② 지금 뜨는 */}
      <section id="hot" aria-labelledby="hot-title" className="mt-12 scroll-mt-20">
        <SectionHead id="hot" title="지금 뜨는 Top 10" sub={`${hotSource.source} · 매일 아침 갱신`} />
        <div className="-mx-6 mt-3.5 flex gap-1.5 overflow-x-auto px-6 scrollbar-hide lg:mx-0 lg:flex-wrap lg:px-0">
          {TREND_PLATFORMS.map((p) => (
            <DomainChip key={p.platform} active={hotDomain === p.domain.toLowerCase()} onClick={() => selectHot(p.domain.toLowerCase())}>
              {p.label}
            </DomainChip>
          ))}
        </div>
        {rankings.isLoading || hotPending ? (
          <div aria-hidden="true" className="mt-4 grid grid-cols-1 gap-2 min-[1024px]:grid-cols-2">
            {Array.from({ length: HOT_SIZE }, (_, i) => (
              <div key={i} className="h-[74px] animate-pulse rounded-panel border border-line bg-surface" />
            ))}
          </div>
        ) : rankings.isError ? (
          <SectionError message="순위를 불러오지 못했어요." onRetry={() => rankings.refetch()} />
        ) : hotRows.length === 0 ? (
          <p className="mt-4 rounded-panel border border-line bg-surface px-4 py-6 text-center text-sm text-ink-3">
            아직 오늘 순위가 없어요. 매일 아침에 갱신돼요.
          </p>
        ) : (
          <>
            <ol id="hot-list" className="mt-4 grid grid-cols-1 gap-2 min-[1024px]:grid-cols-2">
              {shownRows.map((row) => {
                const signal = rankingSignal(row);
                return (
                  <li key={row.id}>
                    <Link
                      to={`/work/${row.contentId}`}
                      onClick={() => trackClick("trend_hot", row.contentId, { platform: row.platform, ranking: row.ranking })}
                      className="group flex items-center gap-2.5 rounded-panel border border-line bg-surface py-2 pl-2 pr-3.5"
                    >
                      <span className={`w-7 flex-none text-center text-[17px] font-extrabold tabular-nums ${row.ranking <= 3 ? "text-accent-ink" : "text-ink-3"}`}>
                        {row.ranking}
                      </span>
                      <ChangeMark row={row} />
                      {/* 게임은 세로 표지가 없으면 가로 그림(460:215) 그대로 — 2:3 틀에 넣으면 너무 작아진다 */}
                      {hotSource.domain === "GAME" && !row.portraitImageUrl ? (
                        <WorkThumb imageUrl={row.thumbnailUrl} domain="GAME" shape="landscape" className="h-[46px] w-auto flex-none rounded-md" />
                      ) : (
                        <WorkThumb
                          imageUrl={row.thumbnailUrl}
                          portraitUrl={row.portraitImageUrl}
                          domain={hotSource.domain}
                          className="w-11 flex-none rounded-md"
                        />
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14.5px] font-bold text-ink transition-colors group-hover:text-accent-ink">{row.title}</span>
                        {signal && <span className="mt-0.5 block truncate text-[12.5px] text-ink-3">{signal}</span>}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ol>
            {hotRows.length > HOT_SIZE && (
              <button
                type="button"
                aria-expanded={expanded}
                aria-controls="hot-list"
                onClick={() => setExpanded((v) => !v)}
                className="mx-auto mt-4 flex items-center gap-1 rounded-full border border-line bg-surface px-4 py-2 text-sm font-semibold text-ink-2 transition-colors hover:text-ink"
              >
                {expanded ? "10위까지만 보기" : `${hotRows[hotRows.length - 1].ranking}위까지 보기`}
                <CaretDown size={14} className={expanded ? "rotate-180" : ""} />
              </button>
            )}
          </>
        )}
      </section>

      {/* ③ 새로 나온 주목작 */}
      <section id="new" aria-labelledby="new-title" className="mt-14 scroll-mt-20">
        <SectionHead id="new" title="새로 나온 주목작" more={{ to: "/trend/new", label: "새로 나온 전체" }} />
        {notable.isLoading ? (
          <div aria-hidden="true" className="mt-4 flex gap-4 overflow-hidden">
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="h-[260px] w-[220px] flex-none animate-pulse rounded-panel bg-line min-[1024px]:flex-1" />
            ))}
          </div>
        ) : notable.isError ? (
          <SectionError message="주목작을 불러오지 못했어요." onRetry={() => notable.refetch()} />
        ) : notableGroups.length === 0 ? (
          <p className="mt-4 rounded-panel border border-line bg-surface px-4 py-6 text-center text-sm text-ink-3">
            최근에 나온 주목작이 아직 없어요.
          </p>
        ) : (
          <div className="-mx-6 mt-4 flex gap-4 overflow-x-auto px-6 pb-1 scrollbar-hide min-[1024px]:mx-0 min-[1024px]:grid min-[1024px]:grid-cols-5 min-[1024px]:overflow-visible min-[1024px]:px-0">
            {notableGroups.map((group) => (
              <div key={group.domain} className="w-[220px] min-w-0 flex-none min-[1024px]:w-auto">
                <h3 className="text-[13px] font-bold text-ink-2">{domainLabel(group.domain)}</h3>
                <ul className="mt-2 grid grid-cols-2 gap-2.5">
                  {group.items.map(({ work, reason }) => (
                    <li key={work.id} className="min-w-0">
                      <NotableCard
                        work={work}
                        reason={notableReasonText(reason)}
                        onClick={() => trackClick("trend_new", work.id, { domain: group.domain, reason: reason.type })}
                      />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ④ 곧 나올 — 데이터가 있는 분야만 */}
      {(upcomingLoading || upcoming.length > 0) && (
        <section id="upcoming" aria-labelledby="upcoming-title" className="mt-14 scroll-mt-20">
          <SectionHead id="upcoming" title={upcomingTitle} />
          {upcoming.length > 1 && (
            <div className="-mx-6 mt-3.5 flex gap-1.5 overflow-x-auto px-6 scrollbar-hide lg:mx-0 lg:px-0">
              {upcoming.map((r) => (
                <DomainChip key={r.domain} active={upcomingDomain === r.domain} onClick={() => setUpcomingPick(r.domain)}>
                  {domainLabel(r.domain)}
                </DomainChip>
              ))}
            </div>
          )}
          {upcomingLoading ? (
            <div aria-hidden="true" className="mt-4 flex gap-3.5 overflow-hidden">
              {Array.from({ length: 6 }, (_, i) => (
                <div key={i} className="aspect-[2/3] w-[150px] flex-none animate-pulse rounded-panel bg-line" />
              ))}
            </div>
          ) : (
            <ul className="-mx-6 mt-4 flex gap-3.5 overflow-x-auto px-6 pb-1.5 scrollbar-hide">
              {upcomingItems.map((work) => (
                <li key={work.id} className="w-[150px] flex-none">
                  <UpcomingPoster work={work} onClick={() => trackClick("trend_upcoming", work.id, { domain: work.domain })} />
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}

const NotableCard = ({ work, reason, onClick }: { work: WorkSummary; reason: string; onClick: () => void }) => {
  const signal = workLiteSignal(work);
  const line = signal.left.map((p) => p.text).join(" · ");
  return (
    <Link to={`/work/${work.id}`} onClick={onClick} className="group block">
      <WorkThumb imageUrl={work.thumbnail} portraitUrl={work.portraitThumbnail} domain={work.domain} className="rounded-panel border border-line" />
      <span className="mt-2 line-clamp-2 block text-[13.5px] font-bold leading-snug text-ink transition-colors group-hover:text-accent-ink">{work.title}</span>
      {line && <span className="mt-0.5 block truncate text-[12px] text-ink-3">{line}</span>}
      {reason && <span className="mt-0.5 block truncate text-[12px] font-semibold text-accent-ink">{reason}</span>}
    </Link>
  );
};

const UpcomingPoster = ({ work, onClick }: { work: WorkSummary; onClick: () => void }) => {
  const dday = dDayOf(work.releaseDate);
  const ymd = parseYmd(work.releaseDate);
  const date = ymd ? (ymd.y === new Date().getFullYear() ? `${ymd.m}월 ${ymd.d}일` : `${ymd.y}년 ${ymd.m}월 ${ymd.d}일`) : "발매일 미정";
  return (
    <Link to={`/work/${work.id}`} onClick={onClick} className="group block">
      <div className="relative">
        <WorkThumb imageUrl={work.thumbnail} portraitUrl={work.portraitThumbnail} domain={work.domain} className="rounded-panel border border-line" />
        <span className="absolute left-2 top-2 rounded-md bg-black/75 px-1.5 py-0.5 text-[11.5px] font-bold tabular-nums text-white">{dday.label}</span>
      </div>
      <span className="mt-2 line-clamp-2 block text-[13.5px] font-bold leading-snug text-ink transition-colors group-hover:text-accent-ink">{work.title}</span>
      <span className="mt-0.5 block truncate text-[12px] text-ink-3">
        {domainLabel(work.domain)} · {date}
      </span>
    </Link>
  );
};

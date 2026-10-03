import { Fragment, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, BookmarkSimple, WarningCircle } from "@phosphor-icons/react";
import {
  DOMAIN_LABEL_MAP,
  featuredFactsLine,
  featuredReasonParts,
  heroTitle,
  releaseSubline,
} from "@aod/shared/constants";
import { useBookmarkStatus, useToggleBookmark } from "@aod/shared/hooks";
import type { FeaturedWork, WorkSummary } from "@aod/shared/types";
import { useAuth } from "../../contexts/AuthContext";
import { useTracker } from "../../tracking/trackerContext";
import ConfirmDialog from "../ui/ConfirmDialog";

/**
 * 홈 맨 위 "오늘의 작품" — 시네마틱 배너 (설계 docs/superpowers/specs/2026-10-03-home-featured-hero-design.md).
 *
 * 넓은 배경 + 로고/제목 + 고른 근거(굵게) · 정보(흐리게) + **리뷰 한 줄**(없으면 줄거리 2줄) + 버튼.
 * - 배너 전체가 상세 링크(겹친 투명 링크) — 버튼 · 리뷰 원문 링크만 위에 따로 둔다(링크 안에 링크를 넣지 않는다).
 * - 대체: 배경 없음 → 세로 표지 · 포스터를 흐려 깐다 / 로고 없음 → 글자 제목 / 오늘의 작품 없음 → 최신 출시작.
 * - 히어로 그림은 LCP — lazy 를 쓰지 않고 우선순위를 높인다.
 * - 리뷰 원문 링크는 추적하지 않는다(outbound_clicked 는 "볼 수 있는 곳" 주 지표).
 */

const HOME_HERO_SURFACE = "home_hero";
/** React 18 은 fetchPriority 를 모른다 — 소문자 속성으로 그대로 넘긴다 */
const HIGH_PRIORITY = { fetchpriority: "high" } as Record<string, string>;

const BANNER =
  "group relative isolate flex overflow-hidden rounded-panel bg-ink text-surface shadow-card " +
  "max-[767px]:flex-col min-[768px]:min-h-[clamp(360px,46vh,420px)]";

export interface FeaturedHeroProps {
  /** 오늘의 작품 — 없으면(204 · 오류) fallback 을 같은 모양으로 */
  featured: FeaturedWork | null;
  fallback?: WorkSummary;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
}

export default function FeaturedHero({ featured, fallback, loading, error, onRetry }: FeaturedHeroProps) {
  const work = featured?.work ?? fallback;
  const tracker = useTracker();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [loginOpen, setLoginOpen] = useState(false);
  const workId = work?.id ?? 0;
  const { data: bookmarkStatus } = useBookmarkStatus(workId, isAuthenticated && workId > 0);
  const toggleBookmark = useToggleBookmark(workId, { source: HOME_HERO_SURFACE });

  if (loading) {
    return (
      <div aria-hidden="true" className={`${BANNER} animate-pulse max-[767px]:min-h-[420px]`}>
        <div className="mt-auto flex w-full max-w-[560px] flex-col gap-3 p-11 max-[767px]:p-5">
          <div className="h-3 w-40 rounded-input bg-surface/15" />
          <div className="h-10 w-3/4 rounded-input bg-surface/20" />
          <div className="h-4 w-1/2 rounded-input bg-surface/15" />
          <div className="h-16 w-full rounded-input bg-surface/10" />
        </div>
      </div>
    );
  }
  if (!work) {
    return error ? (
      <div role="status" className="flex items-center gap-2.5 rounded-panel border border-line bg-surface px-4 py-3.5 text-sm text-ink-2">
        <WarningCircle size={18} className="flex-none text-ink-3" />
        <span className="min-w-0">작품을 불러오지 못했어요.</span>
        <button
          type="button"
          onClick={onRetry}
          className="ml-auto flex-none rounded-full border border-line bg-canvas px-3.5 py-1.5 text-[13px] font-semibold text-ink transition-colors hover:border-line-strong"
        >
          다시 시도
        </button>
      </div>
    ) : null;
  }

  const title = heroTitle(work.title);
  const domain = DOMAIN_LABEL_MAP[work.domain] ?? work.domain;
  const media = featured?.media ?? null;
  const backdrop = media?.backdropUrl || null;
  const art = work.portraitThumbnail || work.thumbnail;
  const logo = media?.logoUrl || null;
  const showKoTitle = !!logo && media?.logoLang !== "ko";
  const quote = featured?.quote ?? null;
  const reason = featured ? featuredReasonParts(featured.reason) : [];
  const facts = featured ? featuredFactsLine(work, featured.reason, featured.facts) : releaseSubline(work) ?? "";
  const bookmarked = bookmarkStatus?.bookmarked === true;
  const kicker = featured ? `오늘의 작품 · ${domain} · ${dateKo(featured.date)}` : `새로 나온 ${domain}`;

  const trackOpen = () =>
    tracker.track("card_clicked", {
      contentId: work.id,
      surface: HOME_HERO_SURFACE,
      payload: featured
        ? {
            source: "featured",
            date: featured.date,
            platform: featured.reason.platform,
            ranking: featured.reason.ranking,
            quote_source: quote?.source ?? null,
          }
        : { source: "latest_release" },
    });

  const onBookmark = () => {
    if (!isAuthenticated) {
      setLoginOpen(true);
      return;
    }
    toggleBookmark.mutate();
  };

  return (
    <>
      <section className={BANNER} aria-label="오늘의 작품">
        {/* 배경 — 없으면 세로 표지 · 포스터를 크게 흐려 깐다 */}
        {backdrop ? (
          <img
            src={backdrop}
            alt=""
            {...HIGH_PRIORITY}
            className="relative -z-20 h-full w-full object-cover object-[center_25%] transition-transform duration-500 group-hover:scale-[1.025] motion-reduce:transition-none motion-reduce:group-hover:scale-100 min-[768px]:absolute min-[768px]:inset-0 max-[767px]:aspect-video"
          />
        ) : art ? (
          <img
            src={art}
            alt=""
            {...HIGH_PRIORITY}
            className="relative -z-20 h-full w-full scale-125 object-cover opacity-70 blur-2xl min-[768px]:absolute min-[768px]:inset-0 max-[767px]:aspect-video"
          />
        ) : (
          <div aria-hidden="true" className="relative -z-20 aspect-video w-full min-[768px]:hidden" />
        )}
        {/* 글자 대비 — 어떤 그림이어도 읽히게 왼쪽 · 아래를 어둡게 */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgb(28_27_25/0.95)_0%,rgb(28_27_25/0.8)_36%,rgb(28_27_25/0.12)_72%),linear-gradient(0deg,rgb(28_27_25/0.55),transparent_45%)] max-[767px]:hidden"
        />
        {/* 모바일: 그림(16:9) 아래쪽에 머리말 · 제목이 겹치므로 그 자리를 어둡게 */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 aspect-video bg-[linear-gradient(0deg,rgb(28_27_25)_0%,rgb(28_27_25/0.82)_30%,rgb(28_27_25/0.25)_62%,transparent_100%)] min-[768px]:hidden"
        />
        {/* 배너 전체 → 상세 */}
        <Link
          to={`/work/${work.id}`}
          onClick={trackOpen}
          aria-label={`${title} 자세히 보기`}
          className="absolute inset-0 z-[1] rounded-[inherit] focus-visible:outline-[3px]! focus-visible:-outline-offset-[3px]! focus-visible:outline-accent!"
        />

        <div className="pointer-events-none relative z-[2] mt-auto flex w-full max-w-[580px] flex-col gap-3 px-11 py-9 max-[767px]:-mt-[92px] max-[767px]:max-w-none max-[767px]:gap-2.5 max-[767px]:px-[18px] max-[767px]:pb-5 max-[767px]:pt-0">
          <div className="text-[12.5px] font-bold tracking-[0.02em] text-accent-tint">{kicker}</div>

          {logo ? (
            <>
              <img
                src={logo}
                alt={showKoTitle ? "" : title}
                className="max-h-[104px] max-w-[320px] object-contain object-left-bottom drop-shadow-[0_4px_18px_rgb(0_0_0/0.5)] max-[767px]:max-h-[72px] max-[767px]:max-w-[200px]"
              />
              {showKoTitle && <strong className="-mt-1 block text-[15px] font-bold text-surface/90">{title}</strong>}
            </>
          ) : (
            <strong
              className={`line-clamp-2 block font-extrabold leading-[1.08] tracking-[-0.035em] [text-wrap:balance] ${
                title.length > 16 ? "text-[32px] max-[767px]:text-[23px]" : "text-[42px] max-[767px]:text-[28px]"
              }`}
            >
              {title}
            </strong>
          )}

          {(reason.length > 0 || facts) && (
            <div className="grid gap-1">
              {reason.length > 0 && (
                <div className="text-[15.5px] font-extrabold">
                  {reason.map((part, i) => (
                    <Fragment key={part}>
                      {i > 0 && <span className="mx-1.5 font-normal opacity-50">·</span>}
                      {part.startsWith("★") ? (
                        <>
                          <span className="text-star">★</span>
                          {part.slice(1)}
                        </>
                      ) : (
                        part
                      )}
                    </Fragment>
                  ))}
                </div>
              )}
              {facts && <div className="text-[13.5px] text-surface/60">{facts}</div>}
            </div>
          )}

          {quote ? (
            <figure className="m-0 mt-1 grid gap-[7px] border-l-[3px] border-accent pl-3.5">
              <blockquote className="m-0 line-clamp-3 text-[18px] font-semibold leading-[1.55] tracking-[-0.01em] max-[767px]:line-clamp-4 max-[767px]:text-[15.5px]">
                “{quote.text}”
              </blockquote>
              <figcaption className="flex flex-wrap gap-x-2.5 gap-y-1 text-[12.5px] text-surface/60">
                {quote.source === "STEAM" ? (
                  <>
                    <span className="font-semibold text-surface/85">{quote.author || "Steam 사용자"}</span>
                    <span>Steam 한국어 리뷰</span>
                    {typeof quote.hours === "number" && <span>{quote.hours.toLocaleString("ko-KR")}시간 플레이</span>}
                    {typeof quote.votes === "number" && <span>👍 {quote.votes.toLocaleString("ko-KR")}명에게 도움이 됨</span>}
                    {quote.url && (
                      <a
                        href={quote.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="pointer-events-auto font-semibold text-surface/85 underline-offset-2 hover:underline"
                      >
                        원문 ↗<span className="sr-only"> (새 창)</span>
                      </a>
                    )}
                  </>
                ) : (
                  <>
                    <span>AOD 사용자 리뷰</span>
                    {typeof quote.rating === "number" && <span>★ {quote.rating.toFixed(1)}</span>}
                  </>
                )}
              </figcaption>
            </figure>
          ) : featured?.synopsis ? (
            <p className="m-0 mt-0.5 line-clamp-2 text-[14.5px] leading-[1.6] text-surface/80">{featured.synopsis}</p>
          ) : null}

          <div className="mt-1.5 flex gap-2.5 max-[767px]:grid max-[767px]:grid-cols-2">
            <Link
              to={`/work/${work.id}`}
              onClick={trackOpen}
              className="pointer-events-auto inline-flex items-center justify-center gap-1.5 rounded-full bg-surface px-[18px] py-2.5 text-sm font-bold text-ink transition-opacity hover:opacity-90"
            >
              자세히 보기
              <ArrowRight size={15} aria-hidden="true" />
            </Link>
            <button
              type="button"
              onClick={onBookmark}
              aria-pressed={bookmarked}
              disabled={toggleBookmark.isPending}
              className="pointer-events-auto inline-flex items-center justify-center gap-1.5 rounded-full border border-surface/40 bg-ink/20 px-[18px] py-2.5 text-sm font-bold text-surface transition-colors hover:border-surface/70"
            >
              <BookmarkSimple size={16} weight={bookmarked ? "fill" : "regular"} aria-hidden="true" />
              {bookmarked ? "관심 작품" : "관심 등록"}
            </button>
          </div>
        </div>
      </section>

      {loginOpen && (
        <ConfirmDialog
          title="로그인이 필요한 기능이에요"
          description="로그인 후 이용해 주세요."
          confirmLabel="로그인"
          onCancel={() => setLoginOpen(false)}
          onConfirm={() => navigate("/login")}
        />
      )}
    </>
  );
}

const DAYS = ["일", "월", "화", "수", "목", "금", "토"];

/** "2026-10-03" → "10월 3일 (토)" */
function dateKo(date: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!m) return date;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return `${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일 (${DAYS[d.getUTCDay()]})`;
}

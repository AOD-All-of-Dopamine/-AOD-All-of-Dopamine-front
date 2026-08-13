import { ReactNode, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { keepPreviousData } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowSquareOut,
  BookmarkSimple,
  ChatCircleText,
  CircleNotch,
  PencilSimple,
  Star,
  ThumbsUp,
  WarningCircle,
} from "@phosphor-icons/react";
import { useAuth } from "../contexts/AuthContext";
import { useWorkDetail } from "../hooks/useWorks";
import {
  useBookmarkStatus,
  useLikeStats,
  useReviews,
  useToggleBookmark,
  useToggleLike,
} from "../hooks/useInteractions";
import { DOMAIN_LABEL_MAP } from "../constants/domain";
import { PLATFORM_META } from "../constants/platforms";
import { thumbnailFallbackMap, type Category } from "../constants/thumbnail";
import {
  formatFieldValue,
  getFieldLabel,
  getPlatformLabel,
} from "../utils/field-labels";
import Tag from "../components/ui/Tag";
import StatPill from "../components/ui/StatPill";
import ReviewCard from "../components/ui/ReviewCard";
import EmptyState from "../components/ui/EmptyState";
import ConfirmDialog from "../components/ui/ConfirmDialog";

/**
 * /work/:id - mockups/work-detail-mockup.html 이식.
 * 레이아웃: 뒤로가기 / 헤더(포스터 + 도메인 칩 + 제목 + 부제 + 장르 태그 +
 * 통계 필 + 액션 3버튼 + 볼 수 있는 곳) / 본문 2단(1fr+320px: 시놉시스, 리뷰 /
 * 작품 정보 dl 패널). 포스터는 게임=가로(460/215), 그 외=세로(2/3).
 *
 * 목업 대비 편차 (실데이터, API 기준):
 * - "비슷한 작품" 섹션 생략 - 추천/유사 작품 API와 훅이 없다 (추가 후 이식).
 * - "볼 수 있는 곳"은 platformInfo에서 url을 가진 플랫폼만 링크 버튼으로 노출.
 *   TMDB watch_providers(넷플릭스 등)는 URL이 없어 링크 대상에서 제외되고,
 *   OTT 목록은 정보 패널의 "지원 플랫폼" 행으로 표기된다. url이 하나도 없으면
 *   섹션 자체를 숨긴다.
 * - 통계 필은 실데이터가 있는 것만 렌더: AOD 평점(score>0), 게임의 Steam 리뷰
 *   집계(attr.review_summary). TMDB 평점 등 미수집 값은 만들지 않는다.
 * - "리뷰 더 보기"는 useReviews(page=0, size 증가) 방식. 트레이드오프: 매 클릭마다
 *   0페이지부터 누적 재전송된다 - 기존 훅 시그니처(페이지 단위 조회) 유지의 대가.
 *   keepPreviousData로 재조회 중 목록 깜빡임을 막는다.
 * - 구 페이지의 싫어요, 공유, 리뷰 삭제 UI는 목업에 없어 미이식
 *   (리뷰 삭제는 프로필 > 내 리뷰에서 가능).
 * - 비로그인 상호작용은 구 페이지의 로그인 유도 모달 방식을 따르되 토큰 스타일의
 *   ConfirmDialog(ui 신규)로 대체.
 */

const REVIEW_PAGE_SIZE = 20;

/** Steam review_score_desc 한글화 (스팀 상점 공식 표기 기준) */
const STEAM_REVIEW_DESC_KO: Record<string, string> = {
  "Overwhelmingly Positive": "압도적으로 긍정적",
  "Very Positive": "매우 긍정적",
  Positive: "긍정적",
  "Mostly Positive": "대체로 긍정적",
  Mixed: "복합적",
  "Mostly Negative": "대체로 부정적",
  Negative: "부정적",
  "Very Negative": "매우 부정적",
  "Overwhelmingly Negative": "압도적으로 부정적",
};

/** 정보 패널 행 순서 - domainInfo가 서버에서 HashMap이라 순서 고정이 필요 */
const INFO_KEY_ORDER = [
  "directors",
  "cast",
  "runtime",
  "seasonCount",
  "episodeRuntime",
  "developer",
  "publisher",
  "author",
  "status",
  "weekday",
  "ageRating",
  "releaseDate",
  "firstAirDate",
  "startedAt",
  "platforms",
];

const orderIndex = (key: string) => {
  const i = INFO_KEY_ORDER.indexOf(key);
  return i === -1 ? INFO_KEY_ORDER.length : i;
};

const categoryOf = (domain?: string): Category => {
  const key = domain?.toLowerCase() as Category;
  return key in thumbnailFallbackMap ? key : "movie";
};

/** 정보 패널에서 빈 값(null, 빈 문자열, 빈 배열, 빈 객체) 행 제거 */
const hasInfoValue = (value: unknown): boolean => {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim() !== "";
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") return Object.keys(value).length > 0;
  return true;
};

const backLinkClass =
  "-ml-2.5 inline-flex items-center gap-1.5 rounded-input px-2.5 py-1.5 text-sm font-medium text-ink-2 transition-colors hover:bg-ink/5 hover:text-ink";

const primaryBtnClass =
  "rounded-full bg-ink px-[22px] py-2.5 text-sm font-semibold text-surface transition-opacity hover:opacity-85 active:scale-[0.98]";

/** 목업 .btn 공통 */
const actionBtnClass =
  "inline-flex items-center gap-[7px] rounded-full px-5 py-[11px] text-[14.5px] font-semibold transition-colors active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60";

function Shell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  return (
    <div className="mx-auto max-w-[1200px] px-6 pb-20 pt-6">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className={backLinkClass}
      >
        <ArrowLeft size={16} />
        뒤로 가기
      </button>
      {children}
    </div>
  );
}

/** 리뷰 카드(ReviewCard) 최종 모양의 로딩 자리 표시 */
function ReviewSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="animate-pulse rounded-panel border border-line bg-surface px-5 py-[18px]"
    >
      <div className="flex items-center gap-2.5">
        <div className="h-[34px] w-[34px] flex-none rounded-full bg-canvas" />
        <div className="h-4 w-24 rounded-input bg-line" />
        <div className="ml-auto h-4 w-10 rounded-input bg-line" />
      </div>
      <div className="mt-3 h-4 w-4/5 rounded-input bg-canvas" />
    </div>
  );
}

/** 헤더+본문 최종 레이아웃 모양의 페이지 스켈레톤 (도메인 미확정이라 세로 포스터 기준) */
function DetailSkeleton() {
  return (
    <div aria-hidden="true" className="animate-pulse">
      <div className="mt-4 grid items-start gap-5 md:grid-cols-[auto_1fr] md:gap-9">
        <div className="aspect-[2/3] w-[180px] rounded-panel bg-line md:w-[232px]" />
        <div>
          <div className="h-[22px] w-14 rounded-full bg-line" />
          <div className="mt-3 h-9 w-3/5 max-w-[420px] rounded-input bg-line" />
          <div className="mt-2.5 h-4 w-40 rounded-input bg-line" />
          <div className="mt-4 flex gap-1.5">
            <div className="h-6 w-14 rounded-full bg-line" />
            <div className="h-6 w-16 rounded-full bg-line" />
          </div>
          <div className="mt-[18px] flex gap-2.5">
            <div className="h-10 w-36 rounded-input bg-line" />
            <div className="h-10 w-32 rounded-input bg-line" />
          </div>
          <div className="mt-[22px] flex flex-wrap gap-2.5">
            <div className="h-11 w-32 rounded-full bg-line" />
            <div className="h-11 w-28 rounded-full bg-line" />
            <div className="h-11 w-28 rounded-full bg-line" />
          </div>
        </div>
      </div>
      <div className="mt-11 grid items-start gap-10 lg:grid-cols-[1fr_320px]">
        <div>
          <div className="h-6 w-24 rounded-input bg-line" />
          <div className="mt-3.5 flex max-w-[560px] flex-col gap-2">
            <div className="h-4 w-full rounded-input bg-line" />
            <div className="h-4 w-4/5 rounded-input bg-line" />
            <div className="h-4 w-3/5 rounded-input bg-line" />
          </div>
          <div className="mt-10 h-6 w-16 rounded-input bg-line" />
          <div className="mt-3.5 flex flex-col gap-3.5">
            <ReviewSkeleton />
            <ReviewSkeleton />
          </div>
        </div>
        <div className="rounded-panel border border-line bg-surface px-[22px] py-5">
          <div className="h-4 w-16 rounded-input bg-line" />
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="flex gap-3.5 py-3">
              <div className="h-3.5 w-[84px] flex-none rounded-input bg-canvas" />
              <div className="h-3.5 flex-1 rounded-input bg-line" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function WorkDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const contentId = id ? Number(id) : 0;
  const { isAuthenticated } = useAuth();

  const [reviewSize, setReviewSize] = useState(REVIEW_PAGE_SIZE);
  const [isLoginOpen, setIsLoginOpen] = useState(false);

  const {
    data: work,
    isLoading,
    isError,
    error,
    refetch,
  } = useWorkDetail(contentId);
  // 더 보기 = size 증가 재조회 (누적 재전송 트레이드오프는 파일 상단 주석 참고)
  const { data: reviewsData, isFetching: reviewsFetching } = useReviews(
    contentId,
    0,
    reviewSize,
    { placeholderData: keepPreviousData },
  );
  const { data: likeStats } = useLikeStats(contentId);
  // privateApi 조회라 비로그인에서는 발사하지 않는다 (401 방지)
  const { data: bookmarkStatus } = useBookmarkStatus(
    contentId,
    isAuthenticated,
  );

  const toggleLikeMutation = useToggleLike(contentId);
  const toggleBookmarkMutation = useToggleBookmark(contentId);

  useEffect(() => {
    window.scrollTo(0, 0);
    setReviewSize(REVIEW_PAGE_SIZE);
  }, [contentId]);

  const handleBookmark = () => {
    if (!isAuthenticated) {
      setIsLoginOpen(true);
      return;
    }
    toggleBookmarkMutation.mutate();
  };

  const handleLike = () => {
    if (!isAuthenticated) {
      setIsLoginOpen(true);
      return;
    }
    // 단일 POST로 충분 - 서버 LikeService.toggleLikeType이 DISLIKE->LIKE 전환을
    // 원자 처리한다 (이중 발사는 순서 경합 시 최종 DISLIKE로 뒤집힐 수 있음)
    toggleLikeMutation.mutate();
  };

  const handleWriteReview = () => {
    if (!isAuthenticated) {
      setIsLoginOpen(true);
      return;
    }
    navigate(`/review/${contentId}`);
  };

  const notFound =
    !contentId ||
    Number.isNaN(contentId) ||
    (axios.isAxiosError(error) && error.response?.status === 404);

  if (isLoading) {
    return (
      <Shell>
        <DetailSkeleton />
      </Shell>
    );
  }

  if (isError && !notFound) {
    return (
      <Shell>
        <div className="mt-4">
          <EmptyState
            icon={<WarningCircle size={44} />}
            title="작품 정보를 불러오지 못했어요"
            description="네트워크 상태를 확인한 뒤 다시 시도해 주세요."
            action={
              <button
                type="button"
                onClick={() => refetch()}
                className={primaryBtnClass}
              >
                다시 시도
              </button>
            }
          />
        </div>
      </Shell>
    );
  }

  if (!work || notFound) {
    return (
      <Shell>
        <div className="mt-4">
          <EmptyState
            title="작품을 찾을 수 없어요"
            description="주소가 잘못되었거나 삭제된 작품일 수 있어요."
            action={
              <Link to="/explore" className={`inline-block ${primaryBtnClass}`}>
                탐색으로 가기
              </Link>
            }
          />
        </div>
      </Shell>
    );
  }

  const category = categoryOf(work.domain);
  const isLandscape = category === "game";
  const domainLabel = DOMAIN_LABEL_MAP[work.domain] ?? work.domain;
  const year = work.releaseDate?.slice(0, 4);
  const subtitle = [work.originalTitle, year].filter(Boolean).join(" · ");
  const score = work.score ?? 0;

  const genres = Array.isArray(work.domainInfo?.genres)
    ? (work.domainInfo.genres as unknown[]).filter(
        (g): g is string => typeof g === "string",
      )
    : [];

  const reviews = reviewsData?.content ?? [];
  const reviewCount = reviewsData?.totalElements ?? 0;

  // 게임 통계 필: Steam 리뷰 집계(attr.review_summary)가 있을 때만
  const steamSummary = (() => {
    if (category !== "game") return null;
    const entry = Object.entries(work.platformInfo ?? {}).find(
      ([key]) => key.toLowerCase() === "steam",
    );
    const raw = entry?.[1]?.review_summary;
    if (!raw || typeof raw !== "object") return null;
    const total = Number(raw.total_reviews);
    const positive = Number(raw.total_positive);
    if (!Number.isFinite(total) || total <= 0 || !Number.isFinite(positive)) {
      return null;
    }
    const desc = raw.review_score_desc;
    const label =
      typeof desc === "string"
        ? (STEAM_REVIEW_DESC_KO[desc] ?? desc)
        : "긍정적";
    return { label, percent: Math.round((positive / total) * 100) };
  })();

  // 볼 수 있는 곳: url을 가진 플랫폼만 외부 링크 버튼으로
  const watchLinks = Object.entries(work.platformInfo ?? {}).flatMap(
    ([key, info]) => {
      const url = info?.url;
      return typeof url === "string" && url.startsWith("http")
        ? [{ key, url, label: PLATFORM_META[key]?.label ?? getPlatformLabel(key) }]
        : [];
    },
  );

  const infoRows = Object.entries(work.domainInfo ?? {})
    .filter(([key, value]) => key !== "genres" && hasInfoValue(value))
    .sort(([a], [b]) => orderIndex(a) - orderIndex(b))
    .map(([key, value]) => ({
      key,
      label: getFieldLabel(key, "domain"),
      value:
        key === "platforms" && Array.isArray(value)
          ? value
              .map(
                (p) =>
                  PLATFORM_META[String(p)]?.label ?? getPlatformLabel(String(p)),
              )
              .join(", ")
          : formatFieldValue(key, value),
    }));

  const bookmarked = bookmarkStatus?.bookmarked === true;
  // 옵티미스틱 업데이트도 userLikeType을 직접 전이시키므로 단일 판정으로 충분
  const liked = likeStats?.userLikeType === "LIKE";

  return (
    <>
      <Shell>
        {/* 헤더: 포스터 + 작품 요약 */}
        <div className="mt-4 grid items-start gap-5 md:grid-cols-[auto_1fr] md:gap-9">
          <div
            className={`overflow-hidden rounded-panel border border-line bg-canvas shadow-card ${
              isLandscape
                ? "aspect-[460/215] w-full md:w-[360px]"
                : "aspect-[2/3] w-[180px] md:w-[232px]"
            }`}
          >
            {work.thumbnail ? (
              <img
                src={work.thumbnail}
                alt={`${work.title} 대표 이미지`}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="grid h-full w-full place-items-center">
                <img
                  src={thumbnailFallbackMap[category]}
                  alt=""
                  className="w-[clamp(32px,30%,64px)] opacity-80"
                />
              </div>
            )}
          </div>

          <div>
            <Tag variant="accent">{domainLabel}</Tag>
            <h1 className="mt-2.5 text-[27px] font-extrabold leading-[1.2] tracking-[-0.03em] text-ink md:text-[34px]">
              {work.title}
            </h1>
            {subtitle && (
              <p className="mt-1.5 text-[15px] text-ink-2">{subtitle}</p>
            )}

            {genres.length > 0 && (
              <div className="mt-3.5 flex flex-wrap gap-1.5">
                {genres.map((g) => (
                  <Tag key={g} variant="surface">
                    {g}
                  </Tag>
                ))}
              </div>
            )}

            {(score > 0 || steamSummary) && (
              <div className="mt-[18px] flex flex-wrap gap-2.5">
                {steamSummary && (
                  <StatPill icon={<ThumbsUp size={14} className="text-star" />}>
                    {steamSummary.label} {steamSummary.percent}%
                    <small className="font-medium text-ink-2">Steam</small>
                  </StatPill>
                )}
                {score > 0 && (
                  <StatPill
                    icon={<Star weight="fill" size={14} className="text-star" />}
                  >
                    {score.toFixed(1)}
                    <small className="font-medium text-ink-2">
                      {reviewCount > 0 ? `AOD 리뷰 ${reviewCount}` : "AOD"}
                    </small>
                  </StatPill>
                )}
              </div>
            )}

            <div className="mt-[22px] flex flex-wrap gap-2.5">
              {/* 활성 상태는 라벨 변경("관심 등록"/"관심 작품")으로 전달 -
                  라벨이 바뀌는 버튼에 aria-pressed를 겹치면 중복 신호라 뺀다 */}
              <button
                type="button"
                onClick={handleBookmark}
                disabled={toggleBookmarkMutation.isPending}
                className={`${actionBtnClass} bg-accent text-surface hover:bg-accent-ink`}
              >
                <BookmarkSimple
                  size={17}
                  weight={bookmarked ? "fill" : "regular"}
                />
                {bookmarked ? "관심 작품" : "관심 등록"}
              </button>
              <button
                type="button"
                onClick={handleLike}
                aria-pressed={liked}
                disabled={toggleLikeMutation.isPending}
                className={`${actionBtnClass} border ${
                  liked
                    ? "border-transparent bg-accent-tint text-accent-ink"
                    : "border-line bg-surface text-ink hover:border-line-strong"
                }`}
              >
                <ThumbsUp size={17} weight={liked ? "fill" : "regular"} />
                좋아요
              </button>
              <button
                type="button"
                onClick={handleWriteReview}
                className={`${actionBtnClass} border border-line bg-surface text-ink hover:border-line-strong`}
              >
                <PencilSimple size={17} />
                리뷰 쓰기
              </button>
            </div>

            {watchLinks.length > 0 && (
              <div className="mt-[22px]">
                <h3 className="text-[13.5px] font-bold text-ink-2">
                  볼 수 있는 곳
                </h3>
                <div className="mt-[9px] flex flex-wrap gap-2">
                  {watchLinks.map(({ key, url, label }) => (
                    <a
                      key={key}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-[7px] rounded-input border border-line bg-surface px-4 py-[9px] text-sm font-semibold text-ink transition-colors hover:border-line-strong"
                    >
                      {label}
                      <ArrowSquareOut size={15} className="text-ink-3" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 본문 2단: 시놉시스, 리뷰 / 작품 정보 패널 */}
        <div
          className={`mt-11 grid items-start gap-10 ${
            infoRows.length > 0 ? "lg:grid-cols-[1fr_320px]" : ""
          }`}
        >
          <div>
            <section>
              <h2 className="text-[19px] font-extrabold tracking-[-0.02em] text-ink">
                시놉시스
              </h2>
              {work.synopsis ? (
                <p className="mt-3 max-w-[65ch] whitespace-pre-line text-ink-2">
                  {work.synopsis}
                </p>
              ) : (
                <p className="mt-3 text-ink-3">
                  시놉시스가 아직 준비되지 않았어요.
                </p>
              )}
            </section>

            <section className="mt-10">
              <div className="flex items-center gap-2.5">
                <h2 className="text-[19px] font-extrabold tracking-[-0.02em] text-ink">
                  리뷰
                </h2>
                <span className="font-bold tabular-nums text-accent-ink">
                  {reviewCount}
                </span>
              </div>

              {reviewsData === undefined ? (
                <div className="mt-3.5 flex flex-col gap-3.5" aria-hidden="true">
                  <ReviewSkeleton />
                  <ReviewSkeleton />
                </div>
              ) : reviews.length > 0 ? (
                <>
                  <div className="mt-3.5 flex flex-col gap-3.5">
                    {reviews.map((review) => (
                      <ReviewCard
                        key={review.reviewId}
                        name={review.username}
                        date={review.createdAt?.slice(0, 10) ?? ""}
                        score={review.rating}
                      >
                        {review.content}
                      </ReviewCard>
                    ))}
                  </div>
                  {!reviewsData.last && (
                    <button
                      type="button"
                      onClick={() => setReviewSize((s) => s + REVIEW_PAGE_SIZE)}
                      disabled={reviewsFetching}
                      className="mt-4 w-full rounded-input border border-line bg-surface py-3 text-sm font-semibold text-ink-2 transition-colors hover:border-line-strong hover:text-ink disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {reviewsFetching ? (
                        <span className="inline-flex items-center gap-1.5">
                          <CircleNotch size={15} className="animate-spin" />
                          불러오는 중
                        </span>
                      ) : (
                        "리뷰 더 보기"
                      )}
                    </button>
                  )}
                </>
              ) : (
                <div className="mt-3.5">
                  <EmptyState
                    icon={<ChatCircleText size={44} />}
                    title="아직 리뷰가 없어요"
                    description="이 작품의 첫 번째 리뷰를 남겨보세요."
                    action={
                      <button
                        type="button"
                        onClick={handleWriteReview}
                        className={primaryBtnClass}
                      >
                        리뷰 쓰기
                      </button>
                    }
                  />
                </div>
              )}
            </section>
          </div>

          {infoRows.length > 0 && (
            <aside className="rounded-panel border border-line bg-surface px-[22px] py-5">
              <h2 className="text-[15px] font-bold tracking-[-0.02em] text-ink">
                작품 정보
              </h2>
              <dl className="mt-1.5">
                {infoRows.map(({ key, label, value }) => (
                  <div
                    key={key}
                    className="flex gap-3.5 border-b border-line py-2.5 last:border-b-0"
                  >
                    <dt className="w-[84px] flex-none text-[13.5px] text-ink-3">
                      {label}
                    </dt>
                    <dd className="min-w-0 break-words text-sm font-medium text-ink">
                      {value}
                    </dd>
                  </div>
                ))}
              </dl>
            </aside>
          )}
        </div>
      </Shell>

      {isLoginOpen && (
        <ConfirmDialog
          title="로그인이 필요한 기능이에요"
          description="로그인 후 이용해 주세요."
          confirmLabel="로그인"
          onCancel={() => setIsLoginOpen(false)}
          onConfirm={() => navigate("/login")}
        />
      )}
    </>
  );
}

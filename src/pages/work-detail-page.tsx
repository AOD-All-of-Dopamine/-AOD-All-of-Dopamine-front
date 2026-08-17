import { ReactNode, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { keepPreviousData } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowSquareOut,
  BookmarkSimple,
  CalendarCheck,
  CaretDown,
  CaretUp,
  ChatCircleText,
  CircleNotch,
  PencilSimple,
  StackPlus,
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
import { STEAM_REVIEW_DESC_KO } from "../constants/steam";
import { thumbnailFallbackMap, type Category } from "../constants/thumbnail";
import {
  formatFieldValue,
  getFieldLabel,
  getPlatformLabel,
} from "../utils/field-labels";
import Tag from "../components/ui/Tag";
import StatPill from "../components/ui/StatPill";
import { WEEKDAY_KO } from "../components/ui/workCardInfo";
import ReviewCard from "../components/ui/ReviewCard";
import EmptyState from "../components/ui/EmptyState";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import {
  AddToCollectionPopover,
  AddToCollectionSheet,
} from "../components/ui/AddToCollectionMenu";

/**
 * /work/:id - mockups/work-detail-mockup.html 이식.
 * 레이아웃(lg+): 뒤로가기 / 헤더(포스터 + 도메인 칩 + 제목 + 부제 + 장르 태그 +
 * 통계 필 + 액션 3버튼 + 볼 수 있는 곳) / 본문 2단(1fr+320px: 시놉시스, 리뷰 /
 * 작품 정보 dl 패널). 포스터는 게임=가로(460/215), 그 외=세로(2/3).
 *
 * <lg 모바일 적응 - mockups/mobile-light-mockup.html 프레임 6·7·8:
 * - 상단 56px 뒤로가기+작품명 바(Shell), SiteHeader는 public-layout에서 lg+ 전용
 * - 헤더: 게임=16:9 풀블리드 히어로, 그 외=포스터(108px, 3:4)+정보 블록.
 *   부제는 도메인별(게임=연도·개발사, 웹툰/웹소설=작가, 영화=연도·감독, TV=연도)
 * - 통계 패널(d-stat): 게임=Steam desc+%+리뷰 수, 영화/TV=★TMDB 평점+참여 수
 * - 섹션 순서: 볼 수 있는 곳 -> 시놉시스(4줄 클램프+더보기) -> 작품 정보 -> 리뷰
 * - 하단 고정 액션 바: 관심 등록(accent-ink fill) + 좋아요·리뷰(48px 고스트 원형).
 *   핸들러·옵티미스틱 전이·로그인 게이트는 lg 버튼과 동일 로직 공유.
 *
 * 목업 대비 편차 (실데이터, API 기준):
 * - "비슷한 작품" 섹션 생략 - 추천/유사 작품 API와 훅이 없다 (추가 후 이식).
 * - "볼 수 있는 곳"은 platformInfo에서 url을 가진 플랫폼만 링크 버튼으로 노출.
 *   TMDB watch_providers(넷플릭스 등)는 URL이 없어 링크 대상에서 제외되고,
 *   OTT 목록은 정보 패널의 "지원 플랫폼" 행으로 표기된다. url이 하나도 없으면
 *   섹션 자체를 숨긴다.
 * - 통계 필은 실데이터가 있는 것만 렌더: AOD 평점(score>0), 게임의 Steam 리뷰
 *   집계(attr.review_summary). TMDB 평점(attr.rating)은 <lg 통계 패널 전용 -
 *   lg+ 헤더 필 구성은 기존 화면 불변 룰로 그대로 둔다.
 * - "리뷰 더 보기"는 useReviews(page=0, size 증가) 방식. 트레이드오프: 매 클릭마다
 *   0페이지부터 누적 재전송된다 - 기존 훅 시그니처(페이지 단위 조회) 유지의 대가.
 *   keepPreviousData로 재조회 중 목록 깜빡임을 막는다.
 * - 구 페이지의 싫어요, 공유, 리뷰 삭제 UI는 목업에 없어 미이식
 *   (리뷰 삭제는 프로필 > 내 리뷰에서 가능).
 * - 비로그인 상호작용은 구 페이지의 로그인 유도 모달 방식을 따르되 토큰 스타일의
 *   ConfirmDialog(ui 신규)로 대체.
 */

const REVIEW_PAGE_SIZE = 20;

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

/** lg+ 전용 텍스트 뒤로가기 - <lg는 Shell 상단 바의 아이콘 버튼이 담당 */
const backLinkClass =
  "-ml-2.5 hidden items-center gap-1.5 rounded-input px-2.5 py-1.5 text-sm font-medium text-ink-2 transition-colors hover:bg-ink/5 hover:text-ink lg:inline-flex";

const primaryBtnClass =
  "rounded-full bg-ink px-[22px] py-2.5 text-sm font-semibold text-surface transition-opacity hover:opacity-85 active:scale-[0.98]";

/** 목업 .btn 공통 */
const actionBtnClass =
  "inline-flex items-center gap-[7px] rounded-full px-5 py-[11px] text-[14.5px] font-semibold transition-colors active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60";

function Shell({ title, children }: { title?: string; children: ReactNode }) {
  const navigate = useNavigate();
  return (
    <>
      {/* <lg 상단 바 (목업 .d-nav) - 뒤로가기 아이콘 + 작품명 truncate */}
      <div className="sticky top-0 z-40 flex h-14 items-center gap-0.5 border-b border-line bg-surface/90 px-2 backdrop-blur-md lg:hidden">
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="뒤로 가기"
          className="grid h-11 w-11 flex-none place-items-center rounded-full text-ink transition-colors active:bg-ink/5"
        >
          <ArrowLeft size={21} />
        </button>
        {title && (
          <span className="min-w-0 truncate pr-3 text-[15px] font-bold text-ink">
            {title}
          </span>
        )}
      </div>
      {/* <lg는 하단 고정 액션 바 높이만큼 pb 확보 (pb-28), pt는 헤더 블록이 관리 */}
      <div className="mx-auto max-w-[1200px] px-4 pb-28 lg:px-6 lg:pb-20 lg:pt-6">
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
    </>
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
      {/* <lg 최종 레이아웃 형상: 포스터 헤더 블록 + 태그 행 + 시놉시스 텍스트 행
          (상단 바는 Shell이 실물로 렌더 - 로드 완료 시 레이아웃 점프 방지) */}
      <div className="lg:hidden">
        <div className="flex gap-3.5 pt-4">
          <div className="aspect-[3/4] w-[108px] flex-none rounded-panel bg-line" />
          <div className="min-w-0 flex-1">
            <div className="h-[22px] w-14 rounded-full bg-line" />
            <div className="mt-2 h-6 w-4/5 rounded-input bg-line" />
            <div className="mt-2 h-4 w-28 rounded-input bg-canvas" />
          </div>
        </div>
        <div className="mt-3 flex gap-1.5">
          <div className="h-6 w-14 rounded-full bg-line" />
          <div className="h-6 w-16 rounded-full bg-line" />
        </div>
        <div className="mt-6 h-5 w-20 rounded-input bg-line" />
        <div className="mt-3 flex flex-col gap-2">
          <div className="h-3.5 w-full rounded-input bg-line" />
          <div className="h-3.5 w-4/5 rounded-input bg-line" />
          <div className="h-3.5 w-3/5 rounded-input bg-line" />
        </div>
        <div className="mt-6 h-5 w-16 rounded-input bg-line" />
        <div className="mt-3 flex flex-col gap-3.5">
          <ReviewSkeleton />
        </div>
      </div>

      {/* lg+ 기존 스켈레톤 (불변) */}
      <div className="mt-4 hidden items-start gap-5 md:grid-cols-[auto_1fr] md:gap-9 lg:grid">
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
      <div className="mt-11 hidden items-start gap-10 lg:grid lg:grid-cols-[1fr_320px]">
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
  // <lg 담기 바텀시트 (C-FE2) - lg+ 팝오버는 AddToCollectionPopover가 자체 관리
  const [isCollectSheetOpen, setIsCollectSheetOpen] = useState(false);
  // <lg 시놉시스 4줄 클램프 - 열림 상태 + 실측 overflow(더보기 노출 판정)
  const [isSynopsisOpen, setIsSynopsisOpen] = useState(false);
  const [synopsisClamped, setSynopsisClamped] = useState(false);
  const synopsisRef = useRef<HTMLParagraphElement>(null);

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
    setIsSynopsisOpen(false);
  }, [contentId]);

  // 클램프 상태(<lg 4줄)에서 실제로 넘치는 경우에만 더보기 버튼을 노출.
  // 1회 측정 고정이면 lg 진입 후 <lg 리사이즈/회전, 폰트 스왑 시 재측정이 없어
  // 4줄 잘림인데 버튼이 안 뜬다 - ResizeObserver 재측정 + fonts.ready 후 1회 보정.
  // 열림 상태는 클램프가 풀려 측정이 무의미(항상 false 오판)하므로 관찰을 멈추고
  // 마지막 판정값을 유지한다("접기" 버튼 보존). lg+는 버튼 자체가 lg:hidden.
  // StrictMode 이중 실행에도 측정-구독-해제만 반복되는 멱등 구조.
  useEffect(() => {
    const el = synopsisRef.current;
    if (!el || isSynopsisOpen) return;
    const measure = () =>
      setSynopsisClamped(el.scrollHeight > el.clientHeight + 1);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    let cancelled = false;
    document.fonts?.ready.then(() => {
      if (!cancelled) measure();
    });
    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [work?.synopsis, isSynopsisOpen]);

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

  // <lg 담기 진입 - 비로그인은 기존 관례(ConfirmDialog)로 로그인 유도
  const handleCollectSheet = () => {
    if (!isAuthenticated) {
      setIsLoginOpen(true);
      return;
    }
    setIsCollectSheetOpen(true);
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
  // <lg 태그 행 전용 dedupe - 실데이터에 중복 장르가 실재(key 충돌 방지)
  const mobileTags = [...new Set(genres)];

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
    return { label, percent: Math.round((positive / total) * 100), total };
  })();

  // <lg 통계 패널(영화/TV): platformInfo의 TMDB rating이 있을 때만 (목업 d-stat)
  const tmdbStat = (() => {
    if (category !== "movie" && category !== "tv") return null;
    const entry = Object.entries(work.platformInfo ?? {}).find(([key]) =>
      key.toUpperCase().startsWith("TMDB"),
    );
    const rating = Number(entry?.[1]?.rating);
    if (!Number.isFinite(rating) || rating <= 0) return null;
    const votes = Number(entry?.[1]?.vote_count);
    return {
      rating,
      votes: Number.isFinite(votes) && votes > 0 ? votes : undefined,
    };
  })();

  // <lg 헤더 부제 - 도메인별 (목업: 게임 "2000 · Valve", 웹툰 "WINSTON",
  // 영화 "2026 · Leila Sy 감독"). TV는 감독 키가 없어 연도만.
  const asText = (v: unknown) =>
    typeof v === "string" && v.trim() !== "" ? v.trim() : undefined;
  const mobileSubtitle = (() => {
    const info = work.domainInfo ?? {};
    switch (category) {
      case "game":
        return [year, asText(info.developer)].filter(Boolean).join(" · ");
      case "webtoon":
      case "webnovel":
        return asText(info.author) ?? year ?? "";
      case "movie": {
        const director = Array.isArray(info.directors)
          ? info.directors.map(asText).find(Boolean)
          : undefined;
        return [year, director && `${director} 감독`]
          .filter(Boolean)
          .join(" · ");
      }
      default:
        return year ?? "";
    }
  })();

  // <lg 웹툰 요일 필 - "화요웹툰 · 연재중" / 요일 미상(빈 문자열) 연재작은
  // "연재중", 완결작은 "완결"만 (workCardInfo 웹툰 footer와 동일 규약)
  const webtoonPill = (() => {
    if (category !== "webtoon") return null;
    const status = asText(work.domainInfo?.status);
    const weekday = asText(work.domainInfo?.weekday);
    const weekdayKo = weekday ? WEEKDAY_KO[weekday] : undefined;
    if (status === "연재중")
      return weekdayKo ? `${weekdayKo}요웹툰 · 연재중` : "연재중";
    if (status === "완결") return "완결";
    return null;
  })();

  // 볼 수 있는 곳: url을 가진 플랫폼만 외부 링크 버튼으로
  const watchLinks = Object.entries(work.platformInfo ?? {}).flatMap(
    ([key, info]) => {
      const url = info?.url;
      return typeof url === "string" && url.startsWith("http")
        ? [
            {
              key,
              url,
              label: PLATFORM_META[key]?.label ?? getPlatformLabel(key),
            },
          ]
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
                  PLATFORM_META[String(p)]?.label ??
                  getPlatformLabel(String(p)),
              )
              .join(", ")
          : formatFieldValue(key, value),
    }));

  const bookmarked = bookmarkStatus?.bookmarked === true;
  // 옵티미스틱 업데이트도 userLikeType을 직접 전이시키므로 단일 판정으로 충분
  const liked = likeStats?.userLikeType === "LIKE";

  // 헤더 썸네일 내용물 (데스크톱/모바일 컨테이너 공용) - 없으면 도메인 아이콘 폴백
  const thumbContent = work.thumbnail ? (
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
  );

  return (
    <>
      <Shell title={work.title}>
        {/* <lg 헤더 - 게임: 16:9 풀블리드 히어로 (목업 프레임 6) /
            그 외: 포스터(108px, 3:4) + 정보 블록 (목업 프레임 7·8) */}
        <div className="lg:hidden">
          {isLandscape ? (
            <>
              <div className="-mx-4 aspect-video overflow-hidden bg-canvas">
                {thumbContent}
              </div>
              <div className="mt-4">
                <Tag variant="accent">{domainLabel}</Tag>
                <h1 className="mt-2 text-2xl font-extrabold leading-[1.25] tracking-[-0.02em] text-ink">
                  {work.title}
                </h1>
                {mobileSubtitle && (
                  <p className="mt-1 text-sm text-ink-2">{mobileSubtitle}</p>
                )}
              </div>
            </>
          ) : (
            <div className="flex gap-3.5 pt-4">
              <div className="aspect-[3/4] w-[108px] flex-none overflow-hidden rounded-panel border border-line bg-canvas shadow-card">
                {thumbContent}
              </div>
              <div className="min-w-0">
                <Tag variant="accent">{domainLabel}</Tag>
                <h1 className="mt-[7px] text-xl font-extrabold leading-[1.25] tracking-[-0.02em] text-ink">
                  {work.title}
                </h1>
                {mobileSubtitle && (
                  <p className="mt-1 text-sm text-ink-2">{mobileSubtitle}</p>
                )}
                {webtoonPill && (
                  <span className="mt-2 inline-flex items-center gap-[5px] rounded-full bg-accent-tint px-[11px] py-[5px] text-[12.5px] font-bold text-accent-ink">
                    <CalendarCheck size={13} aria-hidden="true" />
                    {webtoonPill}
                  </span>
                )}
              </div>
            </div>
          )}

          {mobileTags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {mobileTags.map((g) => (
                <Tag key={g} variant="surface">
                  {g}
                </Tag>
              ))}
            </div>
          )}

          {/* 통계 패널 (목업 d-stat) - 데이터 있는 도메인만 */}
          {steamSummary && (
            <div className="mt-3.5 flex items-center gap-2.5 rounded-panel border border-line bg-surface px-3.5 py-3 text-sm text-ink">
              <ThumbsUp
                size={18}
                weight="fill"
                className="flex-none text-accent-ink"
                aria-hidden="true"
              />
              <span className="font-extrabold">{steamSummary.label}</span>
              <span className="tabular-nums">{steamSummary.percent}%</span>
              <span className="ml-auto text-xs text-ink-3">
                Steam 리뷰 {steamSummary.total.toLocaleString()}개
              </span>
            </div>
          )}
          {tmdbStat && (
            <div className="mt-3.5 flex items-center gap-2.5 rounded-panel border border-line bg-surface px-3.5 py-3 text-sm text-ink">
              <Star
                size={18}
                weight="fill"
                className="flex-none text-star"
                aria-hidden="true"
              />
              <span className="font-extrabold tabular-nums">
                {tmdbStat.rating.toFixed(1)}
              </span>
              <span className="ml-auto text-xs text-ink-3">
                TMDB 평점
                {tmdbStat.votes
                  ? ` · ${tmdbStat.votes.toLocaleString()}명 참여`
                  : ""}
              </span>
            </div>
          )}

          {watchLinks.length > 0 && (
            <section className="mt-6">
              <h2 className="text-base font-extrabold tracking-[-0.02em] text-ink">
                볼 수 있는 곳
              </h2>
              <div className="mt-2 flex flex-wrap gap-2">
                {watchLinks.map(({ key, url, label }) => (
                  <a
                    key={key}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-full border border-line-strong bg-surface px-3.5 py-[9px] text-[13.5px] font-semibold text-ink"
                  >
                    {label}
                    <ArrowSquareOut size={14} className="text-ink-3" />
                  </a>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* lg+ 헤더: 포스터 + 작품 요약 (기존 배치 불변) */}
        <div className="mt-4 hidden items-start gap-5 md:grid-cols-[auto_1fr] md:gap-9 lg:grid">
          <div
            className={`overflow-hidden rounded-panel border border-line bg-canvas shadow-card ${
              isLandscape
                ? "aspect-[460/215] w-full md:w-[360px]"
                : "aspect-[2/3] w-[180px] md:w-[232px]"
            }`}
          >
            {thumbContent}
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
                    icon={
                      <Star weight="fill" size={14} className="text-star" />
                    }
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
                className={`${actionBtnClass} bg-accent-ink text-surface hover:opacity-90`}
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
              {/* 컬렉션 담기 (C-FE2) - 트리거+팝오버 세트, 기존 버튼 로직 불변 */}
              <AddToCollectionPopover
                contentId={contentId}
                domain={work.domain}
                isAuthenticated={isAuthenticated}
                onRequireLogin={() => setIsLoginOpen(true)}
              />
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

        {/* 본문 2단(lg+): 시놉시스, 리뷰 / 작품 정보 패널.
            <lg는 단일 컬럼 - 시놉시스 -> 작품 정보(모바일 패널) -> 리뷰 */}
        <div
          className={`mt-6 grid items-start gap-10 lg:mt-11 ${
            infoRows.length > 0 ? "lg:grid-cols-[1fr_320px]" : ""
          }`}
        >
          <div>
            <section>
              <h2 className="text-base font-extrabold tracking-[-0.02em] text-ink lg:text-[19px]">
                시놉시스
              </h2>
              {work.synopsis ? (
                <>
                  <p
                    ref={synopsisRef}
                    className={`mt-3 max-w-[65ch] whitespace-pre-line text-sm leading-[1.65] text-ink-2 lg:text-base lg:leading-normal ${
                      isSynopsisOpen ? "" : "line-clamp-4 lg:line-clamp-none"
                    }`}
                  >
                    {work.synopsis}
                  </p>
                  {synopsisClamped && (
                    <button
                      type="button"
                      onClick={() => setIsSynopsisOpen((open) => !open)}
                      className="mt-1.5 inline-flex items-center gap-0.5 text-[13px] font-semibold text-ink lg:hidden"
                    >
                      {isSynopsisOpen ? (
                        <>
                          접기
                          <CaretUp size={13} aria-hidden="true" />
                        </>
                      ) : (
                        <>
                          더보기
                          <CaretDown size={13} aria-hidden="true" />
                        </>
                      )}
                    </button>
                  )}
                </>
              ) : (
                <p className="mt-3 text-ink-3">
                  시놉시스가 아직 준비되지 않았어요.
                </p>
              )}
            </section>

            {/* <lg 작품 정보 (목업 info-panel: 키 좌측 / 값 우측 정렬) */}
            {infoRows.length > 0 && (
              <section className="mt-6 lg:hidden">
                <h2 className="text-base font-extrabold tracking-[-0.02em] text-ink">
                  작품 정보
                </h2>
                <dl className="mt-2.5 rounded-panel border border-line bg-surface px-3.5 py-1">
                  {infoRows.map(({ key, label, value }) => (
                    <div
                      key={key}
                      className="flex items-start justify-between gap-4 border-b border-line py-2.5 last:border-b-0"
                    >
                      <dt className="flex-none text-[13.5px] text-ink-3">
                        {label}
                      </dt>
                      <dd className="min-w-0 break-words text-right text-[13.5px] font-semibold text-ink">
                        {value}
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
            )}

            <section className="mt-6 lg:mt-10">
              <div className="flex items-center gap-2.5">
                <h2 className="text-base font-extrabold tracking-[-0.02em] text-ink lg:text-[19px]">
                  리뷰
                </h2>
                <span className="font-bold tabular-nums text-accent-ink">
                  {reviewCount}
                </span>
              </div>

              {reviewsData === undefined ? (
                <div
                  className="mt-3.5 flex flex-col gap-3.5"
                  aria-hidden="true"
                >
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
            <aside className="hidden rounded-panel border border-line bg-surface px-[22px] py-5 lg:block">
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

      {/* <lg 하단 고정 액션 바 (목업 d-actionbar) - lg+ 헤더 버튼과 동일 핸들러 공유.
          홈 인디케이터 기기는 safe-area만큼 하단 패딩 확장 (임의값 클래스 게이트
          회피를 위해 style로 - 미지원 환경은 max()의 14px 폴백) */}
      <div
        style={{ paddingBottom: "max(14px, env(safe-area-inset-bottom))" }}
        className="fixed inset-x-0 bottom-0 z-40 flex items-center gap-2.5 border-t border-line bg-surface/95 px-4 pt-2.5 backdrop-blur-md lg:hidden"
      >
        <button
          type="button"
          onClick={handleBookmark}
          disabled={toggleBookmarkMutation.isPending}
          className="flex h-12 flex-1 items-center justify-center gap-[7px] rounded-full bg-accent-ink text-[14.5px] font-bold text-surface transition-opacity active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <BookmarkSimple size={17} weight={bookmarked ? "fill" : "regular"} />
          {bookmarked ? "관심 작품" : "관심 등록"}
        </button>
        <button
          type="button"
          onClick={handleLike}
          aria-label="좋아요"
          aria-pressed={liked}
          disabled={toggleLikeMutation.isPending}
          className={`grid h-12 w-12 flex-none place-items-center rounded-full border transition-colors active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 ${
            liked
              ? "border-transparent bg-accent-tint text-accent-ink"
              : "border-line-strong bg-surface text-ink"
          }`}
        >
          <ThumbsUp size={20} weight={liked ? "fill" : "regular"} />
        </button>
        <button
          type="button"
          onClick={handleWriteReview}
          aria-label="리뷰 쓰기"
          className="grid h-12 w-12 flex-none place-items-center rounded-full border border-line-strong bg-surface text-ink active:scale-[0.98]"
        >
          <PencilSimple size={20} />
        </button>
        <button
          type="button"
          onClick={handleCollectSheet}
          aria-label="컬렉션에 담기"
          aria-haspopup="dialog"
          aria-expanded={isCollectSheetOpen}
          className="grid h-12 w-12 flex-none place-items-center rounded-full border border-line-strong bg-surface text-ink active:scale-[0.98]"
        >
          <StackPlus size={20} />
        </button>
      </div>

      {/* <lg 담기 바텀시트 - display:none 조상 밖(페이지 루트)에 마운트해야
          top-layer가 그려진다 (컴포넌트 주석 참고) */}
      <AddToCollectionSheet
        contentId={contentId}
        domain={work.domain}
        open={isCollectSheetOpen}
        onClose={() => setIsCollectSheetOpen(false)}
      />

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

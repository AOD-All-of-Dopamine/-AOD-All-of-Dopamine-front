import { ReactNode, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import {
  ArrowLeft,
  Eye,
  Heart,
  LockSimple,
  PencilSimple,
  ShareNetwork,
  WarningCircle,
} from "@phosphor-icons/react";
import { useAuth } from "../contexts/AuthContext";
import {
  useCollectionDetail,
  useToggleCollectionLike,
} from "@aod/shared/hooks";
import { CollectionItem } from "@aod/shared/api";
import { WorkSummary } from "@aod/shared/types";
import { collectionDomainLabel } from "@aod/shared/constants";
import { thumbnailFallbackMap, type Category } from "../constants/thumbnail";
import {
  workCardFooter,
  workCardMeta,
  workCardTags,
} from "../components/ui/workCardInfo";
import CollectionCollage from "../components/ui/CollectionCollage";
import { CuratorAvatar } from "../components/ui/CollectionCard";
import EmptyState from "../components/ui/EmptyState";
import ConfirmDialog from "../components/ui/ConfirmDialog";

/**
 * /collections/:id - mockups/collections-mockup.html 섹션 2(상세)·5b(모바일) 이식.
 * lg+: 콜라주(380px, 4:3) + 정보 히어로 / 담긴 작품 행 리스트.
 * <lg: 뒤로가기+제목 상단 바(work-detail Shell 문법) / 16:10 풀블리드 콜라주 /
 * 하단 고정 좋아요 액션 바(work-detail 액션 바 문법).
 *
 * 좋아요: accent-ink 채움 버튼 1개, 옵티미스틱 ±1(useToggleCollectionLike),
 * 비로그인 클릭 시 로그인 유도(ConfirmDialog - work-detail 관례).
 * 공유: 현재 URL 클립보드 복사 + 토스트.
 * 아이템 행의 도메인별 표시 필드는 workCardInfo 파생 로직 재사용
 * (CollectionItem -> WorkSummary 형태 변환 후 meta/footer 파생).
 *
 * 목업 대비 편차:
 * - "비슷한 컬렉션" 섹션 생략 - 추천 API가 없다 (work-detail의 비슷한 작품 생략
 *   전례와 동일).
 * - 모바일 액션 바의 "담긴 작품 전부 관심 등록" 고스트 버튼 생략 - 일괄 북마크
 *   API가 없어 좋아요 버튼만 배치.
 * - owner면 편집 진입점(lg+ 고스트 필, <lg 상단 바 아이콘) -
 *   /collections/:id/edit (collection-edit-page).
 */

const categoryOf = (domain: string): Category => {
  const key = domain?.toLowerCase() as Category;
  return key in thumbnailFallbackMap ? key : "movie";
};

/** CollectionItem -> WorkSummary 형태 변환 (workCardInfo 파생 로직 재사용용) */
const toWorkSummary = (item: CollectionItem): WorkSummary => ({
  id: item.contentId,
  domain: item.domain,
  title: item.title,
  thumbnail: item.posterUrl,
  score: item.score ?? 0,
  releaseDate: item.releaseDate ?? undefined,
  genres: item.genres,
  platforms: item.platforms,
  creator: item.creator,
  weekday: item.weekday,
  status: item.status,
  ageRating: item.ageRating,
  steamReviewDesc: item.steamReviewDesc,
  steamPositivePct: item.steamPositivePct,
  externalRating: item.externalRating,
});

/** 목업 item-meta - "연도 · 제작자 · 장르 상위 2" (workCardMeta/Tags 재사용) */
const itemMetaLine = (work: WorkSummary): string | undefined => {
  const parts = [workCardMeta(work), ...(workCardTags(work)?.slice(0, 2) ?? [])];
  const line = parts.filter(Boolean).join(" · ");
  return line || undefined;
};

/** "8월 12일 업데이트" (올해가 아니면 연도 포함) */
const updatedLabel = (iso: string | undefined): string | undefined => {
  if (!iso) return undefined;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return undefined;
  const monthDay = `${date.getMonth() + 1}월 ${date.getDate()}일`;
  const year =
    date.getFullYear() === new Date().getFullYear()
      ? ""
      : `${date.getFullYear()}년 `;
  return `${year}${monthDay} 업데이트`;
};

const primaryBtnClass =
  "rounded-full bg-ink px-[22px] py-2.5 text-sm font-semibold text-surface transition-opacity hover:opacity-85 active:scale-[0.98]";

const ghostPillClass =
  "inline-flex items-center gap-[7px] rounded-full border border-line-strong bg-surface px-[18px] py-[11px] text-sm font-semibold text-ink transition-colors hover:border-ink active:scale-[0.98]";

/**
 * 페이지 골격 - <lg 상단 바(뒤로가기 + 제목 truncate + 우측 액션) +
 * lg+ 텍스트 뒤로가기 (work-detail Shell 문법 재사용)
 */
function Shell({
  title,
  actions,
  children,
}: {
  title?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const navigate = useNavigate();
  return (
    <>
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
          <span className="min-w-0 flex-1 truncate text-[15px] font-bold text-ink">
            {title}
          </span>
        )}
        {actions && <div className="ml-auto flex flex-none">{actions}</div>}
      </div>
      {/* <lg는 하단 고정 액션 바 높이만큼 pb 확보 */}
      <div className="mx-auto max-w-[1440px] px-4 pb-28 lg:px-6 lg:pb-16 lg:pt-6">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="-ml-2.5 hidden items-center gap-1.5 rounded-input px-2.5 py-1.5 text-sm font-medium text-ink-2 transition-colors hover:bg-ink/5 hover:text-ink lg:inline-flex"
        >
          <ArrowLeft size={16} />
          뒤로 가기
        </button>
        {children}
      </div>
    </>
  );
}

/** 히어로 + 아이템 행 최종 모양의 페이지 스켈레톤 */
function DetailSkeleton() {
  return (
    <div aria-hidden="true" className="animate-pulse">
      {/* <lg: 풀블리드 콜라주 + 텍스트 블록 */}
      <div className="lg:hidden">
        <div className="-mx-4 aspect-[16/10] bg-line" />
        <div className="pt-3.5">
          <div className="h-3.5 w-20 rounded-input bg-canvas" />
          <div className="mt-2 h-6 w-4/5 rounded-input bg-line" />
          <div className="mt-2 h-4 w-3/5 rounded-input bg-canvas" />
          <div className="mt-3 flex items-center gap-2.5">
            <div className="h-[26px] w-[26px] flex-none rounded-full bg-line" />
            <div className="h-3.5 w-32 rounded-input bg-canvas" />
          </div>
        </div>
      </div>
      {/* lg+: 380px 콜라주 + 정보 그리드 */}
      <div className="mt-2 hidden items-start gap-8 lg:grid lg:grid-cols-[380px_1fr]">
        <div className="aspect-[4/3] rounded-panel bg-line" />
        <div className="pt-1.5">
          <div className="h-4 w-24 rounded-input bg-canvas" />
          <div className="mt-2.5 h-8 w-3/5 rounded-input bg-line" />
          <div className="mt-3 h-4 w-4/5 max-w-[480px] rounded-input bg-canvas" />
          <div className="mt-4 flex items-center gap-2.5">
            <div className="h-[26px] w-[26px] flex-none rounded-full bg-line" />
            <div className="h-3.5 w-40 rounded-input bg-canvas" />
          </div>
          <div className="mt-5 flex gap-2.5">
            <div className="h-11 w-32 rounded-full bg-line" />
            <div className="h-11 w-24 rounded-full bg-line" />
          </div>
        </div>
      </div>
      <div className="mt-8 h-5 w-24 rounded-input bg-line" />
      <div className="mt-3.5 flex flex-col gap-2.5">
        {Array.from({ length: 3 }, (_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 rounded-panel border border-line bg-surface p-3.5"
          >
            <div className="h-5 w-6 flex-none rounded-input bg-canvas" />
            <div className="aspect-[3/4] w-16 flex-none rounded-input bg-line" />
            <div className="min-w-0 flex-1">
              <div className="h-4 w-2/5 rounded-input bg-line" />
              <div className="mt-2 h-3 w-3/5 rounded-input bg-canvas" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** 담긴 작품 행 (목업 .item-row) - 게임은 가로 16:9 썸네일, 그 외 3:4 */
function CollectionItemRow({
  item,
  index,
  curator,
}: {
  item: CollectionItem;
  index: number;
  curator: string;
}) {
  const work = toWorkSummary(item);
  const isGame = item.domain === "GAME";
  const meta = itemMetaLine(work);
  const footer = workCardFooter(work);

  return (
    <Link
      to={`/work/${item.contentId}`}
      className={`grid items-start gap-3 rounded-panel border border-line bg-surface p-3 transition-colors hover:border-line-strong lg:items-center lg:gap-4 lg:py-3.5 lg:pl-3.5 lg:pr-[18px] ${
        isGame
          ? "grid-cols-[24px_88px_1fr] lg:grid-cols-[32px_128px_1fr_auto]"
          : "grid-cols-[24px_64px_1fr] lg:grid-cols-[32px_92px_1fr_auto]"
      }`}
    >
      <div className="pt-0.5 text-center text-[13.5px] font-extrabold tabular-nums text-ink-3 lg:pt-0 lg:text-[15px]">
        {index}
      </div>
      <div
        className={`overflow-hidden rounded-input border border-line bg-canvas ${
          isGame ? "aspect-video" : "aspect-[3/4]"
        }`}
      >
        {item.posterUrl ? (
          <img
            src={item.posterUrl}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="grid h-full w-full place-items-center">
            <img
              src={thumbnailFallbackMap[categoryOf(item.domain)]}
              alt=""
              loading="lazy"
              className="w-[clamp(20px,34%,36px)] opacity-80"
            />
          </div>
        )}
      </div>
      <div className="min-w-0">
        <div className="text-sm font-bold text-ink lg:text-[15.5px]">
          {item.title}
        </div>
        {meta && (
          <div className="mt-0.5 text-xs text-ink-3 lg:text-[13px]">{meta}</div>
        )}
        {/* <lg 인라인 스탯 (목업 .item-inline-stat) - lg+는 우측 열이 담당 */}
        {footer && (
          <div className="mt-1.5 inline-flex items-center gap-1.5 text-xs tabular-nums text-ink-2 lg:hidden">
            {footer}
          </div>
        )}
        {item.comment && (
          <p className="mt-2 rounded-input border border-line bg-canvas px-3 py-2 text-[12.5px] leading-[1.55] text-ink-2 lg:mt-[9px] lg:max-w-[62ch] lg:px-[13px] lg:py-[9px] lg:text-[13.5px]">
            <b className="font-bold text-ink">{curator}:</b> {item.comment}
          </p>
        )}
      </div>
      {footer && (
        <div className="hidden flex-col items-end gap-1 text-[12.5px] tabular-nums text-ink-2 lg:flex">
          {footer}
        </div>
      )}
    </Link>
  );
}

export default function CollectionDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const collectionId = id ? Number(id) : 0;
  const { isAuthenticated } = useAuth();

  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimerRef = useRef<number | undefined>(undefined);

  const { data, isLoading, isError, error, refetch } =
    useCollectionDetail(collectionId);
  const toggleLike = useToggleCollectionLike(collectionId);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [collectionId]);

  useEffect(() => {
    return () => window.clearTimeout(toastTimerRef.current);
  }, []);

  const showToast = (message: string) => {
    setToast(message);
    window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast(null), 2000);
  };

  const handleLike = () => {
    if (!isAuthenticated) {
      setIsLoginOpen(true);
      return;
    }
    if (!data) return;
    // 실패 시 훅이 옵티미스틱 전이를 롤백한 뒤 여기서 토스트로 안내한다
    // (만료 토큰 등 401은 로그인 유도 문구)
    toggleLike.mutate(data.likedByMe, {
      onError: (error) => {
        const status = axios.isAxiosError(error)
          ? error.response?.status
          : undefined;
        showToast(
          status === 401
            ? "로그인이 만료됐어요. 다시 로그인해 주세요."
            : "좋아요 처리에 실패했어요. 잠시 후 다시 시도해 주세요.",
        );
      },
    });
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      showToast("링크를 복사했어요");
    } catch {
      showToast("링크 복사에 실패했어요");
    }
  };

  const handleEdit = () => navigate(`/collections/${collectionId}/edit`);

  const status = axios.isAxiosError(error) ? error.response?.status : undefined;
  const isPrivate = status === 403;
  const notFound =
    !collectionId || Number.isNaN(collectionId) || status === 404;

  if (isLoading) {
    return (
      <Shell>
        <DetailSkeleton />
      </Shell>
    );
  }

  if (isPrivate) {
    return (
      <Shell>
        <div className="mt-4">
          <EmptyState
            icon={<LockSimple size={44} />}
            title="비공개 컬렉션이에요"
            description="큐레이터만 볼 수 있는 컬렉션이에요."
            action={
              <Link
                to="/collections"
                className={`inline-block ${primaryBtnClass}`}
              >
                컬렉션 둘러보기
              </Link>
            }
          />
        </div>
      </Shell>
    );
  }

  if (!data || notFound) {
    if (isError && !notFound) {
      return (
        <Shell>
          <div className="mt-4">
            <EmptyState
              icon={<WarningCircle size={44} />}
              title="컬렉션을 불러오지 못했어요"
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
    return (
      <Shell>
        <div className="mt-4">
          <EmptyState
            title="컬렉션을 찾을 수 없어요"
            description="주소가 잘못되었거나 삭제된 컬렉션일 수 있어요."
            action={
              <Link
                to="/collections"
                className={`inline-block ${primaryBtnClass}`}
              >
                컬렉션 둘러보기
              </Link>
            }
          />
        </div>
      </Shell>
    );
  }

  const domainLabel = collectionDomainLabel(data.domain);
  const updated = updatedLabel(data.updatedAt);
  const liked = data.likedByMe;

  const mobileActions = (
    <>
      {data.owner && (
        <button
          type="button"
          onClick={handleEdit}
          aria-label="편집"
          className="grid h-11 w-11 place-items-center rounded-full text-ink transition-colors active:bg-ink/5"
        >
          <PencilSimple size={21} />
        </button>
      )}
      <button
        type="button"
        onClick={handleShare}
        aria-label="공유"
        className="grid h-11 w-11 place-items-center rounded-full text-ink transition-colors active:bg-ink/5"
      >
        <ShareNetwork size={21} />
      </button>
    </>
  );

  return (
    <>
      <Shell title={data.title} actions={mobileActions}>
        {/* <lg 히어로 - 풀블리드 16:10 콜라주 + 정보 블록 (목업 5b) */}
        <div className="lg:hidden">
          <div className="-mx-4">
            <CollectionCollage
              posters={data.coverPosters}
              tint={data.tint}
              domain={data.domain}
              className="aspect-[16/10]"
            />
          </div>
          <div className="pt-3.5">
            <div className="text-[13px] font-bold text-accent-ink">
              {domainLabel} 컬렉션
            </div>
            <h1 className="mt-1 text-[21px] font-extrabold leading-[1.2] tracking-[-0.02em] text-ink">
              {data.title}
            </h1>
            {data.description && (
              <p className="mt-1.5 text-[13.5px] leading-[1.65] text-ink-2">
                {data.description}
              </p>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-2.5 text-[12.5px] text-ink-2">
              <CuratorAvatar
                name={data.curatorNickname}
                tint={data.tint}
                className="h-[26px] w-[26px] text-xs"
              />
              <b className="font-bold text-ink">{data.curatorNickname}</b>
              <span className="text-ink-3">·</span>
              <span>{data.itemCount}작품</span>
              <span className="text-ink-3">·</span>
              <span className="inline-flex items-center gap-1 tabular-nums">
                <Eye size={13} aria-hidden="true" />
                {data.viewCount.toLocaleString()}
                <span className="sr-only">회 조회</span>
              </span>
            </div>
          </div>
        </div>

        {/* lg+ 히어로 (목업 2 .det-hero) */}
        <div className="mt-2 hidden items-start gap-8 lg:grid lg:grid-cols-[380px_1fr]">
          <CollectionCollage
            posters={data.coverPosters}
            tint={data.tint}
            domain={data.domain}
            className="aspect-[4/3] rounded-panel shadow-lift"
          />
          <div className="pt-1.5">
            <div className="text-[13px] font-bold text-accent-ink">
              {domainLabel} 컬렉션
            </div>
            <h1 className="mt-1.5 text-[30px] font-extrabold leading-[1.2] tracking-[-0.02em] text-ink">
              {data.title}
            </h1>
            {data.description && (
              <p className="mt-2.5 max-w-[56ch] text-[15px] leading-[1.65] text-ink-2">
                {data.description}
              </p>
            )}
            <div className="mt-4 flex items-center gap-2.5 text-[13.5px] text-ink-2">
              <CuratorAvatar
                name={data.curatorNickname}
                tint={data.tint}
                className="h-[26px] w-[26px] text-xs"
              />
              <b className="font-bold text-ink">{data.curatorNickname}</b>
              <span className="text-ink-3">·</span>
              <span>{data.itemCount}작품</span>
              {updated && (
                <>
                  <span className="text-ink-3">·</span>
                  <span>{updated}</span>
                </>
              )}
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={handleLike}
                aria-pressed={liked}
                disabled={toggleLike.isPending}
                className="inline-flex items-center gap-2 rounded-full bg-accent-ink px-[22px] py-[11px] text-[14.5px] font-bold text-surface transition-opacity hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Heart size={17} weight={liked ? "fill" : "regular"} />
                좋아요 {data.likeCount.toLocaleString()}
              </button>
              <button
                type="button"
                onClick={handleShare}
                className={ghostPillClass}
              >
                <ShareNetwork size={16} aria-hidden="true" />
                공유
              </button>
              {data.owner && (
                <button
                  type="button"
                  onClick={handleEdit}
                  className={ghostPillClass}
                >
                  <PencilSimple size={16} aria-hidden="true" />
                  편집
                </button>
              )}
              <span className="ml-1 inline-flex items-center gap-1 text-[13px] tabular-nums text-ink-3">
                <Eye size={14} aria-hidden="true" />
                조회 {data.viewCount.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* 담긴 작품 (목업 .shelf-head + .item-row) */}
        <div className="mt-6 flex items-baseline gap-2.5 lg:mt-[34px]">
          <h2 className="text-base font-extrabold tracking-[-0.02em] text-ink lg:text-[19px]">
            담긴 작품
          </h2>
          <span className="text-[13.5px] text-ink-3">큐레이터의 순서대로</span>
        </div>
        {data.items.length > 0 ? (
          <div className="mt-3.5 flex flex-col gap-2.5">
            {data.items.map((item, i) => (
              <CollectionItemRow
                key={item.itemId}
                item={item}
                index={i + 1}
                curator={data.curatorNickname}
              />
            ))}
          </div>
        ) : (
          <div className="mt-3.5">
            <EmptyState
              variant="note"
              title="아직 담긴 작품이 없어요"
              description={
                data.owner
                  ? "편집에서 작품을 담아 컬렉션을 채워보세요."
                  : "큐레이터가 작품을 담으면 여기에 보여요."
              }
            />
          </div>
        )}
      </Shell>

      {/* <lg 하단 고정 좋아요 액션 바 (work-detail 액션 바 문법) */}
      <div
        style={{ paddingBottom: "max(14px, env(safe-area-inset-bottom))" }}
        className="fixed inset-x-0 bottom-0 z-40 flex items-center gap-2.5 border-t border-line bg-surface/95 px-4 pt-2.5 backdrop-blur-md lg:hidden"
      >
        <button
          type="button"
          onClick={handleLike}
          aria-pressed={liked}
          disabled={toggleLike.isPending}
          className="flex h-12 flex-1 items-center justify-center gap-[7px] rounded-full bg-accent-ink text-[14.5px] font-bold text-surface transition-opacity active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Heart size={17} weight={liked ? "fill" : "regular"} />
          좋아요 {data.likeCount.toLocaleString()}
        </button>
      </div>

      {/* 공유 토스트 (목업 .toast) - <lg는 액션 바 위로 띄운다 */}
      {toast && (
        <div
          role="status"
          className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex justify-center lg:bottom-8"
        >
          <span className="rounded-full bg-ink px-[18px] py-2.5 text-[13.5px] font-semibold text-surface shadow-lift">
            {toast}
          </span>
        </div>
      )}

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
